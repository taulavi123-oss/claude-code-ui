// The ASCII wallpaper behind a session, ported from Claudie 1.1.3 (MIT):
// every theme draws vector subjects into a supersampled layer, the engine
// averages each cell and paints it as a tile with a glyph. Koi swim, turtles
// paddle, jellyfish drift, the moon hangs over moving clouds.
import { useEffect, useRef } from "react";
import { type ChatThemeId } from "./chat-theme.ts";
import { Renderer, THEMES } from "./wallpapers/engine.ts";
import { THEME_ID } from "./wallpapers/theme-map.ts";

/** What the pointer must not disturb: the app's own controls. */
const UI = 'button, a, input, textarea, select, [role="dialog"], [data-testid="prompt-box"], [data-testid="sidebar"], [data-testid="theme-picker"]';

export function ChatWallpaper({ theme, className = "" }: { theme: ChatThemeId; className?: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el || theme === "none" || import.meta.env.MODE === "test") return;
    const spec = THEMES.find((t: { id: string }) => t.id === THEME_ID[theme]);
    if (!spec) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const renderer = Renderer(el, { cw: 14, ch: 20, ss: 3 });
    let raf = 0;
    let t = 0;
    let last = performance.now();
    let raw: { x: number; y: number } | null = null;
    let mouse: { x: number; y: number; vx: number; vy: number; speed: number } | null = null;
    let wakeAt: { x: number; y: number } | null = null;

    const resize = () => {
      const box = el.parentElement?.getBoundingClientRect();
      const w = Math.max(320, Math.floor(box?.width ?? window.innerWidth));
      const h = Math.max(320, Math.floor(box?.height ?? window.innerHeight));
      renderer.dpr = Math.min(1.5, devicePixelRatio || 1);
      renderer.resize(w, h);
      if (reduced) renderer.frame(spec, 6, 0.016, null);
    };

    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      raw = { x: e.clientX - box.left, y: e.clientY - box.top };
    };
    const onLeave = () => {
      raw = null;
    };

    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (ms - last < 1000 / 30 - 4) return;
      const dt = Math.min(0.05, (ms - last) / 1000);
      last = ms;
      t += dt;

      if (raw) {
        if (!mouse) mouse = { x: raw.x, y: raw.y, vx: 0, vy: 0, speed: 0 };
        const nx = mouse.x + (raw.x - mouse.x) * Math.min(1, dt * 14);
        const ny = mouse.y + (raw.y - mouse.y) * Math.min(1, dt * 14);
        const vx = (nx - mouse.x) / (dt || 0.016);
        const vy = (ny - mouse.y) / (dt || 0.016);
        mouse = { x: nx, y: ny, vx, vy, speed: mouse.speed + (Math.hypot(vx, vy) - mouse.speed) * Math.min(1, dt * 8) };
      } else {
        mouse = null;
      }

      // Water themes leave a ring behind a fast pointer, like a hand in the pond.
      if (mouse && spec.wake && mouse.speed > 160 && (!wakeAt || Math.hypot(mouse.x - wakeAt.x, mouse.y - wakeAt.y) > 90)) {
        wakeAt = { x: mouse.x, y: mouse.y };
        renderer.add({ kind: "ripple", x: mouse.x, y: mouse.y, t, life: 1.1, speed: 140, force: 160, alpha: 0.45 });
      }

      renderer.frame(spec, t, dt, mouse);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(UI)) return;
      if (typeof spec.click === "function") spec.click(e.clientX, e.clientY, t, renderer);
    };

    resize();
    if (!reduced) raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("mousedown", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("mousedown", onClick);
    };
  }, [theme]);

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
