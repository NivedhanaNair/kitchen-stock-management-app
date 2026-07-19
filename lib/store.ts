import type {
  Category,
  Item,
  ItemLocation,
  Location,
  StockEntry,
  StockLevel,
  StockTakeSession,
} from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

interface Db {
  locations: Location[];
  categories: Category[];
  items: Item[];
  itemLocations: ItemLocation[];
  stockEntries: StockEntry[];
  sessions: StockTakeSession[];
}

// Next.js dev mode reloads route modules on every request, which would wipe a
// plain module-level array. Stashing the store on `globalThis` keeps Phase 1
// data alive across hot reloads for the life of the server process.
const globalForStore = globalThis as unknown as { __stockStore?: Db };

function makeItem(
  now: string,
  fields: Pick<Item, "name" | "category" | "unit"> &
    Partial<Pick<Item, "preferred_brand" | "notes">>
): Item {
  return {
    id: crypto.randomUUID(),
    name: fields.name,
    category: fields.category,
    unit: fields.unit,
    preferred_brand: fields.preferred_brand ?? null,
    notes: fields.notes ?? null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function seed(): Db {
  const now = new Date().toISOString();

  const locations: Location[] = ["Kitchen", "Store Room", "Fridge", "Bathroom"].map((name) => ({
    id: crypto.randomUUID(),
    name,
    is_active: true,
  }));
  const [kitchen, storeRoom, fridge, bathroom] = locations;

  const categories: Category[] = DEFAULT_CATEGORIES.map((name) => ({
    id: crypto.randomUUID(),
    name,
  }));
  const byCategory = (name: string) => name;

  const items: Item[] = [
    makeItem(now, { name: "Rice", category: byCategory("Grains & Staples"), unit: "kg" }),
    makeItem(now, { name: "Wheat Flour (Atta)", category: "Grains & Staples", unit: "kg" }),
    makeItem(now, { name: "Toor Dal", category: "Pulses & Lentils (Dal)", unit: "kg" }),
    makeItem(now, { name: "Moong Dal", category: "Pulses & Lentils (Dal)", unit: "kg" }),
    makeItem(now, { name: "Turmeric Powder", category: "Spices & Masalas", unit: "g" }),
    makeItem(now, { name: "Red Chilli Powder", category: "Spices & Masalas", unit: "g" }),
    makeItem(now, { name: "Cooking Oil", category: "Cooking Essentials", unit: "litre" }),
    makeItem(now, { name: "Ghee", category: "Cooking Essentials", unit: "g" }),
    makeItem(now, { name: "Onion", category: "Vegetables & Fruits", unit: "kg" }),
    makeItem(now, { name: "Potato", category: "Vegetables & Fruits", unit: "kg" }),
    makeItem(now, { name: "Milk", category: "Dairy", unit: "litre" }),
    makeItem(now, { name: "Curd", category: "Dairy", unit: "packet" }),
    makeItem(now, { name: "Biscuits", category: "Snacks & Ready-to-eat", unit: "packet" }),
    makeItem(now, { name: "Namkeen", category: "Snacks & Ready-to-eat", unit: "packet" }),
    makeItem(now, { name: "Toothpaste", category: "Bathroom / Personal Care", unit: "pcs" }),
    makeItem(now, { name: "Shampoo", category: "Bathroom / Personal Care", unit: "bottle" }),
    makeItem(now, { name: "Dishwash Liquid", category: "Cleaning Supplies", unit: "bottle" }),
    makeItem(now, { name: "Detergent", category: "Cleaning Supplies", unit: "kg" }),
    makeItem(now, { name: "Diapers", category: "Baby/Child", unit: "packet" }),
    makeItem(now, { name: "Baby Wipes", category: "Baby/Child", unit: "packet" }),
    makeItem(now, { name: "LPG Cylinder", category: "Kitchen Consumables", unit: "pcs" }),
    makeItem(now, { name: "Tissue Paper", category: "Kitchen Consumables", unit: "box" }),
    makeItem(now, { name: "Agarbatti (Incense)", category: "Puja/Religious", unit: "packet" }),
    makeItem(now, { name: "Camphor", category: "Puja/Religious", unit: "packet" }),
    makeItem(now, { name: "Paracetamol", category: "Medicines/First Aid", unit: "box" }),
    makeItem(now, { name: "Band-aids", category: "Medicines/First Aid", unit: "box" }),
  ];

  const byName = (name: string) => items.find((i) => i.name === name)!;

  const itemLocations: ItemLocation[] = [
    {
      id: crypto.randomUUID(),
      item_id: byName("Rice").id,
      location_id: storeRoom.id,
      reorder_threshold: 5,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Toor Dal").id,
      location_id: kitchen.id,
      reorder_threshold: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Onion").id,
      location_id: kitchen.id,
      reorder_threshold: 2,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Milk").id,
      location_id: fridge.id,
      reorder_threshold: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Toothpaste").id,
      location_id: bathroom.id,
      reorder_threshold: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  const stockEntries: StockEntry[] = [
    {
      id: crypto.randomUUID(),
      item_id: byName("Rice").id,
      location_id: storeRoom.id,
      quantity: 2,
      unit: "kg",
      counted_at: now,
      stock_take_session_id: null,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Toor Dal").id,
      location_id: kitchen.id,
      quantity: 0.5,
      unit: "kg",
      counted_at: now,
      stock_take_session_id: null,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Onion").id,
      location_id: kitchen.id,
      quantity: 1,
      unit: "kg",
      counted_at: now,
      stock_take_session_id: null,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Milk").id,
      location_id: fridge.id,
      quantity: 2,
      unit: "litre",
      counted_at: now,
      stock_take_session_id: null,
    },
    {
      id: crypto.randomUUID(),
      item_id: byName("Toothpaste").id,
      location_id: bathroom.id,
      quantity: 1,
      unit: "pcs",
      counted_at: now,
      stock_take_session_id: null,
    },
  ];

  return {
    locations,
    categories,
    items,
    itemLocations,
    stockEntries,
    sessions: [],
  };
}

const db: Db = globalForStore.__stockStore ?? seed();
globalForStore.__stockStore = db;

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export function listLocations(): Location[] {
  return db.locations;
}

export function getLocation(id: string): Location | undefined {
  return db.locations.find((l) => l.id === id);
}

export function createLocation(input: { name: string; is_active?: boolean }): Location {
  const location: Location = {
    id: crypto.randomUUID(),
    name: input.name,
    is_active: input.is_active ?? true,
  };
  db.locations.push(location);
  return location;
}

export function updateLocation(
  id: string,
  input: Partial<Pick<Location, "name" | "is_active">>
): Location | undefined {
  const location = getLocation(id);
  if (!location) return undefined;
  if (input.name !== undefined) location.name = input.name;
  if (input.is_active !== undefined) location.is_active = input.is_active;
  return location;
}

export function deleteLocation(id: string): boolean {
  const index = db.locations.findIndex((l) => l.id === id);
  if (index === -1) return false;
  db.locations.splice(index, 1);
  return true;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function listCategories(): Category[] {
  return db.categories;
}

export function createCategory(name: string): Category {
  const category: Category = { id: crypto.randomUUID(), name };
  db.categories.push(category);
  return category;
}

export function deleteCategory(id: string): boolean {
  const index = db.categories.findIndex((c) => c.id === id);
  if (index === -1) return false;
  db.categories.splice(index, 1);
  return true;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export function listItems(): Item[] {
  return db.items;
}

export function getItem(id: string): Item | undefined {
  return db.items.find((i) => i.id === id);
}

export function createItem(input: {
  name: string;
  category: string;
  unit: string;
  preferred_brand?: string | null;
  notes?: string | null;
  is_active?: boolean;
}): Item {
  const timestamp = nowIso();
  const item: Item = {
    id: crypto.randomUUID(),
    name: input.name,
    category: input.category,
    unit: input.unit,
    preferred_brand: input.preferred_brand ?? null,
    notes: input.notes ?? null,
    is_active: input.is_active ?? true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  db.items.push(item);
  return item;
}

export function updateItem(
  id: string,
  input: Partial<
    Pick<Item, "name" | "category" | "unit" | "preferred_brand" | "notes" | "is_active">
  >
): Item | undefined {
  const item = getItem(id);
  if (!item) return undefined;
  Object.assign(item, input, { updated_at: nowIso() });
  return item;
}

/** Removes the item along with its per-location thresholds and stock history. */
export function deleteItem(id: string): boolean {
  const index = db.items.findIndex((i) => i.id === id);
  if (index === -1) return false;
  db.items.splice(index, 1);
  db.itemLocations = db.itemLocations.filter((il) => il.item_id !== id);
  db.stockEntries = db.stockEntries.filter((e) => e.item_id !== id);
  return true;
}

// ---------------------------------------------------------------------------
// Item-Location mappings (per-location reorder thresholds)
// ---------------------------------------------------------------------------

export function listItemLocations(): ItemLocation[] {
  return db.itemLocations;
}

export function getItemLocation(itemId: string, locationId: string): ItemLocation | undefined {
  return db.itemLocations.find((il) => il.item_id === itemId && il.location_id === locationId);
}

/** Creates the mapping if absent, otherwise updates its reorder threshold. */
export function upsertItemLocation(input: {
  item_id: string;
  location_id: string;
  reorder_threshold: number;
}): ItemLocation {
  const existing = getItemLocation(input.item_id, input.location_id);
  if (existing) {
    existing.reorder_threshold = input.reorder_threshold;
    existing.updated_at = nowIso();
    return existing;
  }
  const timestamp = nowIso();
  const itemLocation: ItemLocation = {
    id: crypto.randomUUID(),
    item_id: input.item_id,
    location_id: input.location_id,
    reorder_threshold: input.reorder_threshold,
    created_at: timestamp,
    updated_at: timestamp,
  };
  db.itemLocations.push(itemLocation);
  return itemLocation;
}

/** Unsets the threshold for an item/location pair (it simply won't be tracked for alerts). */
export function deleteItemLocation(itemId: string, locationId: string): boolean {
  const index = db.itemLocations.findIndex(
    (il) => il.item_id === itemId && il.location_id === locationId
  );
  if (index === -1) return false;
  db.itemLocations.splice(index, 1);
  return true;
}

// ---------------------------------------------------------------------------
// Stock entries
// ---------------------------------------------------------------------------

export function listStockEntries(): StockEntry[] {
  return db.stockEntries;
}

export function listStockEntriesBySession(sessionId: string): StockEntry[] {
  return db.stockEntries.filter((e) => e.stock_take_session_id === sessionId);
}

export function createStockEntry(input: {
  item_id: string;
  location_id: string;
  quantity: number;
  unit: string;
  counted_at?: string;
  stock_take_session_id?: string | null;
}): StockEntry {
  const entry: StockEntry = {
    id: crypto.randomUUID(),
    item_id: input.item_id,
    location_id: input.location_id,
    quantity: input.quantity,
    unit: input.unit,
    counted_at: input.counted_at ?? nowIso(),
    stock_take_session_id: input.stock_take_session_id ?? null,
  };
  db.stockEntries.push(entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Stock take sessions
// ---------------------------------------------------------------------------

export function listSessions(): StockTakeSession[] {
  return db.sessions;
}

export function getSession(id: string): StockTakeSession | undefined {
  return db.sessions.find((s) => s.id === id);
}

/** location_id null means the session sweeps all active locations rather than one. */
export function createSession(input: {
  location_id?: string | null;
  notes?: string | null;
}): StockTakeSession {
  const session: StockTakeSession = {
    id: crypto.randomUUID(),
    location_id: input.location_id ?? null,
    started_at: nowIso(),
    completed_at: null,
    notes: input.notes ?? null,
  };
  db.sessions.push(session);
  return session;
}

export function updateSession(
  id: string,
  input: Partial<Pick<StockTakeSession, "notes" | "completed_at">>
): StockTakeSession | undefined {
  const session = getSession(id);
  if (!session) return undefined;
  if (input.notes !== undefined) session.notes = input.notes;
  if (input.completed_at !== undefined) session.completed_at = input.completed_at;
  return session;
}

export function completeSession(id: string): StockTakeSession | undefined {
  return updateSession(id, { completed_at: nowIso() });
}

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

/** Latest stock quantity per item/location. reorder_threshold is null where no threshold has been set. */
export function computeStockLevels(): StockLevel[] {
  const latestByKey = new Map<string, StockEntry>();

  for (const entry of db.stockEntries) {
    const key = `${entry.item_id}::${entry.location_id}`;
    const current = latestByKey.get(key);
    if (!current || new Date(entry.counted_at) > new Date(current.counted_at)) {
      latestByKey.set(key, entry);
    }
  }

  const levels: StockLevel[] = [];
  for (const [key, entry] of latestByKey) {
    const [item_id, location_id] = key.split("::");
    const override = getItemLocation(item_id, location_id);
    levels.push({
      item_id,
      location_id,
      quantity: entry.quantity,
      reorder_threshold: override?.reorder_threshold ?? null,
      last_counted_at: entry.counted_at,
    });
  }
  return levels;
}

/** Stock levels at or below their reorder threshold. Pairs with no threshold set are never alerts. */
export function computeAlerts(): StockLevel[] {
  return computeStockLevels().filter(
    (level) => level.reorder_threshold !== null && level.quantity <= level.reorder_threshold
  );
}

/** Most recent completed-session timestamp per location (sessions scoped to "all locations" count for every active location). */
export function computeLastStockTakeByLocation(): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const location of db.locations) {
    const relevant = db.sessions.filter(
      (s) => s.completed_at && (s.location_id === location.id || s.location_id === null)
    );
    const latest = relevant.reduce<string | undefined>((acc, s) => {
      if (!s.completed_at) return acc;
      return !acc || new Date(s.completed_at) > new Date(acc) ? s.completed_at : acc;
    }, undefined);
    result[location.id] = latest;
  }
  return result;
}
