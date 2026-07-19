"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SideNav from "@/components/SideNav";
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
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? "";

  return (
    <div className="flex min-h-screen flex-col">
      <Header onMenuClick={() => setNavOpen(true)} />
      <SideNav
        tabs={TABS}
        activeTab={activeTab}
        onSelect={(key) => setActiveTab(key as TabKey)}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground sm:mb-6">{activeTabLabel}</h2>

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