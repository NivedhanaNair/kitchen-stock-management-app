"use client";

import { useState } from "react";
import Header from "@/components/Header";
import ItemManager from "@/components/ItemManager";
import StockOverview from "@/components/StockOverview";
import StockTaker from "@/components/StockTaker";
import Dashboard from "@/components/Dashboard";
import ShoppingList from "@/components/ShoppingList";
import SettingsPage from "@/components/SettingsPage";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "stock", label: "Stock" },
  { key: "items", label: "Items" },
  { key: "stock-take", label: "Stock Take" },
  { key: "shopping-list", label: "Shopping List" },
  { key: "settings", label: "Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [thresholdFocusItemId, setThresholdFocusItemId] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <nav className="mb-8 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface-muted p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "items" && (
          <ItemManager
            onManageThresholds={(itemId) => {
              setThresholdFocusItemId(itemId);
              setActiveTab("settings");
            }}
          />
        )}
        {activeTab === "stock" && <StockOverview />}
        {activeTab === "stock-take" && <StockTaker />}
        {activeTab === "shopping-list" && <ShoppingList />}
        {activeTab === "settings" && <SettingsPage focusItemId={thresholdFocusItemId} />}
      </main>
    </div>
  );
}
