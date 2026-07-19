"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/types";

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create category");
      return;
    }
    setName("");
    await load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary">
          Add Category
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading categories...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {c.name}
              <button
                onClick={() => handleDelete(c.id)}
                className="text-muted-foreground hover:text-danger"
                aria-label={`Remove ${c.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
