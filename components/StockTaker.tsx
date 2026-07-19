"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Category,
  Item,
  ItemLocation,
  Location,
  StockEntry,
  StockTakeSession,
} from "@/types";

const ALL_LOCATIONS = "__all__";

interface SummaryRow {
  itemId: string;
  locationId: string;
  prevQty: number | null;
  newQty: number;
  threshold: number | null;
  status: "new" | "increased" | "decreased" | "unchanged";
  outOfStock: boolean;
  newlyBelowThreshold: boolean;
}

export default function StockTaker() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessions, setSessions] = useState<StockTakeSession[]>([]);
  const [allEntries, setAllEntries] = useState<StockEntry[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);

  const [newSessionChoice, setNewSessionChoice] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [historyLocationFilter, setHistoryLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAllItems, setShowAllItems] = useState(false);
  const [skippedKeys, setSkippedKeys] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<SummaryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingEntries, setViewingEntries] = useState<StockEntry[]>([]);
  const [viewingLoading, setViewingLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  async function loadAll() {
    const [locationsRes, itemsRes, categoriesRes, sessionsRes, entriesRes, itemLocationsRes] =
      await Promise.all([
        fetch("/api/locations"),
        fetch("/api/items"),
        fetch("/api/categories"),
        fetch("/api/sessions"),
        fetch("/api/stock-entries"),
        fetch("/api/item-locations"),
      ]);
    setLocations(await locationsRes.json());
    setItems(await itemsRes.json());
    setCategories(await categoriesRes.json());
    setSessions(await sessionsRes.json());
    setAllEntries(await entriesRes.json());
    setItemLocations(await itemLocationsRes.json());
  }

  useEffect(() => {
    loadAll();
  }, []);

  function locationName(id: string) {
    return locations.find((l) => l.id === id)?.name ?? "Unknown location";
  }
  function itemName(id: string) {
    return items.find((i) => i.id === id)?.name ?? "Unknown item";
  }
  function thresholdFor(itemId: string, locationId: string) {
    return itemLocations.find((il) => il.item_id === itemId && il.location_id === locationId)
      ?.reorder_threshold ?? null;
  }

  /** Latest quantity for a pair, excluding entries logged during the given session (so resuming a
   *  session still diffs against what stock looked like before this count started). */
  function latestQuantityExcludingSession(itemId: string, locationId: string, sessionId: string | null) {
    const relevant = allEntries.filter(
      (e) => e.item_id === itemId && e.location_id === locationId && e.stock_take_session_id !== sessionId
    );
    if (relevant.length === 0) return null;
    return relevant.reduce((latest, e) =>
      new Date(e.counted_at) > new Date(latest.counted_at) ? e : latest
    ).quantity;
  }

  const targetLocations = useMemo(() => {
    if (!activeSession) return [];
    if (activeSession.location_id) {
      const loc = locations.find((l) => l.id === activeSession.location_id);
      return loc ? [loc] : [];
    }
    return locations.filter((l) => l.is_active);
  }, [activeSession, locations]);

  const visibleItems = useMemo(() => {
    const base = (categoryFilter ? items.filter((i) => i.category === categoryFilter) : items).filter(
      (i) => i.is_active
    );

    // Single-location sessions default to items relevant to that location (has a threshold
    // there, or has been counted there before); "All Locations" sessions always show
    // everything since they're an intentional full sweep.
    const locationId = activeSession?.location_id;
    if (showAllItems || !locationId) return base;

    const scoped = base.filter(
      (i) =>
        itemLocations.some((il) => il.item_id === i.id && il.location_id === locationId) ||
        allEntries.some((e) => e.item_id === i.id && e.location_id === locationId)
    );
    // Never dead-end a location with nothing tracked there yet — fall back to the full list.
    return scoped.length > 0 ? scoped : base;
  }, [items, categoryFilter, activeSession, itemLocations, allEntries, showAllItems]);

  const isScopedToRelevantItems =
    !showAllItems && !!activeSession?.location_id && visibleItems.length < items.length;

  const sessionEntryKeys = useMemo(() => {
    if (!activeSessionId) return new Set<string>();
    return new Set(
      allEntries
        .filter((e) => e.stock_take_session_id === activeSessionId)
        .map((e) => `${e.item_id}::${e.location_id}`)
    );
  }, [allEntries, activeSessionId]);

  const totalCells = visibleItems.length * targetLocations.length;
  const countedCells = visibleItems.reduce(
    (sum, item) =>
      sum +
      targetLocations.filter(
        (loc) => sessionEntryKeys.has(`${item.id}::${loc.id}`) || skippedKeys.has(`${item.id}::${loc.id}`)
      ).length,
    0
  );

  async function startSession(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);

    if (!newSessionChoice) {
      setError("Choose a location or All Locations to start a session");
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_id: newSessionChoice === ALL_LOCATIONS ? null : newSessionChoice,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to start session");
      return;
    }

    const session: StockTakeSession = await res.json();
    setSessions((prev) => [...prev, session]);
    setActiveSessionId(session.id);
    setSkippedKeys(new Set());
    setDraft({});
    setShowAllItems(false);
  }

  async function commitQuantity(itemId: string, locationId: string, rawValue: string) {
    const key = `${itemId}::${locationId}`;
    if (rawValue.trim() === "" || !activeSession) return;
    const quantity = Number(rawValue);
    if (Number.isNaN(quantity) || quantity < 0) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const res = await fetch("/api/stock-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        location_id: locationId,
        quantity,
        unit: item.unit,
        stock_take_session_id: activeSession.id,
      }),
    });

    if (res.ok) {
      const entry: StockEntry = await res.json();
      setAllEntries((prev) => [...prev, entry]);
      setSkippedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setDraft((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function quickFillLastTime(itemId: string, locationId: string) {
    const prevQty = latestQuantityExcludingSession(itemId, locationId, activeSessionId);
    if (prevQty === null) return;
    commitQuantity(itemId, locationId, String(prevQty));
  }

  function step(itemId: string, locationId: string, delta: number) {
    const key = `${itemId}::${locationId}`;
    const current = draft[key] ?? String(latestQuantityExcludingSession(itemId, locationId, activeSessionId) ?? 0);
    const next = Math.max(0, Number(current) + delta);
    commitQuantity(itemId, locationId, String(next));
  }

  function toggleSkip(itemId: string, locationId: string) {
    const key = `${itemId}::${locationId}`;
    setSkippedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function finishSession() {
    if (!activeSession) return;

    const res = await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete: true }),
    });
    const updated: StockTakeSession = await res.json();
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    const rows: SummaryRow[] = [];
    for (const key of sessionEntryKeys) {
      const [itemId, locationId] = key.split("::");
      const sessionEntries = allEntries.filter(
        (e) => e.item_id === itemId && e.location_id === locationId && e.stock_take_session_id === activeSession.id
      );
      const newest = sessionEntries.reduce((latest, e) =>
        new Date(e.counted_at) > new Date(latest.counted_at) ? e : latest
      );
      const prevQty = latestQuantityExcludingSession(itemId, locationId, activeSession.id);
      const threshold = thresholdFor(itemId, locationId);
      let status: SummaryRow["status"] = "unchanged";
      if (prevQty === null) status = "new";
      else if (newest.quantity > prevQty) status = "increased";
      else if (newest.quantity < prevQty) status = "decreased";

      rows.push({
        itemId,
        locationId,
        prevQty,
        newQty: newest.quantity,
        threshold,
        status,
        outOfStock: newest.quantity === 0,
        newlyBelowThreshold:
          threshold !== null &&
          newest.quantity <= threshold &&
          (prevQty === null || prevQty > threshold),
      });
    }

    setSummary(rows);
    setActiveSessionId(null);
    await loadAll();
  }

  const historySessions = sessions
    .filter((s) => !historyLocationFilter || s.location_id === historyLocationFilter || s.location_id === null)
    .slice()
    .reverse();

  const viewingSession = sessions.find((s) => s.id === viewingSessionId) ?? null;

  async function toggleView(sessionId: string) {
    if (viewingSessionId === sessionId) {
      setViewingSessionId(null);
      return;
    }
    setViewingSessionId(sessionId);
    setViewingLoading(true);
    const res = await fetch(`/api/stock-entries?stock_take_session_id=${sessionId}`);
    setViewingEntries(res.ok ? await res.json() : []);
    setViewingLoading(false);
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-danger">{error}</p>}

      {summary && (
        <div className="card space-y-3 p-4">
          <h3 className="section-title">Stock Take Summary</h3>
          <ul className="divide-y divide-border">
            {summary.map((row) => (
              <li key={`${row.itemId}::${row.locationId}`} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-foreground">{itemName(row.itemId)}</span>{" "}
                  <span className="text-muted-foreground">at {locationName(row.locationId)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {row.prevQty ?? "—"} &rarr; {row.newQty}
                  </span>
                  <span
                    className={`badge ${
                      row.status === "increased"
                        ? "bg-success-soft text-success"
                        : row.status === "decreased"
                          ? "bg-warning-soft text-warning"
                          : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {row.status}
                  </span>
                  {row.outOfStock && <span className="badge bg-danger-soft text-danger">Out of stock</span>}
                  {row.newlyBelowThreshold && (
                    <span className="badge bg-warning-soft text-warning">Newly below threshold</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button onClick={() => setSummary(null)} className="btn-primary">
            Done
          </button>
        </div>
      )}

      {!activeSession && !summary && (
        <form onSubmit={startSession} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1">
            <label className="field-label">Scope</label>
            <select
              value={newSessionChoice}
              onChange={(e) => setNewSessionChoice(e.target.value)}
              className="input-field"
            >
              <option value="">Select a location</option>
              <option value={ALL_LOCATIONS}>All Locations</option>
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
      )}

      {activeSession && (
        <div className="card space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {activeSession.location_id ? `Session at ${locationName(activeSession.location_id)}` : "Session — All Locations"}
              </p>
              <p className="text-xs text-muted-foreground">
                Started {new Date(activeSession.started_at).toLocaleString()} &middot; {countedCells}/{totalCells} items counted
              </p>
              {isScopedToRelevantItems && (
                <p className="text-xs text-accent">
                  Showing items already tracked at this location.{" "}
                  <button onClick={() => setShowAllItems(true)} className="underline">
                    Show all items
                  </button>
                </p>
              )}
              {showAllItems && activeSession.location_id && (
                <p className="text-xs text-muted-foreground">
                  Showing every item.{" "}
                  <button onClick={() => setShowAllItems(false)} className="underline">
                    Show relevant items only
                  </button>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
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
              <button
                onClick={finishSession}
                className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
              >
                Finish Stock Take
              </button>
            </div>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${totalCells === 0 ? 0 : (countedCells / totalCells) * 100}%` }}
            />
          </div>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {visibleItems.map((item) => (
              <div key={item.id} className="rounded-xl bg-surface-muted p-3">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {item.name} <span className="text-xs font-normal text-muted-foreground">({item.unit})</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {targetLocations.map((location) => {
                    const key = `${item.id}::${location.id}`;
                    const logged = sessionEntryKeys.has(key);
                    const skipped = skippedKeys.has(key);
                    const prevQty = latestQuantityExcludingSession(item.id, location.id, activeSessionId);
                    return (
                      <div
                        key={location.id}
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${
                          logged
                            ? "border-success/30 bg-success-soft"
                            : skipped
                              ? "border-border bg-surface opacity-60"
                              : "border-border bg-surface"
                        }`}
                      >
                        {targetLocations.length > 1 && (
                          <span className="text-xs text-muted-foreground">{location.name}:</span>
                        )}
                        <button
                          onClick={() => step(item.id, location.id, -1)}
                          className="rounded px-1.5 text-sm text-muted-foreground hover:bg-surface-muted"
                          aria-label="Decrease"
                        >
                          &minus;
                        </button>
                        <input
                          type="number"
                          value={draft[key] ?? ""}
                          placeholder={prevQty !== null ? String(prevQty) : "0"}
                          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                          onBlur={(e) => commitQuantity(item.id, location.id, e.target.value)}
                          className="w-14 border-0 bg-transparent text-center text-sm text-foreground focus:outline-none"
                        />
                        <button
                          onClick={() => step(item.id, location.id, 1)}
                          className="rounded px-1.5 text-sm text-muted-foreground hover:bg-surface-muted"
                          aria-label="Increase"
                        >
                          +
                        </button>
                        {prevQty !== null && (
                          <button
                            onClick={() => quickFillLastTime(item.id, location.id)}
                            className="text-xs text-accent hover:underline"
                            title={`Same as last time (${prevQty})`}
                          >
                            ↺
                          </button>
                        )}
                        <button
                          onClick={() => toggleSkip(item.id, location.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {skipped ? "Unskip" : "Skip"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">All Sessions</p>
          <select
            value={historyLocationFilter}
            onChange={(e) => setHistoryLocationFilter(e.target.value)}
            className="input-field py-1 text-xs"
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        {historySessions.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            No stock take sessions yet.
          </div>
        ) : (
          <ul className="card divide-y divide-border">
            {historySessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-foreground">
                    {session.location_id ? locationName(session.location_id) : "All Locations"}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.started_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      session.completed_at ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                    }`}
                  >
                    {session.completed_at ? "Completed" : "In progress"}
                  </span>
                  <button onClick={() => toggleView(session.id)} className="btn-secondary">
                    {viewingSessionId === session.id ? "Hide" : "View"}
                  </button>
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

        {viewingSession && (
          <div className="card mt-3 p-4">
            <p className="eyebrow mb-2">
              Entries logged &mdash;{" "}
              {viewingSession.location_id ? locationName(viewingSession.location_id) : "All Locations"}
            </p>
            {viewingLoading ? (
              <p className="text-sm text-muted-foreground">Loading entries...</p>
            ) : viewingEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries logged in this session.</p>
            ) : (
              <ul className="divide-y divide-border">
                {viewingEntries.map((entry) => (
                  <li key={entry.id} className="flex justify-between py-2 text-sm">
                    <span className="text-foreground">
                      {itemName(entry.item_id)} <span className="text-muted-foreground">at {locationName(entry.location_id)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {entry.quantity} {entry.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
