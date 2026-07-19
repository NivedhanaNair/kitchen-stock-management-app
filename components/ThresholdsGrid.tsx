"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Item, ItemLocation, Location } from "@/types";

interface ThresholdsGridProps {
  focusItemId?: string | null;
}

export default function ThresholdsGrid({ focusItemId }: ThresholdsGridProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [bulkValue, setBulkValue] = useState<Record<string, string>>({});
  const [copyFrom, setCopyFrom] = useState("");
  const [copyTo, setCopyTo] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  async function loadAll() {
    setLoading(true);
    const [itemsRes, locationsRes, categoriesRes, itemLocationsRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/locations"),
      fetch("/api/categories"),
      fetch("/api/item-locations"),
    ]);
    setItems(await itemsRes.json());
    setLocations(await locationsRes.json());
    setCategories(await categoriesRes.json());
    setItemLocations(await itemLocationsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (focusItemId && rowRefs.current[focusItemId]) {
      rowRefs.current[focusItemId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusItemId, loading]);

  const visibleLocations = locationFilter
    ? locations.filter((l) => l.id === locationFilter)
    : locations;
  const visibleItems = categoryFilter ? items.filter((i) => i.category === categoryFilter) : items;

  function thresholdValue(itemId: string, locationId: string) {
    const key = `${itemId}::${locationId}`;
    if (draft[key] !== undefined) return draft[key];
    const existing = itemLocations.find(
      (il) => il.item_id === itemId && il.location_id === locationId
    );
    return existing ? String(existing.reorder_threshold) : "";
  }

  async function commitThreshold(itemId: string, locationId: string, rawValue: string) {
    const key = `${itemId}::${locationId}`;
    const existing = itemLocations.find(
      (il) => il.item_id === itemId && il.location_id === locationId
    );
    const existingValue = existing ? String(existing.reorder_threshold) : "";
    if (rawValue.trim() === existingValue) return;

    if (rawValue.trim() === "") {
      await fetch(`/api/item-locations?item_id=${itemId}&location_id=${locationId}`, {
        method: "DELETE",
      });
    } else {
      const value = Number(rawValue);
      if (Number.isNaN(value)) return;
      await fetch("/api/item-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, location_id: locationId, reorder_threshold: value }),
      });
    }
    setDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    await loadAll();
  }

  async function applyToAllLocations(itemId: string) {
    const value = Number(bulkValue[itemId]);
    if (Number.isNaN(value)) return;
    await Promise.all(
      locations.map((location) =>
        fetch("/api/item-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: itemId,
            location_id: location.id,
            reorder_threshold: value,
          }),
        })
      )
    );
    setBulkValue((prev) => ({ ...prev, [itemId]: "" }));
    await loadAll();
  }

  async function copyThresholds() {
    if (!copyFrom || !copyTo || copyFrom === copyTo) return;
    const toCopy = itemLocations.filter((il) => il.location_id === copyFrom);
    await Promise.all(
      toCopy.map((il) =>
        fetch("/api/item-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: il.item_id,
            location_id: copyTo,
            reorder_threshold: il.reorder_threshold,
          }),
        })
      )
    );
    await loadAll();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading thresholds...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 p-3">
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
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="input-field"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card flex flex-wrap items-end gap-2 p-3">
        <div className="flex flex-col gap-1">
          <label className="field-label">Copy thresholds from</label>
          <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="input-field">
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="field-label">to</label>
          <select value={copyTo} onChange={(e) => setCopyTo(e.target.value)} className="input-field">
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <button onClick={copyThresholds} className="btn-secondary">
          Copy thresholds
        </button>
      </div>

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
              <th className="px-4 py-2">Apply to all</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleItems.map((item) => (
              <tr
                key={item.id}
                ref={(el) => {
                  rowRefs.current[item.id] = el;
                }}
                className={item.id === focusItemId ? "bg-accent-soft" : undefined}
              >
                <td className="px-4 py-2 font-medium text-foreground">
                  {item.name}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">({item.unit})</span>
                </td>
                {visibleLocations.map((location) => {
                  const key = `${item.id}::${location.id}`;
                  return (
                    <td key={location.id} className="px-4 py-2">
                      <input
                        type="number"
                        placeholder="—"
                        value={thresholdValue(item.id, location.id)}
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                        onBlur={(e) => commitThreshold(item.id, location.id, e.target.value)}
                        className="input-field w-20 py-1 text-xs"
                      />
                    </td>
                  );
                })}
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="value"
                      value={bulkValue[item.id] ?? ""}
                      onChange={(e) => setBulkValue({ ...bulkValue, [item.id]: e.target.value })}
                      className="input-field w-16 py-1 text-xs"
                    />
                    <button onClick={() => applyToAllLocations(item.id)} className="btn-secondary">
                      Apply
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
