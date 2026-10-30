// The pet: Clawd, drawn from the pixel map Claude Code uses for its start-up
// glyph (see Claudie's clawd-arte.js, MIT). Body, eyes, arms and legs are
// separate parts so he can blink, look around and raise an arm.
import { useEffect, useState } from "react";

const GLYPHS = [" ▐▛███▜▌", "▝▜█████▛▘", "  ▘▘ ▝▝"];
const QUADRANTS: Record<string, [number, number, number, number]> = {
  " ": [0, 0, 0, 0],
  "█": [1, 1, 1, 1],
  "▐": [0, 1, 0, 1],
  "▌": [1, 0, 1, 0],
  "▛": [1, 1, 1, 0],
  "▜": [1, 1, 0, 1],
  "▝": [0, 1, 0, 0],
  "▘": [1, 0, 0, 0],
};

const PIXELS: [number, number][] = (() => {
  const out: [number, number][] = [];
  GLYPHS.forEach((line, row) =>
    [...line].forEach((ch, col) => {
      const q = QUADRANTS[ch] ?? QUADRANTS[" "]!;
      q.forEach((on, k) => on && out.push([col * 2 + (k & 1), row * 2 + (k >> 1)]));
    }),
  );
  const minX = Math.min(...out.map((p) => p[0]));
  const minY = Math.min(...out.map((p) => p[1]));
  return out.map(([x, y]) => [x - minX, y - minY] as [number, number]);
})();

const W = 16;
const H = 5;

export function ClaudePet({ size = 46, busy = false }: { size?: number; busy?: boolean }) {
  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const loop = () => {
      if (!alive) return;
      setBlink(true);
      window.setTimeout(() => alive && setBlink(false), 130);
      timer = window.setTimeout(loop, 2400 + Math.random() * 3600);
    };
    timer = window.setTimeout(loop, 2000);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!busy) return setLook(0);
    let alive = true;
    const loop = () => {
      if (!alive) return;
      setLook((n) => (n === 0 ? 1 : n === 1 ? -1 : 0));
      timer = window.setTimeout(loop, 420);
    };
    let timer = window.setTimeout(loop, 420);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [busy]);

  const cell = size / W;

  return (
    <svg
      aria-hidden
      data-testid="claude-pet"
      data-busy={busy ? "1" : "0"}
      width={W * cell}
      height={H * cell}
      viewBox={`0 0 ${W} ${H}`}
      className={`pointer-events-none select-none drop-shadow-sm ${busy ? "animate-pulse motion-reduce:animate-none" : ""}`}
      style={{ color: "var(--color-primary, #d97757)" }}
    >
      <g fill="currentColor">
        {PIXELS.map(([x, y], i) => {
          // The two eye cells are cut out again below, so he looks around.
          const eye = (x === 4 || x === 11) && y === 1;
          if (eye) return null;
          return <rect key={i} x={x} y={y} width={1.04} height={1.04} />;
        })}
      </g>
      {!blink &&
        [
          [4, 1],
          [11, 1],
        ].map(([x, y]) => (
          <rect key={`e${x}`} x={x + look * 0.4} y={y} width={0.9} height={0.9} fill="var(--background, #0b0908)" />
        ))}
      {blink && (
        <>
          <rect x={4} y={1.4} width={1} height={0.2} fill="var(--background, #0b0908)" />
          <rect x={11} y={1.4} width={1} height={0.2} fill="var(--background, #0b0908)" />
        </>
      )}
    </svg>
  );
}
