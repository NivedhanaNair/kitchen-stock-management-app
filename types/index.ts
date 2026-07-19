export interface Location {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  unit: string;
  preferred_brand: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /**
   * Default reorder threshold checked against TOTAL stock summed across all locations.
   * This is the default validation (one item, one threshold). Per-location thresholds
   * (ItemLocation) are an optional override — when any exist for an item, they take
   * precedence over this default and the item is checked per-location instead.
   */
  default_reorder_threshold: number | null;
}

/** Reorder threshold for one item at one location. No row = no threshold set for that pair. */
export interface ItemLocation {
  id: string;
  item_id: string;
  location_id: string;
  reorder_threshold: number;
  created_at: string;
  updated_at: string;
}

/** A family member account. Everyone shares the same household data — this is only for
 *  login identity and attributing who logged which stock count. */
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface StockEntry {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  unit: string;
  counted_at: string;
  stock_take_session_id: string | null;
  created_by: string | null;
}

export interface StockTakeSession {
  id: string;
  /** Null when the session spans all locations rather than being scoped to one. */
  location_id: string | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_by: string | null;
}

/** Latest known quantity for an item at a location. reorder_threshold is null when no threshold has been set for that pair. */
export interface StockLevel {
  item_id: string;
  location_id: string;
  quantity: number;
  reorder_threshold: number | null;
  last_counted_at: string | null;
}

/**
 * Whether an item is low on stock, computed one of two ways:
 * - "per_location": the item has one or more ItemLocation thresholds set, so each
 *   location is checked individually (per_location holds those raw StockLevel rows).
 * - "total": the default behavior — total_quantity (summed across every location the
 *   item has been counted at) is checked against the item's default_reorder_threshold.
 */
export interface ItemStockStatus {
  item_id: string;
  mode: "per_location" | "total";
  total_quantity: number;
  threshold: number | null;
  is_low: boolean;
  per_location: StockLevel[];
}