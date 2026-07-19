import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  itemLocationThresholds,
  items,
  locations,
  stockEntries,
  stockTakeSessions,
  users,
} from "@/lib/schema";
import type {
  Category,
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
// Users (family accounts — shared household data, used for login + attribution)
// ---------------------------------------------------------------------------

/** Includes password_hash — for server-side auth checks only, never return this to a client. */
export async function getUserByEmailWithPassword(
  email: string
): Promise<(User & { password_hash: string }) | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user;
}

export async function getUser(id: string): Promise<User | undefined> {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, id));
  return user;
}

export async function listUsers(): Promise<User[]> {
  return db.select({ id: users.id, name: users.name, email: users.email }).from(users);
}

export async function createUser(input: {
  name: string;
  email: string;
  password_hash: string;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email.toLowerCase(), password_hash: input.password_hash })
    .returning({ id: users.id, name: users.name, email: users.email });
  return user;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function listLocations(): Promise<Location[]> {
  const rows = await db.select().from(locations);
  return rows.map(mapLocation);
}

export async function getLocation(id: string): Promise<Location | undefined> {
  const [location] = await db.select().from(locations).where(eq(locations.id, id));
  return location && mapLocation(location);
}

export async function createLocation(input: { name: string; is_active?: boolean }): Promise<Location> {
  const [location] = await db
    .insert(locations)
    .values({ name: input.name, is_active: input.is_active ?? true })
    .returning();
  return mapLocation(location);
}

export async function updateLocation(
  id: string,
  input: Partial<Pick<Location, "name" | "is_active">>
): Promise<Location | undefined> {
  const fields = definedFields(input);
  if (Object.keys(fields).length === 0) return getLocation(id);
  const [location] = await db.update(locations).set(fields).where(eq(locations.id, id)).returning();
  return location && mapLocation(location);
}

export async function deleteLocation(id: string): Promise<boolean> {
  const deleted = await db.delete(locations).where(eq(locations.id, id)).returning({ id: locations.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  return db.select().from(categories);
}

export async function createCategory(name: string): Promise<Category> {
  const [category] = await db.insert(categories).values({ name }).returning();
  return category;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItems(): Promise<Item[]> {
  const rows = await db.select().from(items);
  return rows.map(mapItem);
}

export async function getItem(id: string): Promise<Item | undefined> {
  const [item] = await db.select().from(items).where(eq(items.id, id));
  return item && mapItem(item);
}

export async function createItem(input: {
  name: string;
  category: string;
  unit: string;
  preferred_brand?: string | null;
  notes?: string | null;
  is_active?: boolean;
  default_reorder_threshold?: number | null;
}): Promise<Item> {
  const [item] = await db
    .insert(items)
    .values({
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
    .where(eq(items.id, id))
    .returning();
  return item && mapItem(item);
}

/** Removes the item; its thresholds and stock history cascade-delete at the DB level. */
export async function deleteItem(id: string): Promise<boolean> {
  const deleted = await db.delete(items).where(eq(items.id, id)).returning({ id: items.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Item-Location mappings (per-location reorder thresholds)
// ---------------------------------------------------------------------------

export async function listItemLocations(): Promise<ItemLocation[]> {
  const rows = await db.select().from(itemLocationThresholds);
  return rows.map(mapItemLocation);
}

export async function getItemLocation(
  itemId: string,
  locationId: string
): Promise<ItemLocation | undefined> {
  const [row] = await db
    .select()
    .from(itemLocationThresholds)
    .where(
      and(eq(itemLocationThresholds.item_id, itemId), eq(itemLocationThresholds.location_id, locationId))
    );
  return row && mapItemLocation(row);
}

/** Creates the mapping if absent, otherwise updates its reorder threshold. */
export async function upsertItemLocation(input: {
  item_id: string;
  location_id: string;
  reorder_threshold: number;
}): Promise<ItemLocation> {
  const [row] = await db
    .insert(itemLocationThresholds)
    .values({
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
export async function deleteItemLocation(itemId: string, locationId: string): Promise<boolean> {
  const deleted = await db
    .delete(itemLocationThresholds)
    .where(
      and(eq(itemLocationThresholds.item_id, itemId), eq(itemLocationThresholds.location_id, locationId))
    )
    .returning({ id: itemLocationThresholds.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Stock entries
// ---------------------------------------------------------------------------

export async function listStockEntries(): Promise<StockEntry[]> {
  const rows = await db.select().from(stockEntries);
  return rows.map(mapStockEntry);
}

export async function listStockEntriesBySession(sessionId: string): Promise<StockEntry[]> {
  const rows = await db
    .select()
    .from(stockEntries)
    .where(eq(stockEntries.stock_take_session_id, sessionId));
  return rows.map(mapStockEntry);
}

export async function createStockEntry(input: {
  item_id: string;
  location_id: string;
  quantity: number;
  unit: string;
  counted_at?: string;
  stock_take_session_id?: string | null;
  created_by?: string | null;
}): Promise<StockEntry> {
  const [entry] = await db
    .insert(stockEntries)
    .values({
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

export async function listSessions(): Promise<StockTakeSession[]> {
  const rows = await db.select().from(stockTakeSessions);
  return rows.map(mapSession);
}

export async function getSession(id: string): Promise<StockTakeSession | undefined> {
  const [session] = await db.select().from(stockTakeSessions).where(eq(stockTakeSessions.id, id));
  return session && mapSession(session);
}

/** location_id null means the session sweeps all locations rather than one. */
export async function createSession(input: {
  location_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}): Promise<StockTakeSession> {
  const [session] = await db
    .insert(stockTakeSessions)
    .values({
      location_id: input.location_id ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .returning();
  return mapSession(session);
}

export async function updateSession(
  id: string,
  input: Partial<Pick<StockTakeSession, "notes" | "completed_at">>
): Promise<StockTakeSession | undefined> {
  const fields = definedFields(input);
  if (Object.keys(fields).length === 0) return getSession(id);
  const [session] = await db
    .update(stockTakeSessions)
    .set(fields)
    .where(eq(stockTakeSessions.id, id))
    .returning();
  return session && mapSession(session);
}

export async function completeSession(id: string): Promise<StockTakeSession | undefined> {
  const [session] = await db
    .update(stockTakeSessions)
    .set({ completed_at: sql`now()` })
    .where(eq(stockTakeSessions.id, id))
    .returning();
  return session && mapSession(session);
}

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

/** Latest stock quantity per item/location, with the effective reorder threshold (null if unset). */
export async function computeStockLevels(): Promise<StockLevel[]> {
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
export async function computeItemStockStatuses(): Promise<ItemStockStatus[]> {
  const [allItems, levels] = await Promise.all([listItems(), computeStockLevels()]);

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