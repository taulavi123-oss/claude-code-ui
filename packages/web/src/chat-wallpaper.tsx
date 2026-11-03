// The ASCII wallpaper behind a session, ported from Claudie 1.1.3 (MIT):
// every theme draws vector subjects into a supersampled layer, the engine
// averages each cell and paints it as a tile with a glyph. Koi swim, turtles
// paddle, jellyfish drift, the moon hangs over moving clouds.
//
// No pointer interaction: the wallpaper is scenery, not a toy. It runs at
// 25 fps, stops while the tab is hidden, and paints one still frame under
// prefers-reduced-motion.
import { useEffect, useRef } from "react";
import { type ChatThemeId } from "./chat-theme.ts";
import { useWallpaperMotion } from "./wallpaper-motion.ts";
import { Renderer, THEMES } from "./wallpapers/engine.ts";
import { THEME_ID } from "./wallpapers/theme-map.ts";

const FRAME_MS = 1000 / 25;

export function ChatWallpaper({ theme, className = "" }: { theme: ChatThemeId; className?: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const motion = useWallpaperMotion();

  useEffect(() => {
    const el = canvas.current;
    if (!el || theme === "none" || import.meta.env.MODE === "test") return;
    const spec = THEMES.find((t: { id: string }) => t.id === THEME_ID[theme]);
    if (!spec) return;

    const reduced =
      motion === "off" || (motion === "auto" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false));
    const renderer = Renderer(el, { cw: 16, ch: 22, ss: 2 });
    let raf = 0;
    let t = 0;
    let last = performance.now();

    const resize = () => {
      const box = el.parentElement?.getBoundingClientRect();
      const w = Math.max(320, Math.floor(box?.width ?? window.innerWidth));
      const h = Math.max(320, Math.floor(box?.height ?? window.innerHeight));
      renderer.dpr = Math.min(1.25, devicePixelRatio || 1);
      renderer.resize(w, h);
      if (reduced) renderer.frame(spec, 6, 0.016, null);
    };

    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      if (ms - last < FRAME_MS - 4) return;
      const dt = Math.min(0.05, (ms - last) / 1000);
      last = ms;
      t += dt;
      renderer.frame(spec, t, dt, null);
    };

    const start = () => {
      if (reduced || document.hidden || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onResize = () => (resize(), reduced ? undefined : stop(), start());

    resize();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [theme, motion]);

  if (theme === "none") return null;

  return (
    <canvas
      ref={canvas}
      aria-hidden
      data-testid="chat-wallpaper"
      data-theme={theme}
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    />
  );
}
