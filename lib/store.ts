import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  categories,
  households,
  itemLocationThresholds,
  items,
  locations,
  stockEntries,
  stockTakeSessions,
  users,
} from "@/lib/schema";
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS, DEFAULT_LOCATIONS } from "@/lib/constants";
import type {
  Category,
  Household,
  Item,
  ItemLocation,
  ItemStockStatus,
  Location,
  StockEntry,
  StockLevel,
  StockTakeSession,
  User,
} from "@/types";

/** Drops undefined-valued keys so a partial update only touches fields the caller actually provided. */
function definedFields<T extends object>(input: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in input) {
    if (input[key] !== undefined) result[key] = input[key];
  }
  return result;
}

// Drizzle's `mode: "string"` timestamp columns round-trip Postgres's native text format
// (e.g. "2026-07-19 00:59:48.13+00"), not JSON-safe ISO 8601 — normalize on the way out.
function toIso(value: string): string;
function toIso(value: string | null): string | null;
function toIso(value: string | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

function mapLocation(row: Location): Location {
  return { ...row, created_at: toIso(row.created_at) };
}

function mapItem(row: Item): Item {
  return { ...row, created_at: toIso(row.created_at), updated_at: toIso(row.updated_at) };
}

function mapItemLocation(row: ItemLocation): ItemLocation {
  return { ...row, created_at: toIso(row.created_at), updated_at: toIso(row.updated_at) };
}

function mapSession(row: StockTakeSession): StockTakeSession {
  return { ...row, started_at: toIso(row.started_at), completed_at: toIso(row.completed_at) };
}

function mapStockEntry(row: StockEntry): StockEntry {
  return { ...row, counted_at: toIso(row.counted_at) };
}

// ---------------------------------------------------------------------------
// Households — one shared password per family. No per-person accounts; "users" below are
// just names for attribution, all unlocked by the same household password.
// ---------------------------------------------------------------------------

/** Linear-scans households and bcrypt-compares — fine for the small number of households
 *  a personal app like this will ever have; passwords are salted so they can't be looked
 *  up by an indexed equality match. */
export async function getHouseholdByPassword(password: string): Promise<Household | undefined> {
  const allHouseholds = await db.select().from(households);
  for (const household of allHouseholds) {
    if (await bcrypt.compare(password, household.password_hash)) {
      return { id: household.id, created_at: toIso(household.created_at) };
    }
  }
  return undefined;
}

export async function createHousehold(password: string): Promise<Household> {
  const password_hash = await bcrypt.hash(password, 12);
  const [household] = await db.insert(households).values({ password_hash }).returning();
  return { id: household.id, created_at: toIso(household.created_at) };
}

/** Seeds a brand new household with the starter catalog (locations, categories, items) but
 *  no stock counts — the family starts fresh and only sees stock from what they count from here on. */
export async function seedHouseholdCatalog(householdId: string): Promise<void> {
  await db.insert(locations).values(DEFAULT_LOCATIONS.map((name) => ({ household_id: householdId, name })));
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((name) => ({ household_id: householdId, name })));
  await db.insert(items).values(DEFAULT_ITEMS.map((item) => ({ household_id: householdId, ...item })));
}

// ---------------------------------------------------------------------------
// Users — just a display name within a household, used for login identity and attribution.
// ---------------------------------------------------------------------------

export async function getUser(id: string): Promise<User | undefined> {
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, id));
  return user;
}

/** Only the caller's own household's members — never leaks another family's names. */
export async function listUsers(householdId: string): Promise<User[]> {
  return db.select({ id: users.id, name: users.name }).from(users).where(eq(users.household_id, householdId));
}

/** Returns the existing member with this name if there is one (so "Mom" logging in from a
 *  new device resolves to the same identity), otherwise creates it. */
export async function findOrCreateUser(householdId: string, name: string): Promise<User> {
  const [existing] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.household_id, householdId), eq(users.name, name)));
  if (existing) return existing;

  const [inserted] = await db
    .insert(users)
    .values({ household_id: householdId, name })
    .onConflictDoNothing()
    .returning({ id: users.id, name: users.name });
  if (inserted) return inserted;

  // Lost a race with a concurrent request creating the same name — fetch what it created.
  const [row] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.household_id, householdId), eq(users.name, name)));
  return row;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function listLocations(householdId: string): Promise<Location[]> {
  const rows = await db.select().from(locations).where(eq(locations.household_id, householdId));
  return rows.map(mapLocation);
}

export async function getLocation(id: string, householdId: string): Promise<Location | undefined> {
  const [location] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.household_id, householdId)));
  return location && mapLocation(location);
}

export async function createLocation(
  householdId: string,
  input: { name: string; is_active?: boolean }
): Promise<Location> {
  const [location] = await db
    .insert(locations)
    .values({ household_id: householdId, name: input.name, is_active: input.is_active ?? true })
    .returning();
  return mapLocation(location);
}

export async function updateLocation(
  id: string,
  householdId: string,
  input: Partial<Pick<Location, "name" | "is_active">>
): Promise<Location | undefined> {
  const fields = definedFields(input);
  if (Object.keys(fields).length === 0) return getLocation(id, householdId);
  const [location] = await db
    .update(locations)
    .set(fields)
    .where(and(eq(locations.id, id), eq(locations.household_id, householdId)))
    .returning();
  return location && mapLocation(location);
}

