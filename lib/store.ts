import type {
  Item,
  ItemLocation,
  Location,
  StockEntry,
  StockLevel,
  StockTakeSession,
} from "@/types";

interface Db {
  locations: Location[];
  items: Item[];
  itemLocations: ItemLocation[];
  stockEntries: StockEntry[];
  sessions: StockTakeSession[];
}

// Next.js dev mode reloads route modules on every request, which would wipe a
// plain module-level array. Stashing the store on `globalThis` keeps Phase 1
// data alive across hot reloads for the life of the server process.
const globalForStore = globalThis as unknown as { __stockStore?: Db };

function seed(): Db {
  const now = new Date().toISOString();

  const locations: Location[] = [
    { id: crypto.randomUUID(), name: "Main Kitchen", is_active: true },
    { id: crypto.randomUUID(), name: "Dry Storage", is_active: true },
  ];

  const items: Item[] = [
    {
      id: crypto.randomUUID(),
      name: "Basmati Rice",
      category: "Grains",
      unit: "kg",
      preferred_brand: "India Gate",
      notes: null,
      is_active: true,
      created_at: now,
      updated_at: now,
      default_reorder_threshold: 10,
    },
    {
      id: crypto.randomUUID(),
      name: "Olive Oil",
      category: "Oils",
      unit: "L",
      preferred_brand: null,
      notes: "Extra virgin only",
      is_active: true,
      created_at: now,
      updated_at: now,
      default_reorder_threshold: 5,
    },
  ];

  return {
    locations,
    items,
    itemLocations: [],
    stockEntries: [],
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
  default_reorder_threshold: number;
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
    default_reorder_threshold: input.default_reorder_threshold,
  };
  db.items.push(item);
  return item;
}

export function updateItem(
  id: string,
  input: Partial<
    Pick<
      Item,
      | "name"
      | "category"
      | "unit"
      | "preferred_brand"
      | "notes"
      | "is_active"
      | "default_reorder_threshold"
    >
  >
): Item | undefined {
  const item = getItem(id);
  if (!item) return undefined;
  Object.assign(item, input, { updated_at: nowIso() });
  return item;
}

// ---------------------------------------------------------------------------
// Item-Location mappings (per-location reorder threshold overrides)
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

export function createSession(input: { location_id: string; notes?: string | null }): StockTakeSession {
  const session: StockTakeSession = {
    id: crypto.randomUUID(),
    location_id: input.location_id,
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

/** Latest stock quantity per item/location, with the effective reorder threshold. */
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
    const item = getItem(item_id);
    const threshold = override?.reorder_threshold ?? item?.default_reorder_threshold ?? 0;
    levels.push({
      item_id,
      location_id,
      quantity: entry.quantity,
      reorder_threshold: threshold,
      last_counted_at: entry.counted_at,
    });
  }
  return levels;
}

/** Stock levels currently at or below their effective reorder threshold. */
export function computeAlerts(): StockLevel[] {
  return computeStockLevels().filter((level) => level.quantity <= level.reorder_threshold);
}
