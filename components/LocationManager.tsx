"use client";

import { useEffect, useState } from "react";
import type { Location } from "@/types";

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLocations() {
    setLoading(true);
    const res = await fetch("/api/locations");
    const data = await res.json();
    setLocations(data);
    setLoading(false);
  }

  useEffect(() => {
    loadLocations();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Location name is required");
      return;
    }

    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create location");
      return;
    }

    setName("");
    await loadLocations();
  }

  async function toggleActive(location: Location) {
    await fetch(`/api/locations/${location.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !location.is_active }),
    });
    await loadLocations();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    await loadLocations();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card flex gap-2 p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New location name"
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary">
          Add Location
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading locations...</p>
      ) : locations.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          No locations yet. Add one above.
        </div>
      ) : (
        <ul className="card divide-y divide-border">
          {locations.map((location) => (
            <li key={location.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{location.name}</span>
                <span
                  className={`badge ${
                    location.is_active
                      ? "bg-success-soft text-success"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {location.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(location)} className="btn-secondary">
                  {location.is_active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => handleDelete(location.id)} className="btn-danger">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
