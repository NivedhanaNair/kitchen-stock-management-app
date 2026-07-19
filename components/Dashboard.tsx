"use client";

import { useEffect, useState } from "react";
import type { Item, Location, StockEntry, StockLevel } from "@/types";

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [recentEntries, setRecentEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [itemsRes, locationsRes, levelsRes, entriesRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/locations"),
        fetch("/api/stock-levels"),
        fetch("/api/stock-entries"),
      ]);
      setItems(await itemsRes.json());
      setLocations(await locationsRes.json());
      setStockLevels(await levelsRes.json());
      const allEntries: StockEntry[] = await entriesRes.json();
      setRecentEntries(
        allEntries
          .slice()
          .sort((a, b) => new Date(b.counted_at).getTime() - new Date(a.counted_at).getTime())
          .slice(0, 10)
      );
      setLoading(false);
    }
    load();
  }, []);

  function itemName(id: string) {
    return items.find((i) => i.id === id)?.name ?? "Unknown item";
  }

  function locationName(id: string) {
    return locations.find((l) => l.id === id)?.name ?? "Unknown location";
  }

  const belowThreshold = stockLevels.filter((level) => level.quantity <= level.reorder_threshold);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="section-title mb-3">Reorder Alerts ({belowThreshold.length})</h2>
        {belowThreshold.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            Everything is above its reorder threshold.
          </div>
        ) : (
          <ul className="divide-y divide-warning/20 overflow-hidden rounded-2xl border border-warning/30 bg-warning-soft">
            {belowThreshold.map((level) => (
              <li
                key={`${level.item_id}::${level.location_id}`}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">{itemName(level.item_id)}</span>{" "}
                  <span className="text-muted-foreground">at {locationName(level.location_id)}</span>
                </div>
                <span className="font-medium text-warning">
                  {level.quantity} on hand (reorder @ {level.reorder_threshold})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">Recent Stock Counts</h2>
        {recentEntries.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            No stock counts logged yet.
          </div>
        ) : (
          <ul className="card divide-y divide-border">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-foreground">{itemName(entry.item_id)}</span>{" "}
                  <span className="text-muted-foreground">at {locationName(entry.location_id)}</span>
                </div>
                <div className="text-right">
                  <p className="text-foreground">
                    {entry.quantity} {entry.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.counted_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
