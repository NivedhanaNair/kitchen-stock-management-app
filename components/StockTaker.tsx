"use client";

import { useEffect, useState } from "react";
import type { Item, Location, StockEntry, StockTakeSession } from "@/types";

export default function StockTaker() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sessions, setSessions] = useState<StockTakeSession[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);

  const [newSessionLocationId, setNewSessionLocationId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [entryItemId, setEntryItemId] = useState("");
  const [entryQuantity, setEntryQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const activeSessionEntries = entries.filter((e) => e.stock_take_session_id === activeSessionId);

  async function loadAll() {
    const [locationsRes, itemsRes, sessionsRes, entriesRes] = await Promise.all([
      fetch("/api/locations"),
      fetch("/api/items"),
      fetch("/api/sessions"),
      fetch("/api/stock-entries"),
    ]);
    setLocations(await locationsRes.json());
    setItems(await itemsRes.json());
    setSessions(await sessionsRes.json());
    setEntries(await entriesRes.json());
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (items.length > 0 && !entryItemId) {
      setEntryItemId(items[0].id);
    }
  }, [items, entryItemId]);

  async function startSession(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!newSessionLocationId) {
      setError("Choose a location to start a session");
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: newSessionLocationId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to start session");
      return;
    }

    const session: StockTakeSession = await res.json();
    setSessions((prev) => [...prev, session]);
    setActiveSessionId(session.id);
  }

  async function logEntry(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!activeSession) return;

    const item = items.find((i) => i.id === entryItemId);
    if (!item) {
      setError("Choose an item");
      return;
    }
    const quantity = Number(entryQuantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      setError("Quantity must be a non-negative number");
      return;
    }

    const res = await fetch("/api/stock-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: item.id,
        location_id: activeSession.location_id,
        quantity,
        unit: item.unit,
        stock_take_session_id: activeSession.id,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to log entry");
      return;
    }

    const entry: StockEntry = await res.json();
    setEntries((prev) => [...prev, entry]);
    setEntryQuantity("");
  }

  async function completeSession() {
    if (!activeSession) return;
    const res = await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete: true }),
    });
    const updated: StockTakeSession = await res.json();
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActiveSessionId(null);
  }

  function locationName(id: string) {
    return locations.find((l) => l.id === id)?.name ?? "Unknown location";
  }

  function itemName(id: string) {
    return items.find((i) => i.id === id)?.name ?? "Unknown item";
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-danger">{error}</p>}

      {!activeSession ? (
        <form onSubmit={startSession} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1">
            <label className="field-label">Location</label>
            <select
              value={newSessionLocationId}
              onChange={(e) => setNewSessionLocationId(e.target.value)}
              className="input-field"
            >
              <option value="">Select a location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Start Stock Take Session
          </button>
        </form>
      ) : (
        <div className="card space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Session at {locationName(activeSession.location_id)}
              </p>
              <p className="text-xs text-muted-foreground">
                Started {new Date(activeSession.started_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={completeSession}
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
            >
              Complete Session
            </button>
          </div>

          <form onSubmit={logEntry} className="flex flex-wrap items-end gap-3 rounded-xl bg-surface-muted p-3">
            <div className="flex flex-col gap-1">
              <label className="field-label">Item</label>
              <select
                value={entryItemId}
                onChange={(e) => setEntryItemId(e.target.value)}
                className="input-field"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="field-label">Quantity</label>
              <input
                type="number"
                value={entryQuantity}
                onChange={(e) => setEntryQuantity(e.target.value)}
                className="input-field w-28"
              />
            </div>
            <button type="submit" className="btn-primary">
              Log Count
            </button>
          </form>

          <div>
            <p className="eyebrow mb-2">Logged this session</p>
            {activeSessionEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No counts logged yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {activeSessionEntries.map((entry) => (
                  <li key={entry.id} className="flex justify-between py-2 text-sm">
                    <span className="text-foreground">{itemName(entry.item_id)}</span>
                    <span className="text-muted-foreground">
                      {entry.quantity} {entry.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow mb-2">All Sessions</p>
        {sessions.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            No stock take sessions yet.
          </div>
        ) : (
          <ul className="card divide-y divide-border">
            {sessions
              .slice()
              .reverse()
              .map((session) => (
                <li key={session.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <span className="font-medium text-foreground">
                      {locationName(session.location_id)}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge ${
                        session.completed_at
                          ? "bg-success-soft text-success"
                          : "bg-warning-soft text-warning"
                      }`}
                    >
                      {session.completed_at ? "Completed" : "In progress"}
                    </span>
                    {!session.completed_at && session.id !== activeSessionId && (
                      <button onClick={() => setActiveSessionId(session.id)} className="btn-secondary">
                        Resume
                      </button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