export async function deleteLocation(id: string, householdId: string): Promise<boolean> {
  const deleted = await db
    .delete(locations)
    .where(and(eq(locations.id, id), eq(locations.household_id, householdId)))
    .returning({ id: locations.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(householdId: string): Promise<Category[]> {
  return db.select().from(categories).where(eq(categories.household_id, householdId));
}

export async function createCategory(householdId: string, name: string): Promise<Category> {
  const [category] = await db.insert(categories).values({ household_id: householdId, name }).returning();
  return category;
}

export async function deleteCategory(id: string, householdId: string): Promise<boolean> {
  const deleted = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.household_id, householdId)))
    .returning({ id: categories.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItems(householdId: string): Promise<Item[]> {
  const rows = await db.select().from(items).where(eq(items.household_id, householdId));
  return rows.map(mapItem);
}

export async function getItem(id: string, householdId: string): Promise<Item | undefined> {
  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.household_id, householdId)));
  return item && mapItem(item);
}

export async function createItem(
  householdId: string,
  input: {
    name: string;
    category: string;
    unit: string;
    preferred_brand?: string | null;
    notes?: string | null;
    is_active?: boolean;
    default_reorder_threshold?: number | null;
  }
): Promise<Item> {
  const [item] = await db
    .insert(items)
    .values({
      household_id: householdId,
      name: input.name,
      category: input.category,
      unit: input.unit,
      preferred_brand: input.preferred_brand ?? null,
      notes: input.notes ?? null,
      is_active: input.is_active ?? true,
      default_reorder_threshold: input.default_reorder_threshold ?? null,
    })
    .returning();
  return mapItem(item);
}

export async function updateItem(
  id: string,
  householdId: string,
  input: Partial<
    Pick<
      Item,
      "name" | "category" | "unit" | "preferred_brand" | "notes" | "is_active" | "default_reorder_threshold"
    >
  >
): Promise<Item | undefined> {
  const fields = definedFields(input);
  const [item] = await db
    .update(items)
    .set({ ...fields, updated_at: sql`now()` })
    .where(and(eq(items.id, id), eq(items.household_id, householdId)))
    .returning();
  return item && mapItem(item);
}

