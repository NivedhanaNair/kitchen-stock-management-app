export interface Location {
  id: string;
  name: string;
  is_active: boolean;
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

export interface StockEntry {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  unit: string;
  counted_at: string;
  stock_take_session_id: string | null;
}

export interface StockTakeSession {
  id: string;
  /** Null when the session spans all locations rather than being scoped to one. */
  location_id: string | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

/** Latest known quantity for an item at a location. reorder_threshold is null when no threshold has been set for that pair. */
export interface StockLevel {
  item_id: string;
  location_id: string;
  quantity: number;
  reorder_threshold: number | null;
  last_counted_at: string | null;
}
