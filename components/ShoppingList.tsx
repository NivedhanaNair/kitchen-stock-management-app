"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, ItemStockStatus, Location } from "@/types";

interface ManualEntry {
  id: string;
  text: string;
  bought: boolean;
}

interface NeededRow {
  key: string;
  itemId: string;
  locationId: string | null;
  quantity: number;
  threshold: number;
}

const BOUGHT_STORAGE_KEY = "stock-app.shopping-list.bought";
const MANUAL_STORAGE_KEY = "stock-app.shopping-list.manual";

type GroupMode = "category" | "location";

export default function ShoppingList() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockStatuses, setStockStatuses] = useState<ItemStockStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>("category");
  const [bought, setBought] = useState<Record<string, boolean>>({});
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualText, setManualText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const [itemsRes, locationsRes, statusesRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/locations"),
        fetch("/api/item-stock-status"),
      ]);
      setItems(await itemsRes.json());
      setLocations(await locationsRes.json());
      setStockStatuses(await statusesRes.json());
      setLoading(false);
    }
    load();

    try {
      const storedBought = localStorage.getItem(BOUGHT_STORAGE_KEY);
      if (storedBought) setBought(JSON.parse(storedBought));
      const storedManual = localStorage.getItem(MANUAL_STORAGE_KEY);
      if (storedManual) setManualEntries(JSON.parse(storedManual));
    } catch {
      // localStorage unavailable — bought/manual state just won't persist
    }
  }, []);

  function persistBought(next: Record<string, boolean>) {
    setBought(next);
    try {
      localStorage.setItem(BOUGHT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function persistManual(next: ManualEntry[]) {
    setManualEntries(next);
    try {
      localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function itemName(id: string) {
    return items.find((i) => i.id === id)?.name ?? "Unknown item";
  }

  function locationName(id: string) {
    return locations.find((l) => l.id === id)?.name ?? "Unknown location";
  }

  const needed: NeededRow[] = useMemo(
    () =>
      stockStatuses
        .filter((s) => s.is_low)
        .flatMap((s) => {
          if (s.mode === "total") {
            const row: NeededRow = {
              key: s.item_id,
              itemId: s.item_id,
              locationId: null,
              quantity: s.total_quantity,
              threshold: s.threshold ?? 0,
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
              threshold: l.reorder_threshold ?? 0,
            }));
        }),
    [stockStatuses]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, NeededRow[]>();
    for (const row of needed) {
      const key =
        groupMode === "category"
          ? items.find((i) => i.id === row.itemId)?.category ?? "Uncategorized"
          : row.locationId
            ? locations.find((l) => l.id === row.locationId)?.name ?? "Unknown location"
            : "All locations (total stock)";
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [needed, groupMode, items, locations]);

  function toggleBought(key: string) {
    persistBought({ ...bought, [key]: !bought[key] });
  }

  function addManualEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    const entry: ManualEntry = { id: crypto.randomUUID(), text: manualText.trim(), bought: false };
    persistManual([...manualEntries, entry]);
    setManualText("");
  }

  function toggleManualBought(id: string) {
    persistManual(manualEntries.map((e) => (e.id === id ? { ...e, bought: !e.bought } : e)));
  }

  function removeManualEntry(id: string) {
    persistManual(manualEntries.filter((e) => e.id !== id));
  }

  function buildPlainText() {
    const lines: string[] = ["Shopping List", ""];
    for (const [group, rows] of grouped) {
      lines.push(`${group}:`);
      for (const row of rows) {
        const shortBy = row.threshold - row.quantity;
        const mark = bought[row.key] ? "[x]" : "[ ]";
        const where = row.locationId ? ` (${locationName(row.locationId)})` : "";
        lines.push(
          `  ${mark} ${itemName(row.itemId)}${where} — have ${row.quantity}, need ${row.threshold}, short by ${shortBy}`
        );
      }
      lines.push("");
    }
    if (manualEntries.length > 0) {
      lines.push("Other:");
      for (const entry of manualEntries) {
        lines.push(`  ${entry.bought ? "[x]" : "[ ]"} ${entry.text}`);
      }
    }
    return lines.join("\n").trim();
  }

  async function copyList() {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — user can still use the download button
    }
  }

  function downloadList() {
    const blob = new Blob([buildPlainText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "shopping-list.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading shopping list...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-surface-muted p-1">
          <button
            onClick={() => setGroupMode("category")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              groupMode === "category" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Group by category
          </button>
          <button
            onClick={() => setGroupMode("location")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              groupMode === "location" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Group by location
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={copyList} className="btn-secondary">
            {copied ? "Copied!" : "Copy list"}
          </button>
          <button onClick={downloadList} className="btn-secondary">
            Download .txt
          </button>
        </div>
      </div>

      {needed.length === 0 && manualEntries.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          Nothing needs buying right now.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([group, rows]) => (
            <div key={group}>
              <h3 className="section-title mb-2">{group}</h3>
              <ul className="card divide-y divide-border">
                {rows.map((row) => {
                  const shortBy = row.threshold - row.quantity;
                  return (
                    <li key={row.key}>
                      <button
                        onClick={() => toggleBought(row.key)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm active:bg-surface-muted"
                      >
                        <input
                          type="checkbox"
                          checked={bought[row.key] ?? false}
                          readOnly
                          className="h-5 w-5 shrink-0 accent-accent"
                        />
                        <div className={`flex-1 ${bought[row.key] ? "text-muted-foreground line-through" : ""}`}>
                          <span className="font-medium text-foreground">{itemName(row.itemId)}</span>{" "}
                          <span className="text-muted-foreground">
                            {row.locationId ? `at ${locationName(row.locationId)}` : "(total across locations)"}
                          </span>
                        </div>
                        <span className="text-xs text-warning">
                          have {row.quantity} · need {row.threshold} · short {shortBy}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {manualEntries.length > 0 && (
            <div>
              <h3 className="section-title mb-2">Other</h3>
              <ul className="card divide-y divide-border">
                {manualEntries.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={entry.bought}
                        onChange={() => toggleManualBought(entry.id)}
                        className="h-5 w-5 shrink-0 accent-accent"
                      />
                      <span className={entry.bought ? "text-muted-foreground line-through" : "text-foreground"}>
                        {entry.text}
                      </span>
                    </label>
                    <button
                      onClick={() => removeManualEntry(entry.id)}
                      className="shrink-0 rounded px-2 py-1.5 text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={addManualEntry} className="card flex gap-2 p-4">
        <input
          type="text"
          placeholder="Add a one-off item not tracked above..."
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary">
          Add to list
        </button>
      </form>
    </div>
  );
}
