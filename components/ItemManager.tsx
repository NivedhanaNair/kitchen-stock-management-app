"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Item, ItemStockStatus, Location, StockLevel } from "@/types";
import { UNIT_OPTIONS } from "@/lib/constants";

const emptyForm = {
  name: "",
  category: "",
  unit: "",
  preferred_brand: "",
  notes: "",
  default_reorder_threshold: "",
};

type SortMode = "name" | "category" | "stock";

function isLowStock(level: StockLevel) {
  return level.reorder_threshold !== null && level.quantity <= level.reorder_threshold;
}

interface ItemManagerProps {
  onManageThresholds?: (itemId: string) => void;
}

export default function ItemManager({ onManageThresholds }: ItemManagerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockStatuses, setStockStatuses] = useState<ItemStockStatus[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function loadAll() {
    setLoading(true);
    const [itemsRes, locationsRes, categoriesRes, levelsRes, statusesRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/locations"),
      fetch("/api/categories"),
      fetch("/api/stock-levels"),
      fetch("/api/item-stock-status"),
    ]);
    setItems(await itemsRes.json());
    setLocations(await locationsRes.json());
    setCategories(await categoriesRes.json());
    setStockLevels(await levelsRes.json());
    setStockStatuses(await statusesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function locationName(id: string) {
    return locations.find((l) => l.id === id)?.name ?? "Unknown location";
  }

  function levelsForItem(itemId: string) {
    return stockLevels.filter((l) => l.item_id === itemId);
  }

  function statusForItem(itemId: string) {
    return stockStatuses.find((s) => s.item_id === itemId);
  }

  const visibleItems = useMemo(() => {
    let result = items;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      result = result.filter((i) => i.category === categoryFilter);
    }
    if (locationFilter) {
      result = result.filter((i) =>
        stockLevels.some((l) => l.item_id === i.id && l.location_id === locationFilter)
      );
    }

    const withLowFlag = result.map((item) => ({
      item,
      low: stockStatuses.find((s) => s.item_id === item.id)?.is_low ?? false,
    }));

    withLowFlag.sort((a, b) => {
      if (sortMode === "category") {
        return a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name);
      }
      if (sortMode === "stock") {
        if (a.low !== b.low) return a.low ? -1 : 1;
        return a.item.name.localeCompare(b.item.name);
      }
      return a.item.name.localeCompare(b.item.name);
    });

    return withLowFlag;
  }, [items, stockLevels, stockStatuses, search, categoryFilter, locationFilter, sortMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.category.trim() || !form.unit.trim()) {
      setError("Name, category, and unit are required");
      return;
    }
    let defaultThreshold: number | null = null;
    if (form.default_reorder_threshold.trim() !== "") {
      defaultThreshold = Number(form.default_reorder_threshold);
      if (Number.isNaN(defaultThreshold)) {
        setError("Default reorder threshold must be a number");
        return;
      }
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
        default_reorder_threshold: defaultThreshold,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create item");
      return;
    }

    setForm(emptyForm);
    // A lingering search/category/location filter can hide an item with no stock data yet —
    // clear filters so the item you just added is always visible immediately.
    setSearch("");
    setCategoryFilter("");
    setLocationFilter("");
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

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    await loadAll();
  }

  function startEdit(item: Item) {
    setEditingItemId(item.id);
    setEditForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      preferred_brand: item.preferred_brand ?? "",
      notes: item.notes ?? "",
      default_reorder_threshold:
        item.default_reorder_threshold !== null ? String(item.default_reorder_threshold) : "",
    });
  }

  async function saveEdit(id: string) {
    setError(null);
    if (!editForm.name.trim() || !editForm.category.trim() || !editForm.unit.trim()) {
      setError("Name, category, and unit are required");
      return;
    }
    let defaultThreshold: number | null = null;
    if (editForm.default_reorder_threshold.trim() !== "") {
      defaultThreshold = Number(editForm.default_reorder_threshold);
      if (Number.isNaN(defaultThreshold)) {
        setError("Default reorder threshold must be a number");
        return;
      }
    }
    const res = await fetch(`/api/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        preferred_brand: editForm.preferred_brand || null,
        notes: editForm.notes || null,
        default_reorder_threshold: defaultThreshold,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update item");
      return;
    }
    setEditingItemId(null);
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <datalist id="category-options">
        {categories.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <datalist id="unit-options">
        {UNIT_OPTIONS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

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
          list="category-options"
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="input-field"
        />
        <input
          type="text"
          list="unit-options"
          placeholder="Unit (e.g. kg, litre, pcs)"
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
          placeholder="Reorder threshold (optional, checked against total stock)"
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
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="input-field"
        >
          <option value="name">Sort: Alphabetical</option>
          <option value="category">Sort: Category</option>
          <option value="stock">Sort: Low stock first</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading items...</p>
      ) : visibleItems.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          No items match your filters.
        </div>
      ) : (
        <ul className="card divide-y divide-border">
          {visibleItems.map(({ item, low }) => {
            const levels = levelsForItem(item.id).filter(
              (l) => !locationFilter || l.location_id === locationFilter
            );
            const status = statusForItem(item.id);
            const isEditing = editingItemId === item.id;

            return (
              <li key={item.id} className="px-4 py-3">
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input-field"
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      list="category-options"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="input-field"
                      placeholder="Category"
                    />
                    <input
                      type="text"
                      list="unit-options"
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      className="input-field"
                      placeholder="Unit"
                    />
                    <input
                      type="text"
                      value={editForm.preferred_brand}
                      onChange={(e) =>
                        setEditForm({ ...editForm, preferred_brand: e.target.value })
                      }
                      className="input-field"
                      placeholder="Preferred brand"
                    />
                    <input
                      type="number"
                      value={editForm.default_reorder_threshold}
                      onChange={(e) =>
                        setEditForm({ ...editForm, default_reorder_threshold: e.target.value })
                      }
                      className="input-field"
                      placeholder="Reorder threshold (total stock)"
                    />
                    <input
                      type="text"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="input-field"
                      placeholder="Notes"
                    />
                    <div className="col-span-full flex gap-2">
                      <button onClick={() => saveEdit(item.id)} className="btn-primary">
                        Save
                      </button>
                      <button onClick={() => setEditingItemId(null)} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.category} · {item.unit}
                        </span>
                        {low && <span className="badge bg-warning-soft text-warning">Low stock</span>}
                        {!item.is_active && (
                          <span className="badge bg-surface-muted text-muted-foreground">Inactive</span>
                        )}
                      </div>
                      {item.preferred_brand && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Brand: {item.preferred_brand}</p>
                      )}
                      {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      {status?.mode === "total" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Total stock: {status.total_quantity} {item.unit}
                          {status.threshold !== null ? ` (reorder @ ${status.threshold} total)` : ""}
                        </p>
                      )}
                      {levels.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {levels
                            .map(
                              (l) =>
                                `${locationName(l.location_id)}: ${l.quantity} ${item.unit}${
                                  status?.mode === "per_location" && isLowStock(l) ? " (low)" : ""
                                }`
                            )
                            .join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No stock counted yet.</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(item)} className="btn-secondary">
                          Edit
                        </button>
                        <button onClick={() => toggleActive(item)} className="btn-secondary">
                          {item.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="btn-danger">
                          Delete
                        </button>
                      </div>
                      {onManageThresholds && (
                        <button
                          onClick={() => onManageThresholds(item.id)}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {status?.mode === "per_location"
                            ? "Manage per-location thresholds →"
                            : "Set per-location thresholds instead →"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
