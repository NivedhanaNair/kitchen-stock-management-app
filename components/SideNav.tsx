"use client";

interface Tab {
  key: string;
  label: string;
}

interface SideNavProps {
  tabs: readonly Tab[];
  activeTab: string;
  onSelect: (key: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function SideNav({ tabs, activeTab, onSelect, open, onClose }: SideNavProps) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-surface shadow-xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <span className="text-sm font-semibold text-foreground">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-muted-foreground hover:bg-surface-muted"
          >
            &times;
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                onSelect(tab.key);
                onClose();
              }}
              className={`rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-accent-soft text-accent-soft-foreground"
                  : "text-foreground hover:bg-surface-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}