import { ImageResponse } from "next/og";

/** Shared "K" mark icon renderer, sized for whichever icon route calls it. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c96442",
          color: "#ffffff",
          fontSize: size * 0.55,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        K
      </div>
    ),
    { width: size, height: size }
  );
}
