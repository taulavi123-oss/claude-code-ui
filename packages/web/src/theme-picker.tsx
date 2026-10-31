// The /theme strip above the prompt box: eight wallpaper thumbnails, arrow
// keys to move, Enter applies, Esc closes. Matches Claudie's picker.
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";
import { CHAT_THEMES, type ChatThemeId } from "./chat-theme.ts";

const PICKABLE = CHAT_THEMES.filter((t) => t.id !== "none");

export function ThemePicker({
  current,
  onPick,
  onClose,
}: {
  current: ChatThemeId;
  onPick: (id: ChatThemeId) => void;
  onClose: () => void;
}) {
  const [at, setAt] = useState(() => Math.max(0, PICKABLE.findIndex((t) => t.id === current)));
  const row = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setAt((i) => (i + 1) % PICKABLE.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setAt((i) => (i - 1 + PICKABLE.length) % PICKABLE.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onPick(PICKABLE[at]!.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [at, onPick, onClose]);

  useEffect(() => {
    row.current?.querySelector<HTMLElement>(`[data-theme-id="${PICKABLE[at]!.id}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [at]);

  return (
    <div
      className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-white/15 bg-[#12100f]/95 text-white shadow-floating backdrop-blur"
      data-testid="theme-picker"
    >
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <span className="font-mono text-[13px] text-white/90">/theme</span>
        <span className="text-[13px] text-white/60">ASCII wallpapers</span>
        <span className="ml-auto shrink-0 text-[11px] text-white/40">
          <kbd className="font-sans">↵</kbd> apply · <kbd className="font-sans">esc</kbd> close
        </span>
      </div>
      <div ref={row} className="flex gap-2 overflow-x-auto px-3 pb-2">
        {PICKABLE.map((t, i) => {
          const active = t.id === current;
          return (
            <button
              key={t.id}
              type="button"
              data-theme-id={t.id}
              data-testid={`theme-pick-${t.id}`}
              aria-pressed={active}
              onMouseEnter={() => setAt(i)}
              onClick={() => onPick(t.id)}
              className={`group flex w-[104px] shrink-0 cursor-pointer flex-col gap-1 rounded-lg p-1 text-left outline-none transition-colors ${i === at ? "bg-white/10 ring-1 ring-primary/70" : "hover:bg-white/5"}`}
            >
              <span
                aria-hidden
                className="relative h-12 w-full overflow-hidden rounded-md"
                style={{ background: `linear-gradient(135deg, ${t.stops[0] ?? "#111"}, ${t.stops.at(-1) ?? "#333"})` }}
              >
                <span className="absolute inset-0 opacity-70 [background-image:repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.14)_3px,rgba(255,255,255,0.14)_4px)]" />
              </span>
              <span className="flex items-center gap-1 text-[11px] leading-tight text-white/80">
                <span className="min-w-0 truncate">{t.label}</span>
                {active && <CheckIcon className="size-3 shrink-0" aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
