// The ASCII wallpaper behind a session: a character grid animated in the style
// of Claudie's ambient fields (MIT). One canvas, one rAF loop, paused on hidden
// tabs and replaced by a single still frame under reduced motion.
import { useEffect, useRef } from "react";
import { chatThemeOf, type ChatThemeId } from "./chat-theme.ts";

const CELL_W = 13;
const CELL_H = 17;
/** 30 fps: the fields drift slowly, so half the frames are invisible. */
const FRAME_MS = 1000 / 30;
const TAU = Math.PI * 2;

/** Deterministic noise: a seed paints the same field on every load. */
const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Subjects painted on top of the field: the turtle of Honu Lagoon and the koi. */
const TURTLE = [
  '    .--.',
  "  .'  ____  '.",
  " /  .'    '.  \\",
  "|  (  o  o  )  |",
  " \\  '.____.'  /",
  "  '.________.'",
];

const KOI = [
  "  __  ",
  " /  \\_",
  "| o  _>",
  " \\__/",
];

/** Paints one ASCII sprite, clipped to the canvas; returns its box for hit tests. */
const sprite = (
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  scale: number,
  ink: string,
  alpha = 1,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ink;
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch === " ") return;
      ctx.fillText(ch, x + i * CELL_W * scale, y + j * CELL_H * scale);
    });
  });
  ctx.restore();
};

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function ChatWallpaper({ theme, className = "" }: { theme: ChatThemeId; className?: string }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = canvas.current;
    const spec = chatThemeOf(theme);
    if (!el || theme === "none") return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let t = 0;
    const still = reduced();
    const glyphs = [...spec.chars];
    // Per-cell randomness, so density never crawls between frames.
    let noise: number[] = [];

    const resize = () => {
      const box = el.parentElement?.getBoundingClientRect();
      width = Math.max(320, Math.floor(box?.width ?? window.innerWidth));
      height = Math.max(320, Math.floor(box?.height ?? window.innerHeight));
      // 1.5x is enough for soft characters, and a third fewer pixels than 2x
      // on a phone, where this canvas shares the CPU with the transcript.
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      el.width = Math.floor(width * dpr);
      el.height = Math.floor(height * dpr);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      cols = Math.ceil(width / CELL_W);
      rows = Math.ceil(height / CELL_H);
      const r = rand(1337);
      noise = Array.from({ length: cols * rows }, r);
      const scale = el.width / width;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "top";
    };

    const background = () => {
      const g = ctx.createLinearGradient(0, 0, 0, height);
      const stops = spec.stops.length ? spec.stops : ["#000", "#000"];
      stops.forEach((c, i) => g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      // A faint grid, as the wallpapers draw one under the characters.
      if (spec.grid) {
        ctx.strokeStyle = spec.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += CELL_W) {
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, height);
        }
        for (let y = 0; y < height; y += CELL_H) {
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(width, y + 0.5);
        }
        ctx.stroke();
      }
    };

    /** Density 0..1 of one cell: what decides whether and how bright it draws. */
    const density = (i: number, j: number) => {
      const n = noise[j * cols + i] ?? 0.5;
      const x = i * CELL_W;
      const y = j * CELL_H;
      const slow = t * 0.13 * (0.5 + spec.motion);

      switch (spec.kind) {
        case "pulse":
          // Embers rising: vertical fall-off plus a breathing core.
          return (0.55 + 0.45 * Math.sin(n * TAU + slow * 2)) * (1 - (y / height) * 0.6);
        case "drift": {
          // Clouds: broad bands sliding sideways.
          const band = Math.sin(y * 0.008 + slow) * 0.5 + 0.5;
          return band * (0.5 + 0.5 * Math.sin(x * 0.004 - slow * 2 + n * 6));
        }
        case "flow": {
          // Lagoon: the three-wave interference the wallpaper uses.
          const v =
            Math.sin(x * 0.011 + y * 0.004 + slow * 2 + 1.6 * Math.sin(y * 0.007 - slow * 3)) +
            Math.sin(-x * 0.006 + y * 0.012 - slow * 3 + 1.6 * Math.sin(x * 0.008 + slow * 2)) +
            Math.sin(x * 0.009 - y * 0.009 + slow * 4);
          return Math.max(0, Math.min(1, (v - 0.9) / 2.1));
        }
        case "pond": {
          // Bubbles: a few cells pulse on their own cycle.
          const b = (Math.sin(t * 1.1 + n * 20) + 1) / 2;
          return b > 0.72 ? (b - 0.72) / 0.28 : 0;
        }
        case "fall":
          // Jellyfish: characters drift downward, brightest at the top.
          return (0.5 + 0.5 * Math.sin(n * TAU + slow * 3)) * (0.35 + 0.65 * (y / height));
        case "ripple": {
          // Paper boats: a travelling wave across the surface.
          const v = Math.sin(i * 0.35 - slow * 6 + Math.sin(j * 0.6 + slow * 2) * 1.5) + Math.sin(j * 0.9 + slow * 1.5);
          return Math.max(0, Math.min(1, (v - 1.0) / 1.4));
        }
        case "swarm": {
          // Fireflies: sparse blinking points.
          const b = Math.sin(t * (0.7 + n * 0.8) + n * 40) * 1.4 - 0.9;
          return b > 0 ? Math.min(1, b) : 0;
        }
        case "stars": {
          // Moonlit: stars twinkle, denser toward the top.
          const b = (Math.sin(t * (0.8 + n * 2) + n * 30) + 1) / 2;
          return b * (1 - (y / height) * 0.55);
        }
        default:
          return 0;
      }
    };

    const paint = () => {
      background();

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const d = density(i, j);
          if (d < 0.16) continue;
          const step = Math.min(spec.ink.length - 1, Math.floor(d * spec.ink.length));
          ctx.fillStyle = spec.ink[step] ?? spec.ink[0]!;
          const glyph = glyphs[Math.floor(((i * 7 + j * 13) % glyphs.length + d * glyphs.length) % glyphs.length)] ?? glyphs[0];
          ctx.fillText(glyph!, i * CELL_W, j * CELL_H);
        }
      }

      // Subjects: the wallpaper's living things, painted in the same cells.
      if (spec.kind === "flow") {
        const cx = width * 0.5 + Math.sin(t * 0.12) * width * 0.22;
        const cy = height * 0.5 + Math.cos(t * 0.09) * height * 0.16;
        sprite(ctx, TURTLE, cx, cy, 1.4, spec.ink[spec.ink.length - 1]!, 0.55);
        sprite(ctx, TURTLE, width * 0.2 + Math.sin(t * 0.07 + 2) * 60, height * 0.74, 0.8, spec.ink[2]!, 0.35);
      } else if (spec.kind === "pond") {
        for (let k = 0; k < 2; k++) {
          const phase = t * (0.22 + k * 0.07) + k * 2.1;
          const cx = width * (0.5 + 0.3 * Math.cos(phase));
          const cy = height * (0.5 + 0.26 * Math.sin(phase * 1.3));
          sprite(ctx, KOI, cx, cy, 1.15 - k * 0.2, spec.ink[spec.ink.length - 1]!, 0.5);
        }
      }
    };

    const frame = () => {
      t += 0.016;
      paint();
      raf = window.setTimeout(() => {
        raf = requestAnimationFrame(frame);
      }, FRAME_MS) as unknown as number;
    };

    const start = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(raf);
      if (still) paint();
      else frame();
    };

    const onVisibility = () => (document.hidden ? (cancelAnimationFrame(raf), window.clearTimeout(raf)) : start());
    const onResize = () => (resize(), start());

    resize();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
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
