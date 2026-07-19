"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Item, Location, StockLevel } from "@/types";

export default function StockOverview() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  async function loadAll() {
    setLoading(true);
    const [itemsRes, locationsRes, categoriesRes, levelsRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/locations"),
      fetch("/api/categories"),
      fetch("/api/stock-levels"),
    ]);
    setItems(await itemsRes.json());
    setLocations(await locationsRes.json());
    setCategories(await categoriesRes.json());
    setStockLevels(await levelsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const visibleLocations = locationFilter ? locations.filter((l) => l.id === locationFilter) : locations;

  const visibleItems = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      result = result.filter((i) => i.category === categoryFilter);
    }

    const totalQuantity = (item: Item) =>
      stockLevels.filter((l) => l.item_id === item.id).reduce((sum, l) => sum + l.quantity, 0);

    return result.slice().sort((a, b) => {
      const diff = totalQuantity(a) - totalQuantity(b);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [items, stockLevels, search, categoryFilter]);

  function levelFor(itemId: string, locationId: string) {
    return stockLevels.find((l) => l.item_id === itemId && l.location_id === locationId);
  }

  function cellClasses(level: StockLevel | undefined) {
    if (!level) return "text-muted-foreground";
    if (level.reorder_threshold !== null && level.quantity <= level.reorder_threshold) {
      return "bg-warning-soft text-warning";
    }
    if (level.reorder_threshold !== null) {
      return "bg-success-soft text-success";
    }
    return "text-foreground";
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading stock overview...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 p-3">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field flex-1 min-w-[10rem]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface-muted p-1">
        <button
          onClick={() => setLocationFilter("")}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            locationFilter === "" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          All Locations
        </button>
        {locations.map((l) => (
          <button
            key={l.id}
            onClick={() => setLocationFilter(l.id)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              locationFilter === l.id ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-success-soft" /> above threshold
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-warning-soft" /> at/below threshold
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border border-border" /> no threshold set
        </span>
        <span>— not counted yet</span>
      </div>

      {visibleItems.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          No items match your filters.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Item</th>
                {visibleLocations.map((l) => (
                  <th key={l.id} className="px-4 py-2">
                    {l.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 font-medium text-foreground">
                    {item.name}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({item.category})
                    </span>
                  </td>
                  {visibleLocations.map((location) => {
                    const level = levelFor(item.id, location.id);
                    return (
                      <td key={location.id} className="px-4 py-2">
                        <span
                          className={`inline-block rounded-md px-2 py-1 text-xs ${cellClasses(level)}`}
                          title={level?.last_counted_at ? `Last counted ${new Date(level.last_counted_at).toLocaleString()}` : "Never counted"}
                        >
                          {level ? `${level.quantity} ${item.unit}` : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}