// The floating rail on the right of the conversation: new session, changes,
// and a live count. Decoration stays out of the way on small screens.
import { MessageCircleIcon, PlusIcon, HeartIcon } from "lucide-react";

export function RightRail({
  onNew,
  onChanges,
  changes,
  sessions,
}: {
  onNew: () => void;
  onChanges: () => void;
  changes: number;
  sessions: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-2 z-20 hidden flex-col items-center justify-center gap-3 lg:flex" data-testid="right-rail">
      <button
        type="button"
        onClick={onNew}
        aria-label="Sessions"
        title="Sessions"
        className="pointer-events-auto grid size-12 cursor-pointer place-items-center rounded-full border border-white/15 bg-card/70 text-foreground shadow-floating backdrop-blur transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="rail-new"
      >
        <MessageCircleIcon className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onChanges}
        aria-label={`Changes (${changes})`}
        title={`Changes (${changes})`}
        className="pointer-events-auto relative grid size-12 cursor-pointer place-items-center rounded-full border border-white/15 bg-card/70 text-foreground shadow-floating backdrop-blur transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="rail-changes"
      >
        <HeartIcon className="size-5" aria-hidden />
        {changes > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground tabular-nums">
            {changes}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onNew}
        aria-label="New session"
        title="New session"
        className="pointer-events-auto grid size-12 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-floating transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="rail-add"
      >
        <PlusIcon className="size-6" aria-hidden />
      </button>
      <div className="mt-1 flex flex-col items-center gap-1" data-testid="rail-count">
        <span className="size-9 rounded-full bg-gradient-to-br from-primary/70 to-primary/30 shadow-inner" aria-hidden />
        <span className="font-semibold text-lg tabular-nums">{sessions.toLocaleString()}</span>
      </div>
    </div>
  );
}