/** Removes the item; its thresholds and stock history cascade-delete at the DB level. */
export async function deleteItem(id: string, householdId: string): Promise<boolean> {
  const deleted = await db
    .delete(items)
    .where(and(eq(items.id, id), eq(items.household_id, householdId)))
    .returning({ id: items.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Item-Location mappings (per-location reorder thresholds)
// ---------------------------------------------------------------------------

export async function listItemLocations(householdId: string): Promise<ItemLocation[]> {
  const rows = await db
    .select()
    .from(itemLocationThresholds)
    .where(eq(itemLocationThresholds.household_id, householdId));
  return rows.map(mapItemLocation);
}

export async function getItemLocation(
  householdId: string,
  itemId: string,
  locationId: string
): Promise<ItemLocation | undefined> {
  const [row] = await db
    .select()
    .from(itemLocationThresholds)
    .where(
      and(
        eq(itemLocationThresholds.household_id, householdId),
        eq(itemLocationThresholds.item_id, itemId),
        eq(itemLocationThresholds.location_id, locationId)
      )
    );
  return row && mapItemLocation(row);
}

/** Creates the mapping if absent, otherwise updates its reorder threshold. */
export async function upsertItemLocation(
  householdId: string,
  input: { item_id: string; location_id: string; reorder_threshold: number }
): Promise<ItemLocation> {
  const [row] = await db
    .insert(itemLocationThresholds)
    .values({
      household_id: householdId,
      item_id: input.item_id,
      location_id: input.location_id,
      reorder_threshold: input.reorder_threshold,
    })
    .onConflictDoUpdate({
      target: [itemLocationThresholds.item_id, itemLocationThresholds.location_id],
      set: { reorder_threshold: input.reorder_threshold, updated_at: sql`now()` },
    })
    .returning();
  return mapItemLocation(row);
}

/** Unsets the threshold for an item/location pair (it simply won't be tracked for alerts). */
export async function deleteItemLocation(
  householdId: string,
  itemId: string,
  locationId: string
): Promise<boolean> {
  const deleted = await db
    .delete(itemLocationThresholds)
    .where(
      and(
        eq(itemLocationThresholds.household_id, householdId),
        eq(itemLocationThresholds.item_id, itemId),
        eq(itemLocationThresholds.location_id, locationId)
      )
    )
    .returning({ id: itemLocationThresholds.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Stock entries
// ---------------------------------------------------------------------------

export async function listStockEntries(householdId: string): Promise<StockEntry[]> {
  const rows = await db.select().from(stockEntries).where(eq(stockEntries.household_id, householdId));
  return rows.map(mapStockEntry);
}

export async function listStockEntriesBySession(
  householdId: string,
  sessionId: string
): Promise<StockEntry[]> {
  const rows = await db
    .select()
    .from(stockEntries)
    .where(
      and(eq(stockEntries.household_id, householdId), eq(stockEntries.stock_take_session_id, sessionId))
    );
  return rows.map(mapStockEntry);
}

export async function createStockEntry(
  householdId: string,
  input: {
    item_id: string;
    location_id: string;
    quantity: number;
    unit: string;
    counted_at?: string;
    stock_take_session_id?: string | null;
    created_by?: string | null;
  }
): Promise<StockEntry> {
  const [entry] = await db
    .insert(stockEntries)
    .values({
      household_id: householdId,
      item_id: input.item_id,
      location_id: input.location_id,
      quantity: input.quantity,
      unit: input.unit,
      counted_at: input.counted_at ?? undefined,
      stock_take_session_id: input.stock_take_session_id ?? null,
      created_by: input.created_by ?? null,
    })
    .returning();
  return mapStockEntry(entry);
}

// ---------------------------------------------------------------------------
// Stock take sessions
// ---------------------------------------------------------------------------

export async function listSessions(householdId: string): Promise<StockTakeSession[]> {
  const rows = await db
    .select()
    .from(stockTakeSessions)
    .where(eq(stockTakeSessions.household_id, householdId));
  return rows.map(mapSession);
}

export async function getSession(id: string, householdId: string): Promise<StockTakeSession | undefined> {
  const [session] = await db
    .select()
    .from(stockTakeSessions)
    .where(and(eq(stockTakeSessions.id, id), eq(stockTakeSessions.household_id, householdId)));
  return session && mapSession(session);
}

/** location_id null means the session sweeps all locations rather than one. */
export async function createSession(
  householdId: string,
  input: { location_id?: string | null; notes?: string | null; created_by?: string | null }
): Promise<StockTakeSession> {
  const [session] = await db
    .insert(stockTakeSessions)
    .values({
      household_id: householdId,
      location_id: input.location_id ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .returning();
  return mapSession(session);
}

export async function updateSession(
  id: string,
  householdId: string,
  input: Partial<Pick<StockTakeSession, "notes" | "completed_at">>
): Promise<StockTakeSession | undefined> {
  const fields = definedFields(input);
  if (Object.keys(fields).length === 0) return getSession(id, householdId);
  const [session] = await db
    .update(stockTakeSessions)
    .set(fields)
    .where(and(eq(stockTakeSessions.id, id), eq(stockTakeSessions.household_id, householdId)))
    .returning();
  return session && mapSession(session);
}

export async function completeSession(
  id: string,
  householdId: string
): Promise<StockTakeSession | undefined> {
  const [session] = await db
    .update(stockTakeSessions)
    .set({ completed_at: sql`now()` })
    .where(and(eq(stockTakeSessions.id, id), eq(stockTakeSessions.household_id, householdId)))
    .returning();
  return session && mapSession(session);
}

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

/** Latest stock quantity per item/location, with the effective reorder threshold (null if unset). */
export async function computeStockLevels(householdId: string): Promise<StockLevel[]> {
  const result = await db.execute<{
    item_id: string;
    location_id: string;
    quantity: number;
    last_counted_at: string;
    reorder_threshold: number | null;
  }>(sql`
    select distinct on (se.item_id, se.location_id)
      se.item_id as item_id,
      se.location_id as location_id,
      se.quantity::float8 as quantity,
      to_json(se.counted_at) #>> '{}' as last_counted_at,
      ilt.reorder_threshold::float8 as reorder_threshold
    from stock_entries se
    left join item_location_thresholds ilt
      on ilt.item_id = se.item_id and ilt.location_id = se.location_id
    where se.household_id = ${householdId}
    order by se.item_id, se.location_id, se.counted_at desc
  `);
  return result.rows;
}

/**
 * Per-item stock status. By default (no per-location thresholds set for an item) checks
 * TOTAL stock across all locations against the item's default_reorder_threshold — one
 * item, one validation. If any per-location thresholds are set for an item, that item is
 * checked per-location instead (the opt-in advanced mode).
 */
export async function computeItemStockStatuses(householdId: string): Promise<ItemStockStatus[]> {
  const [allItems, levels] = await Promise.all([listItems(householdId), computeStockLevels(householdId)]);

  return allItems.map((item) => {
    const perLocationLevels = levels.filter((l) => l.item_id === item.id);
    const hasPerLocationThresholds = perLocationLevels.some((l) => l.reorder_threshold !== null);
    const totalQuantity = perLocationLevels.reduce((sum, l) => sum + l.quantity, 0);

    if (hasPerLocationThresholds) {
      return {
        item_id: item.id,
        mode: "per_location" as const,
        total_quantity: totalQuantity,
        threshold: null,
        is_low: perLocationLevels.some((l) => l.reorder_threshold !== null && l.quantity <= l.reorder_threshold),
        per_location: perLocationLevels,
      };
    }

    const threshold = item.default_reorder_threshold;
    return {
      item_id: item.id,
      mode: "total" as const,
      total_quantity: totalQuantity,
      threshold,
      is_low: threshold !== null && totalQuantity <= threshold,
      per_location: perLocationLevels,
    };
  });
}
