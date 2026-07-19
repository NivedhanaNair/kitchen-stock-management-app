import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kitchen Stock Manager",
    short_name: "Stock Manager",
    description: "Track kitchen inventory across locations with reorder alerts and stock take sessions.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#c96442",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
