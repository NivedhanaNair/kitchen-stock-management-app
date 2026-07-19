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
        <h2 className="section-title mb-3">Reorder Thresholds</h2>
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
