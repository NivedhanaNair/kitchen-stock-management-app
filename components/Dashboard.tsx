"use client";

import { useEffect, useState } from "react";
import type { Item, Location, StockEntry, StockLevel, StockTakeSession } from "@/types";

interface DashboardProps {
  onNavigate?: (tab: "items" | "stock-take" | "shopping-list") => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [sessions, setSessions] = useState<StockTakeSession[]>([]);
  const [recentEntries, setRecentEntries] = useState<StockEntry[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [itemsRes, locationsRes, levelsRes, entriesRes, sessionsRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/locations"),
        fetch("/api/stock-levels"),
        fetch("/api/stock-entries"),
        fetch("/api/sessions"),
      ]);
      setItems(await itemsRes.json());
      setLocations(await locationsRes.json());
      setStockLevels(await levelsRes.json());
      setSessions(await sessionsRes.json());
      const allEntries: StockEntry[] = await entriesRes.json();
      setRecentEntries(
        allEntries
          .slice()
          .sort((a, b) => new Date(b.counted_at).getTime() - new Date(a.counted_at).getTime())
          .slice(0, 10)
      );
      setNow(Date.now());
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

  function daysAgoLabel(iso: string | undefined) {
    if (!iso) return "Never";
    const days = Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function lastStockTake(locationId: string) {
    const relevant = sessions.filter(
      (s) => s.completed_at && (s.location_id === locationId || s.location_id === null)
    );
    if (relevant.length === 0) return undefined;
    return relevant.reduce((latest, s) =>
      new Date(s.completed_at!) > new Date(latest.completed_at!) ? s : latest
    ).completed_at!;
  }

  const belowThreshold = stockLevels.filter(
    (level) => level.reorder_threshold !== null && level.quantity <= level.reorder_threshold
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap gap-2">
        <button onClick={() => onNavigate?.("stock-take")} className="btn-primary">
          Start Stock Take
        </button>
        <button onClick={() => onNavigate?.("items")} className="btn-secondary">
          Add Item
        </button>
        <button onClick={() => onNavigate?.("shopping-list")} className="btn-secondary">
          View Shopping List
        </button>
      </section>

      <section>
        <h2 className="section-title mb-3">Reorder Alerts ({belowThreshold.length})</h2>
        {belowThreshold.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            Everything is above its reorder threshold.
          </div>
        ) : (
          <ul className="divide-y divide-warning/20 overflow-hidden rounded-2xl border border-warning/30 bg-warning-soft">
            {belowThreshold.slice(0, 5).map((level) => (
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
        {belowThreshold.length > 5 && (
          <button
            onClick={() => onNavigate?.("shopping-list")}
            className="mt-2 text-xs font-medium text-accent hover:underline"
          >
            View all {belowThreshold.length} on the Shopping List &rarr;
          </button>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">Last Stock Take by Location</h2>
        <ul className="card divide-y divide-border">
          {locations
            .filter((l) => l.is_active)
            .map((location) => (
              <li key={location.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-foreground">{location.name}</span>
                <span className="text-muted-foreground">{daysAgoLabel(lastStockTake(location.id))}</span>
              </li>
            ))}
        </ul>
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
