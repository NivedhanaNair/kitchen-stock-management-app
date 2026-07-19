"use client";

import { useEffect, useState } from "react";
import type { Item, ItemStockStatus, Location, StockEntry, StockTakeSession, User } from "@/types";

interface DashboardProps {
  onNavigate?: (tab: "items" | "stock-take" | "shopping-list") => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stockStatuses, setStockStatuses] = useState<ItemStockStatus[]>([]);
  const [sessions, setSessions] = useState<StockTakeSession[]>([]);
  const [recentEntries, setRecentEntries] = useState<StockEntry[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [itemsRes, locationsRes, usersRes, statusesRes, entriesRes, sessionsRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/locations"),
        fetch("/api/users"),
        fetch("/api/item-stock-status"),
        fetch("/api/stock-entries"),
        fetch("/api/sessions"),
      ]);
      setItems(await itemsRes.json());
      setLocations(await locationsRes.json());
      setUsers(await usersRes.json());
      setStockStatuses(await statusesRes.json());
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

  function userName(id: string | null) {
    if (!id) return null;
    return users.find((u) => u.id === id)?.name ?? null;
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

  interface AlertRow {
    key: string;
    itemId: string;
    locationId: string | null;
    quantity: number;
    threshold: number | null;
  }

  const alertRows: AlertRow[] = stockStatuses
    .filter((s) => s.is_low)
    .flatMap((s) => {
      if (s.mode === "total") {
        const row: AlertRow = {
          key: s.item_id,
          itemId: s.item_id,
          locationId: null,
          quantity: s.total_quantity,
          threshold: s.threshold,
        };
        return [row];
      }
      return s.per_location
        .filter((l) => l.reorder_threshold !== null && l.quantity <= l.reorder_threshold)
        .map((l) => ({
          key: `${l.item_id}::${l.location_id}`,
          itemId: l.item_id,
          locationId: l.location_id,
          quantity: l.quantity,
          threshold: l.reorder_threshold,
        }));
    });

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
        <h2 className="section-title mb-3">Reorder Alerts ({alertRows.length})</h2>
        {alertRows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            Everything is above its reorder threshold.
          </div>
        ) : (
          <ul className="divide-y divide-warning/20 overflow-hidden rounded-2xl border border-warning/30 bg-warning-soft">
            {alertRows.slice(0, 5).map((row) => (
              <li key={row.key} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-foreground">{itemName(row.itemId)}</span>{" "}
                  <span className="text-muted-foreground">
                    {row.locationId ? `at ${locationName(row.locationId)}` : "(total across locations)"}
                  </span>
                </div>
                <span className="font-medium text-warning">
                  {row.quantity} on hand (reorder @ {row.threshold})
                </span>
              </li>
            ))}
          </ul>
        )}
        {alertRows.length > 5 && (
          <button
            onClick={() => onNavigate?.("shopping-list")}
            className="mt-2 text-xs font-medium text-accent hover:underline"
          >
            View all {alertRows.length} on the Shopping List &rarr;
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
            {recentEntries.map((entry) => {
              const by = userName(entry.created_by);
              return (
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
                      {by ? ` · ${by}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}