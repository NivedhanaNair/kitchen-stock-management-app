export interface Location {
  id: string;
  name: string;
  is_active: boolean;
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
  default_reorder_threshold: number;
}

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
  location_id: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

/** Latest known quantity for an item at a location, plus the effective reorder threshold. */
export interface StockLevel {
  item_id: string;
  location_id: string;
  quantity: number;
  reorder_threshold: number;
  last_counted_at: string | null;
}
