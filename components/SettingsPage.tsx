import LocationManager from "@/components/LocationManager";
import CategoryManager from "@/components/CategoryManager";
import ThresholdsGrid from "@/components/ThresholdsGrid";

interface SettingsPageProps {
  focusItemId?: string | null;
}

export default function SettingsPage({ focusItemId }: SettingsPageProps) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="section-title mb-1">Per-Location Reorder Thresholds</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Optional. By default, each item uses a single reorder threshold checked against its
          total stock (set on the Items page). Set a threshold here only for items where you want
          each location checked separately instead — once any location has a threshold, that item
          switches to per-location checking everywhere it&apos;s used.
        </p>
        <ThresholdsGrid focusItemId={focusItemId} />
      </section>

      <section>
        <h2 className="section-title mb-3">Locations</h2>
        <LocationManager />
      </section>

      <section>
        <h2 className="section-title mb-3">Categories</h2>
        <CategoryManager />
      </section>
    </div>
  );
}
