// Prompt box toolbar (OpenCode prompt input v2): attach, model, effort, permission mode; context meter, send / stop on the right.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpIcon, BrainIcon, FilePenIcon, ListPlusIcon, ListTodoIcon, LoaderCircleIcon, MessageCircleQuestionIcon, PlusIcon, ShieldAlertIcon, ShieldBanIcon, ShieldCheckIcon, ShieldIcon, SquareIcon, WifiOffIcon } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { keyText } from "./shortcuts.ts";
import type { SendMode } from "./send-mode.ts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ContextUsage, Effort, ModelInfo, PermissionMode } from "@claude-ui/protocol";
import { usePhone } from "./lib/use-narrow.ts";
import { ContextMeter } from "./context-meter.tsx";
import type { Totals } from "./status-bar.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Claude Code's names for the modes; `short` fits the toolbar on a phone. */
export const MODE_LABEL: Record<PermissionMode, { label: string; short: string; Icon: typeof ShieldIcon }> = {
  default: { label: "Build", short: "Build", Icon: ShieldCheckIcon },
  acceptEdits: { label: "Build", short: "Build", Icon: ShieldCheckIcon },
  plan: { label: "Plan", short: "Plan", Icon: ListTodoIcon },
  bypassPermissions: { label: "Build", short: "Build", Icon: ShieldCheckIcon },
  auto: { label: "Auto", short: "Auto", Icon: ShieldCheckIcon },
  dontAsk: { label: "Auto", short: "Auto", Icon: ShieldCheckIcon },
};

export const EFFORT_LABEL: Record<Effort, string> = { default: "Default", low: "Low", medium: "Medium", high: "High", xhigh: "Extra high", max: "Max" };

/** Shift+Tab: the next mode in Claude Code's order, wrapping around. Don't ask is only chosen from the picker: a silently denying mode must not be entered by accident. */
export const nextMode = (modes: PermissionMode[], mode: PermissionMode) => {
  const order: SimpleMode[] = (["build", "plan", "auto"] as SimpleMode[]).filter(
    (m) => m === "build" || modes.includes(m === "plan" ? "plan" : "auto"),
  );
  const at = order.indexOf(simpleOf(mode));
  return simpleTarget(order[(at + 1) % order.length]!, modes);
};

/** "Default (recommended)" -> "Default model": the picker label on a phone, where the toolbar has no room for the note. Only that note goes; one that names the model (a context size) stays. "Default" alone would read like the effort chooser beside it. */
export const shortModel = (name: string) => {
  const short = name.replace(/\s*\(recommended\)\s*$/i, "") || name;
  return short === "Default" ? "Default model" : short;
};

/** The model's effort levels plus "default"; none when the model does not support effort (the chooser is hidden). */
export function effortOptions(models: ModelInfo[], model: string): Effort[] {
  const m = models.find((x) => x.value === model);
  return m?.supportsEffort && m.supportedEffortLevels?.length ? ["default", ...m.supportedEffortLevels] : [];
}

// OpenCode ghost-muted ButtonV2: 28px (44px on touch screens), padding 0 11px, 13px/20px weight 440, focus outline 2px offset 2px.
// Focus outline uses --info (3:1 on every surface; OpenCode's #7698fd is 2.8:1 on white). `!`: SelectTrigger's data-[size] height has higher specificity.
const FOCUS = "outline-none focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-info";
export const GHOST = `h-7! cursor-pointer gap-1.5 rounded-md border-0 bg-transparent px-[11px] text-muted-foreground text-sm font-normal tracking-[-0.04px] hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground pointer-coarse:h-11! dark:bg-transparent ${FOCUS}`;

/** Rich popup row (project, tab): 28px, 44px on touch; grows with a second line of text. */
export const ROW = "min-h-7 cursor-pointer gap-2 rounded-sm py-1 pr-8 pl-3 font-normal pointer-coarse:min-h-11 data-[selected]:font-medium";

