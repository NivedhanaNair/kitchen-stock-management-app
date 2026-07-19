import { db } from "@/lib/db";
import { categories, itemLocationThresholds, items, locations, stockEntries } from "@/lib/schema";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

async function main() {
  const insertedLocations = await db
    .insert(locations)
    .values(["Kitchen", "Store Room", "Fridge", "Bathroom"].map((name) => ({ name })))
    .returning();
  const [kitchen, storeRoom, fridge, bathroom] = insertedLocations;

  await db.insert(categories).values(DEFAULT_CATEGORIES.map((name) => ({ name })));

  const insertedItems = await db
    .insert(items)
    .values([
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
    ])
    .returning();

  const byName = (name: string) => insertedItems.find((i) => i.name === name)!;

  await db.insert(itemLocationThresholds).values([
    { item_id: byName("Rice").id, location_id: storeRoom.id, reorder_threshold: 5 },
    { item_id: byName("Toor Dal").id, location_id: kitchen.id, reorder_threshold: 1 },
    { item_id: byName("Onion").id, location_id: kitchen.id, reorder_threshold: 2 },
    { item_id: byName("Milk").id, location_id: fridge.id, reorder_threshold: 1 },
    { item_id: byName("Toothpaste").id, location_id: bathroom.id, reorder_threshold: 1 },
  ]);

  await db.insert(stockEntries).values([
    { item_id: byName("Rice").id, location_id: storeRoom.id, quantity: 2, unit: "kg" },
    { item_id: byName("Toor Dal").id, location_id: kitchen.id, quantity: 0.5, unit: "kg" },
    { item_id: byName("Onion").id, location_id: kitchen.id, quantity: 1, unit: "kg" },
    { item_id: byName("Milk").id, location_id: fridge.id, quantity: 2, unit: "litre" },
    { item_id: byName("Toothpaste").id, location_id: bathroom.id, quantity: 1, unit: "pcs" },
  ]);

  console.log(
    `Seeded ${insertedLocations.length} locations, ${DEFAULT_CATEGORIES.length} categories, ${insertedItems.length} items.`
  );
}

main().then(() => process.exit(0));
