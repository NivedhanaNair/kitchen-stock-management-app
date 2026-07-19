import { boolean, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Column keys are snake_case (not idiomatic Drizzle style) so query results match the
// existing API/frontend contract (types/index.ts) with no mapping layer in between.

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
  },
  (table) => [unique("categories_name_unique").on(table.name)]
);

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  preferred_brand: text("preferred_brand"),
  notes: text("notes"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const itemLocationThresholds = pgTable(
  "item_location_thresholds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    item_id: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    location_id: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    reorder_threshold: numeric("reorder_threshold", { mode: "number" }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [unique("item_location_unique").on(table.item_id, table.location_id)]
);

export const stockTakeSessions = pgTable("stock_take_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  location_id: uuid("location_id").references(() => locations.id),
  started_at: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  completed_at: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  notes: text("notes"),
});

export const stockEntries = pgTable("stock_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  item_id: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  location_id: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { mode: "number" }).notNull(),
  unit: text("unit").notNull(),
  counted_at: timestamp("counted_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  stock_take_session_id: uuid("stock_take_session_id").references(() => stockTakeSessions.id),
});
