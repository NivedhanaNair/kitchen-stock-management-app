"use client";

import { useState } from "react";
import Header from "@/components/Header";
import LocationManager from "@/components/LocationManager";
import ItemManager from "@/components/ItemManager";
import StockTaker from "@/components/StockTaker";
import Dashboard from "@/components/Dashboard";

const TABS = [
  { key: "alerts", label: "Alerts" },
  { key: "locations", label: "Locations" },
  { key: "items", label: "Items" },
  { key: "stock-take", label: "Stock Take" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("alerts");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <nav className="mb-8 inline-flex gap-1 rounded-xl border border-border bg-surface-muted p-1">
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

        {activeTab === "alerts" && <Dashboard />}
        {activeTab === "locations" && <LocationManager />}
        {activeTab === "items" && <ItemManager />}
        {activeTab === "stock-take" && <StockTaker />}
      </main>
    </div>
  );
}
