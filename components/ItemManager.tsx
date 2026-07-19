"use client";

import { useEffect, useState } from "react";
import type { Item, ItemLocation, Location } from "@/types";

const emptyForm = {
  name: "",
  category: "",
  unit: "",
  preferred_brand: "",
  notes: "",
  default_reorder_threshold: "",
};

export default function ItemManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<Record<string, string>>({});

  async function loadAll() {
    setLoading(true);
    const [itemsRes, locationsRes, itemLocationsRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/locations"),
      fetch("/api/item-locations"),
    ]);
    setItems(await itemsRes.json());
    setLocations(await locationsRes.json());
    setItemLocations(await itemLocationsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.category.trim() || !form.unit.trim()) {
      setError("Name, category, and unit are required");
      return;
    }
    const threshold = Number(form.default_reorder_threshold);
    if (Number.isNaN(threshold)) {
      setError("Default reorder threshold must be a number");
      return;
    }

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        unit: form.unit,
        preferred_brand: form.preferred_brand || null,
        notes: form.notes || null,
        default_reorder_threshold: threshold,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create item");
      return;
    }

    setForm(emptyForm);
    await loadAll();
  }

  async function toggleActive(item: Item) {
    await fetch(`/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    await loadAll();
  }

  function thresholdFor(itemId: string, locationId: string) {
    const key = `${itemId}::${locationId}`;
    if (thresholdDraft[key] !== undefined) return thresholdDraft[key];
    const existing = itemLocations.find(
      (il) => il.item_id === itemId && il.location_id === locationId
    );
    return existing ? String(existing.reorder_threshold) : "";
  }

  async function saveThreshold(itemId: string, locationId: string) {
    const key = `${itemId}::${locationId}`;
    const value = Number(thresholdDraft[key]);
    if (Number.isNaN(value)) return;

    await fetch("/api/item-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        location_id: locationId,
        reorder_threshold: value,
      }),
    });
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Unit (e.g. kg, L, pcs)"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Preferred brand (optional)"
          value={form.preferred_brand}
          onChange={(e) => setForm({ ...form, preferred_brand: e.target.value })}
          className="input-field"
        />
        <input
          type="number"
          placeholder="Default reorder threshold"
          value={form.default_reorder_threshold}
          onChange={(e) => setForm({ ...form, default_reorder_threshold: e.target.value })}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input-field"
        />
        <button type="submit" className="btn-primary col-span-full">
          Add Item
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading items...</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          No items yet. Add one above.
        </div>
      ) : (
        <ul className="card divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.category} · {item.unit} · reorder @ {item.default_reorder_threshold}
                    </span>
                    {!item.is_active && (
                      <span className="badge bg-surface-muted text-muted-foreground">Inactive</span>
                    )}
                  </div>
                  {item.preferred_brand && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Brand: {item.preferred_brand}</p>
                  )}
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      setExpandedItemId(expandedItemId === item.id ? null : item.id)
                    }
                    className="btn-secondary"
                  >
                    {expandedItemId === item.id ? "Hide thresholds" : "Per-location thresholds"}
                  </button>
                  <button onClick={() => toggleActive(item)} className="btn-secondary">
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>

              {expandedItemId === item.id && (
                <div className="mt-3 space-y-2 rounded-xl bg-surface-muted p-3">
                  {locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No locations available.</p>
                  ) : (
                    locations.map((location) => {
                      const key = `${item.id}::${location.id}`;
                      return (
                        <div key={location.id} className="flex items-center gap-2 text-sm">
                          <span className="w-32 text-muted-foreground">{location.name}</span>
                          <input
                            type="number"
                            placeholder={`default ${item.default_reorder_threshold}`}
                            value={thresholdFor(item.id, location.id)}
                            onChange={(e) =>
                              setThresholdDraft({ ...thresholdDraft, [key]: e.target.value })
                            }
                            className="input-field w-32 py-1 text-xs"
                          />
                          <button
                            onClick={() => saveThreshold(item.id, location.id)}
                            className="btn-secondary"
                          >
                            Save
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
