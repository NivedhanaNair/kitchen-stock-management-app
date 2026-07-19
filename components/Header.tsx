export default function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white">
            K
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Kitchen Stock Manager
          </h1>
        </div>
        <span className="badge bg-accent-soft text-accent-soft-foreground">Sandbox mode</span>
      </div>
    </header>
  );
}
