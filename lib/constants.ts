/** Starter category taxonomy for Indian households (spec §6). Seeded once; fully user-editable after. */
export const DEFAULT_CATEGORIES = [
  "Grains & Staples",
  "Pulses & Lentils (Dal)",
  "Spices & Masalas",
  "Cooking Essentials",
  "Vegetables & Fruits",
  "Dairy",
  "Snacks & Ready-to-eat",
  "Bathroom / Personal Care",
  "Cleaning Supplies",
  "Baby/Child",
  "Kitchen Consumables",
  "Puja/Religious",
  "Medicines/First Aid",
];

/** Suggested units of measure (spec §4.2). The unit field stays free text so a custom value can still be entered. */
export const UNIT_OPTIONS = ["kg", "g", "litre", "ml", "pcs", "packet", "bottle", "box"];

/** Starter locations every new household gets seeded with. */
export const DEFAULT_LOCATIONS = ["Kitchen", "Store Room", "Fridge", "Bathroom"];

/** Starter item catalog (no stock counted yet) every new household gets seeded with. */
export const DEFAULT_ITEMS = [
  { name: "Rice", category: "Grains & Staples", unit: "kg" },
  { name: "Wheat Flour (Atta)", category: "Grains & Staples", unit: "kg" },
  { name: "Toor Dal", category: "Pulses & Lentils (Dal)", unit: "kg" },
  { name: "Moong Dal", category: "Pulses & Lentils (Dal)", unit: "kg" },
  { name: "Turmeric Powder", category: "Spices & Masalas", unit: "g" },
  { name: "Red Chilli Powder", category: "Spices & Masalas", unit: "g" },
  { name: "Cooking Oil", category: "Cooking Essentials", unit: "litre" },
  { name: "Ghee", category: "Cooking Essentials", unit: "g" },
  { name: "Onion", category: "Vegetables & Fruits", unit: "kg" },
  { name: "Potato", category: "Vegetables & Fruits", unit: "kg" },
  { name: "Milk", category: "Dairy", unit: "litre" },
  { name: "Curd", category: "Dairy", unit: "packet" },
  { name: "Biscuits", category: "Snacks & Ready-to-eat", unit: "packet" },
  { name: "Namkeen", category: "Snacks & Ready-to-eat", unit: "packet" },
  { name: "Toothpaste", category: "Bathroom / Personal Care", unit: "pcs" },
  { name: "Shampoo", category: "Bathroom / Personal Care", unit: "bottle" },
  { name: "Dishwash Liquid", category: "Cleaning Supplies", unit: "bottle" },
  { name: "Detergent", category: "Cleaning Supplies", unit: "kg" },
  { name: "Diapers", category: "Baby/Child", unit: "packet" },
  { name: "Baby Wipes", category: "Baby/Child", unit: "packet" },
  { name: "LPG Cylinder", category: "Kitchen Consumables", unit: "pcs" },
  { name: "Tissue Paper", category: "Kitchen Consumables", unit: "box" },
  { name: "Agarbatti (Incense)", category: "Puja/Religious", unit: "packet" },
  { name: "Camphor", category: "Puja/Religious", unit: "packet" },
  { name: "Paracetamol", category: "Medicines/First Aid", unit: "box" },
  { name: "Band-aids", category: "Medicines/First Aid", unit: "box" },
];
