"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, Location, StockLevel } from "@/types";

interface ManualEntry {
  id: string;
  text: string;
  bought: boolean;
}

const BOUGHT_STORAGE_KEY = "stock-app.shopping-list.bought";
const MANUAL_STORAGE_KEY = "stock-app.shopping-list.manual";

type GroupMode = "category" | "location";

export default function ShoppingList() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>("category");
  const [bought, setBought] = useState<Record<string, boolean>>({});
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualText, setManualText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const [itemsRes, locationsRes, levelsRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/locations"),
        fetch("/api/stock-levels"),
      ]);
      setItems(await itemsRes.json());
      setLocations(await locationsRes.json());
      setStockLevels(await levelsRes.json());
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

  const needed = useMemo(
    () => stockLevels.filter((l) => l.reorder_threshold !== null && l.quantity <= l.reorder_threshold),
    [stockLevels]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, StockLevel[]>();
    for (const level of needed) {
      const key =
        groupMode === "category"
          ? items.find((i) => i.id === level.item_id)?.category ?? "Uncategorized"
          : locations.find((l) => l.id === level.location_id)?.name ?? "Unknown location";
      const list = groups.get(key) ?? [];
      list.push(level);
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
    for (const [group, levels] of grouped) {
      lines.push(`${group}:`);
      for (const level of levels) {
        const key = `${level.item_id}::${level.location_id}`;
        const shortBy = (level.reorder_threshold ?? 0) - level.quantity;
        const mark = bought[key] ? "[x]" : "[ ]";
        lines.push(
          `  ${mark} ${itemName(level.item_id)} (${locationName(level.location_id)}) — have ${level.quantity}, need ${level.reorder_threshold}, short by ${shortBy}`
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
          {grouped.map(([group, levels]) => (
            <div key={group}>
              <h3 className="section-title mb-2">{group}</h3>
              <ul className="card divide-y divide-border">
                {levels.map((level) => {
                  const key = `${level.item_id}::${level.location_id}`;
                  const shortBy = (level.reorder_threshold ?? 0) - level.quantity;
                  return (
                    <li key={key} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={bought[key] ?? false}
                        onChange={() => toggleBought(key)}
                        className="h-4 w-4 accent-accent"
                      />
                      <div className={`flex-1 ${bought[key] ? "text-muted-foreground line-through" : ""}`}>
                        <span className="font-medium text-foreground">{itemName(level.item_id)}</span>{" "}
                        <span className="text-muted-foreground">at {locationName(level.location_id)}</span>
                      </div>
                      <span className="text-xs text-warning">
                        have {level.quantity} · need {level.reorder_threshold} · short {shortBy}
                      </span>
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
                    <input
                      type="checkbox"
                      checked={entry.bought}
                      onChange={() => toggleManualBought(entry.id)}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className={`flex-1 ${entry.bought ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {entry.text}
                    </span>
                    <button
                      onClick={() => removeManualEntry(entry.id)}
                      className="text-xs font-medium text-danger hover:underline"
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
