// A still frame of a theme, drawn by the same engine as the wallpaper, so the
// /theme strip shows the real subject (koi, moon, jellyfish) instead of a
// gradient swatch.
import { useEffect, useRef } from "react";
import type { ChatThemeId } from "./chat-theme.ts";
import { Renderer, THEMES } from "./wallpapers/engine.ts";
import { THEME_ID } from "./wallpapers/theme-map.ts";

export function ThemePreview({ id, width = 96, height = 48 }: { id: ChatThemeId; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    // jsdom has no 2D canvas: keep the strip readable instead of logging.
    if (!el || id === "none" || import.meta.env.MODE === "test") return;
    const spec = THEMES.find((t: { id: string }) => t.id === THEME_ID[id]);
    if (!spec) return;
    const r = Renderer(el, { cw: 5, ch: 7, ss: 2, dpr: 2, k: Math.min(width, height) / 380 });
    r.resize(width, height);
    r.frame(spec, 7, 0.016, null);
  }, [id, width, height]);

  if (id === "none") return <span aria-hidden className="block size-full bg-[#111]" />;

  return (
    <canvas
      ref={ref}
      aria-hidden
      width={width}
      height={height}
      style={{ width: "100%", height: "100%" }}
      className="block"
      data-testid={`theme-preview-${id}`}
    />
  );
}