export function Chooser<T extends string>({
  label,
  value,
  items,
  onChange,
  icon,
  testId,
  className = "",
  reapply = false,
}: {
  label: string;
  value: T;
  items: { value: T; label: string; trigger?: ReactNode; description?: string }[];
  onChange: (v: T) => void;
  icon?: ReactNode;
  testId: string;
  className?: string;
  /** Fire onChange for the item already shown: one label can stand for more than one wire value. */
  reapply?: boolean;
}) {
  const current = items.find((i) => i.value === value);
  // The name starts with the visible text (WCAG 2.5.3 Label in Name), then says what the control sets.
  const visible = typeof current?.trigger === "string" ? current.trigger : (current?.label ?? value);
  // Typeahead on a closed trigger commits with reason "none", like the reset below; it is told apart by the key press
  // on the trigger in the same task (Base UI matches synchronously in its keydown handler).
  const typed = useRef(false);
  return (
    // Only the user's pick or typeahead: when the items change and drop the value for a render, Base UI resets to the value
    // the picker mounted with (reason "none", no key), e.g. Don't ask after a model switch left Auto mode (GH-46).
    <Select
      items={items}
      value={value}
      onValueChange={(v, { reason }) => (reason === "item-press" || (reason === "none" && typed.current)) && v !== null && (reapply || v !== value) && onChange(v as T)}
    >
      <SelectTrigger
        onKeyDownCapture={(e) => {
          if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
          typed.current = true;
          setTimeout(() => (typed.current = false));
        }}
        aria-label={`${visible}, ${label}`} title={`${label}: ${current?.label ?? value}`} data-testid={testId} className={`${GHOST} min-w-0 ${className}`}>
        {icon}
        <SelectValue className="truncate">{(v: T) => items.find((i) => i.value === v)?.trigger ?? items.find((i) => i.value === v)?.label ?? v}</SelectValue>
      </SelectTrigger>
      {/* OpenCode menu-v2: 2px padding, radius 6; item 28px (44px on touch), padding 0 12px, radius 4; selected item weight 530 in the accent colour.
          `data-[selected]`: Base UI sets data-selected="", shadcn's data-selected: variant needs "true". */}
      <SelectContent alignItemWithTrigger={false} side="top" align="start" className="w-auto min-w-44 rounded-md p-0.5 shadow-floating! ring-0">
        {items.map((i) => (
          <SelectItem
            key={i.value}
            value={i.value}
            title={i.description}
            className="h-7 cursor-pointer gap-2 rounded-sm py-0 pr-8 pl-3 font-normal pointer-coarse:h-11 data-[selected]:font-medium data-[selected]:**:text-info!"
          >
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Permission mode chooser: in the prompt toolbar and in the tray of the permission and question panels (GH-145). */
/** The three working modes the composer offers: Build, Plan, Auto. */
export const SIMPLE_MODES = [
  { value: "build", label: "Build" },
  { value: "plan", label: "Plan" },
  { value: "auto", label: "Auto" },
] as const;

export type SimpleMode = (typeof SIMPLE_MODES)[number]["value"];

export const simpleOf = (mode: PermissionMode): SimpleMode =>
  mode === "plan" ? "plan" : mode === "auto" ? "auto" : "build";

export const simpleTarget = (value: SimpleMode, modes: PermissionMode[]): PermissionMode =>
  value === "build"
    ? modes.includes("bypassPermissions")
      ? "bypassPermissions"
      : modes.includes("acceptEdits")
        ? "acceptEdits"
        : "default"
    : value === "plan"
      ? modes.includes("plan")
        ? "plan"
        : "default"
      : modes.includes("auto")
        ? "auto"
        : "default";

export function SimpleModePicker({ mode, modes, onMode, className = "shrink-0" }: { mode: PermissionMode; modes: PermissionMode[]; onMode: (mode: PermissionMode) => void; className?: string }) {
  const items = SIMPLE_MODES.filter((m) => m.value !== "auto" || modes.includes("auto")).map((m) => ({ value: m.value, label: m.label }));
  // `reapply`: the chip reads Build for acceptEdits/default too, so picking Build again
  // must still send bypassPermissions; the plain value comparison would drop it.
  return <Chooser label="Mode" testId="mode-select" value={simpleOf(mode)} onChange={(v) => onMode(simpleTarget(v, modes))} items={items} className={className} reapply />;
}

export function ModePicker({ mode, modes, onMode, className = "shrink-0" }: { mode: PermissionMode; modes: PermissionMode[]; onMode: (mode: PermissionMode) => void; className?: string; shortcut?: boolean; short?: boolean }) {
  return <SimpleModePicker mode={mode} modes={modes} onMode={onMode} className={className} />;
}

export function PromptToolbar(props: {
  models: ModelInfo[];
  model: string;
  onModel: (model: string) => void;
  effort: Effort;
  onEffort: (effort: Effort) => void;
  mode: PermissionMode;
  modes: PermissionMode[];
  onMode: (mode: PermissionMode) => void;
  onAttach: (files: File[]) => void;
  /** Agents button (session view), after the choosers. */
  agents?: ReactNode;
  /** Context window meter left of send; hidden until the session reports its usage. */
  usage?: ContextUsage;
  /** Session token totals for the context breakdown. */
  stats?: Totals;
  /** What the send button shows: the session state, or `disconnected` while the daemon is unreachable. */
  state: SendState;
  /** Text or images are in the prompt box: idle it sends, during a turn it steers (or queues, see `sendMode`). */
  hasInput: boolean;
  onSend: () => void;
  /** Given (session view): while a turn runs and the box has input, queues the message (GH-77); the send button does it when `sendMode` is queue. */
  onQueue?: () => void;
  /** What Enter and the send button do while a turn runs and `onQueue` is given: the Sending setting. */
  sendMode?: SendMode;
  /** Bash mode: the send button queues a shell command (no steer). */
  shell?: boolean;
  onStop: () => void;
  /** The focused send button became disabled (stopped or sent from the keyboard, disconnected): focus goes back to the prompt box. */
  onFocusLost: () => void;
  /** Meta row under the one-line composer: mode/model/context, no attach or send. */
  metaOnly?: boolean;
}) {
  const file = useRef<HTMLInputElement>(null);
  // Keep the current value selectable while the list loads or if it is not in the list.
  const models = props.models.some((m) => m.value === props.model) ? props.models : [{ value: props.model, displayName: props.model, description: "" }, ...props.models];
  const efforts = effortOptions(props.models, props.model);
  const phone = usePhone();
  const effort = efforts.includes(props.effort) ? props.effort : "default";
  const modelItems = models.map((m) => ({
    value: m.value,
    label: m.displayName,
    description: m.description,
    trigger:
      props.metaOnly ? (
        <span>{shortModel(m.displayName)}</span>
      ) : shortModel(m.displayName) === m.displayName ? undefined : (
        <span>
          <span className="sm:hidden">{shortModel(m.displayName)}</span>
          <span className="max-sm:hidden">{m.displayName}</span>
        </span>
      ),
  }));
  return (
    // Phone (below sm): one row, attach, settings chip, agents, then the context ring and send on the right (GH-166).
    <div className="@container flex items-end gap-1 px-1 pt-1 text-white/70 pointer-coarse:gap-2 pointer-coarse:py-1" data-testid="prompt-toolbar">
      {/* flex-wrap: on a narrow screen a chooser moves to the next row at its full width; nothing shrinks away the model name. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 pointer-coarse:gap-2 max-sm:flex-nowrap">
        {!props.metaOnly && (
          <>
            <button
              type="button"
              aria-label="Add images and files"
              title="Add images and files"
              data-testid="attach"
              className={`${GHOST} flex w-7 shrink-0 items-center justify-center px-0! pointer-coarse:w-11`}
              onClick={() => file.current?.click()}
            >
              <PlusIcon className="size-4" />
            </button>
            {/* No `accept`: any file; on a phone this opens the native picker (camera, photos, files). */}
            <input
              ref={file}
              type="file"
              multiple
              hidden
              data-testid="attach-input"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                if (files.length) props.onAttach(files);
              }}
            />
          </>
        )}
        {phone ? (
          <SettingsChip {...props} models={models} efforts={efforts} effort={effort} modelItems={modelItems} />
        ) : (
          <>
            {props.metaOnly ? (
              <SimpleModePicker mode={props.mode} modes={props.modes} onMode={props.onMode} />
            ) : (
              <ModePicker mode={props.mode} modes={props.modes} onMode={props.onMode} />
            )}
            <Chooser label="Model" testId="session-model" value={props.model} onChange={props.onModel} items={modelItems} className={`max-w-55 ${props.metaOnly ? "ml-auto" : ""}`} />
            {efforts.length > 0 && <EffortPicker efforts={efforts} effort={effort} onEffort={props.onEffort} />}
          </>
        )}
        {!props.metaOnly && props.agents}
      </div>
      <div className="flex items-end gap-1 pointer-coarse:gap-2">
        {props.usage && <ContextMeter usage={props.usage} stats={props.stats} ringOnly={props.metaOnly} />}
        {!props.metaOnly && (
          <SendButton state={props.state} hasInput={props.hasInput} onSend={props.onSend} onQueue={props.onQueue} sendMode={props.sendMode} shell={props.shell} onStop={props.onStop} onFocusLost={props.onFocusLost} />
        )}
      </div>
    </div>
  );
}

function EffortPicker({ efforts, effort, onEffort, className = "shrink-0" }: { efforts: Effort[]; effort: Effort; onEffort: (e: Effort) => void; className?: string }) {
  return <Chooser label="Thinking effort" testId="effort-select" value={effort} onChange={onEffort} icon={<BrainIcon className="size-4" />} items={efforts.map((e) => ({ value: e, label: EFFORT_LABEL[e] }))} className={className} />;
}

/** Phone toolbar (GH-166): mode, model and effort behind one chip, so the toolbar is one row. The chip always shows the permission mode (Plan and Bypass matter for safety); the popover stacks the three choosers. */
function SettingsChip({ models, model, mode, modes, onMode, onModel, onEffort, efforts, effort, modelItems }: {
  models: ModelInfo[]; model: string; mode: PermissionMode; modes: PermissionMode[]; onMode: (m: PermissionMode) => void; onModel: (m: string) => void; onEffort: (e: Effort) => void;
  efforts: Effort[]; effort: Effort; modelItems: { value: string; label: string; description?: string; trigger?: ReactNode }[];
}) {
  const Mode = MODE_LABEL[mode].Icon;
  const name = models.find((m) => m.value === model)?.displayName ?? model;
  const visible = `${MODE_LABEL[mode].short} · ${shortModel(name)}`;
  // The name starts with the visible text (WCAG 2.5.3), then lists every setting the chip opens.
  const label = `${visible}, session settings: ${MODE_LABEL[mode].label}, ${name}${efforts.length ? `, effort ${EFFORT_LABEL[effort]}` : ""}`;
  const wide = "w-full max-w-none justify-start max-sm:h-11!";
  return (
    <Popover.Root>
      <Popover.Trigger aria-label={label} title={label} data-testid="session-settings" className={`${GHOST} flex min-w-0 shrink items-center`}>
        <Mode aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{visible}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={6} className="z-50">
          <Popover.Popup
            data-testid="session-settings-popup"
            aria-label="Session settings"
            className="flex w-64 max-w-[calc(100vw-16px)] origin-(--transform-origin) flex-col gap-1 rounded-xl bg-popover p-1 text-popover-foreground text-sm shadow-floating outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <ModePicker mode={mode} modes={modes} onMode={onMode} shortcut={false} className={wide} />
            <Chooser label="Model" testId="session-model" value={model} onChange={onModel} items={modelItems} className={wide} />
            {efforts.length > 0 && <EffortPicker efforts={efforts} effort={effort} onEffort={onEffort} className={wide} />}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export type SendState = "idle" | "running" | "needs_input" | "disconnected";

const SEND_BASE = `relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-linear-to-b from-white/20 to-transparent shadow-button-contrast ${FOCUS} disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-11 max-md:size-11`;

/** OpenCode send/stop button plus the session state: spinner while running, warning color while Claude waits for an answer. */
/** The tooltip above the send button while the box has input and a turn runs: Enter does the setting's action, Alt+Enter the other (none without a queue). A shell command can only queue. */
export function sendHint({ steer, canQueue, queue, shell }: { steer: boolean; canQueue: boolean; queue: boolean; shell?: boolean }): string {
  if (!steer || !canQueue) return "";
  const alt = keyText("alt+enter");
  const enter = keyText("enter");
  if (shell) return `${enter} queue the command`;
  return queue ? `${enter} queue · ${alt} steer` : `${enter} steer · ${alt} queue`;
}

export function SendButton({ state, hasInput, onSend, onQueue, sendMode = "steer", shell, onStop, onFocusLost }: { state: SendState; hasInput: boolean; onSend: () => void; onQueue?: () => void; sendMode?: SendMode; shell?: boolean; onStop: () => void; onFocusLost: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const disabled = state === "disconnected" || (state === "idle" && !hasInput);
  // Chrome blurs a focused button the moment it is disabled, inside React's commit: React drops the event (native listener) and the
  // prompt box's callback ref is detached until the commit ends (microtask). Firefox and jsdom keep focus on the disabled button (layout effect).
  const lost = useRef(onFocusLost);
  lost.current = onFocusLost;
  useEffect(() => {
    const b = ref.current!;
    const out = (e: FocusEvent) => b.disabled && !e.relatedTarget && queueMicrotask(() => lost.current());
    b.addEventListener("focusout", out);
    return () => b.removeEventListener("focusout", out);
  }, []);
  useLayoutEffect(() => {
    if (disabled && document.activeElement === ref.current) lost.current();
  }, [disabled]);
  const busy = state === "running" || state === "needs_input";
  const steer = busy && hasInput;
  // Steering and queueing are both the "send" while busy; queue only when the box can queue and the setting says so.
  const queue = steer && !!onQueue && sendMode === "queue";
  const verb = queue ? "Queue" : "Steer";
  const [label, key] =
    state === "disconnected"
      ? ["Disconnected from the daemon", ""]
      : state === "idle"
        ? ["Send", " (Enter)"]
        : [`${state === "running" ? "Claude is working" : "Claude needs your input"}. ${steer ? verb : "Stop"}`, steer ? " (Enter)" : " (Esc)"];
  const Icon = state === "disconnected" ? WifiOffIcon : busy && !steer ? SquareIcon : queue ? ListPlusIcon : ArrowUpIcon;
  // The hint above the button: Enter does the setting's mode, Alt+Enter the other (only when the box can queue).
  const hint = sendHint({ steer, canQueue: !!onQueue, queue, shell });
  const button = (
    <button
      type="button"
      aria-label={label}
      title={hint ? undefined : label + key}
      data-state={state}
      data-testid={busy && !steer ? "toolbar-stop" : "send"}
      ref={ref}
      disabled={disabled}
      className={`${SEND_BASE} ${state === "needs_input" ? "bg-warning text-background motion-safe:animate-pulse" : "bg-send text-primary-foreground"}`}
      onClick={queue ? onQueue : steer || state === "idle" ? onSend : onStop}
    >
      {state === "running" && <LoaderCircleIcon aria-hidden className="absolute size-5.5 animate-spin opacity-60 motion-reduce:animate-none pointer-coarse:size-8" />}
      {state === "needs_input" && !steer ? (
        <MessageCircleQuestionIcon aria-hidden className="size-4" />
      ) : (
        <Icon aria-hidden className={Icon === SquareIcon ? "size-2.5 fill-current" : state === "running" ? "size-3" : "size-4"} />
      )}
    </button>
  );
  return (
    <>
    {/* Steering or queueing: the send button is that action, so Stop (Esc, which a phone has not) gets its own button (GH-165). */}
    {steer && (
      <button type="button" aria-label="Stop" title="Stop (Esc)" data-testid="toolbar-stop" className={`${SEND_BASE} bg-secondary text-secondary-foreground`} onClick={onStop}>
        <SquareIcon aria-hidden className="size-2.5 fill-current" />
      </button>
    )}
    {/* One tree whether or not there is a hint: the button must stay mounted (its focus handling holds the element). */}
    <TooltipProvider>
      <Tooltip disabled={!hint}>
        <TooltipTrigger render={button} />
        <TooltipContent side="top" data-testid="send-hint">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    </>
  );
}
