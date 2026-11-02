// Skills manager: every skill of the project with one switch. Off means
// Claude is not offered it and it leaves the command list; the CLI owns the
// state (skills.list / skills.setState), this dialog only flips it.
import { useCallback, useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { SkillRow, SkillsResult, SkillsSetStateResult } from "@claude-ui/protocol";
import type { Request } from "./client.ts";
import { Banner, ConfigDialog } from "./config-dialog.tsx";
import { lockText, NOTICE_SLOW, NOTICE_UNCONFIRMED, skillMeta } from "./skills.ts";

export function SkillsDialog({
  open,
  cwd,
  sessionId,
  changed = 0,
  request,
  onClose,
}: {
  open: boolean;
  cwd: string;
  sessionId?: string;
  changed?: number;
  request: <T>(msg: Request) => Promise<T>;
  onClose: () => void;
}) {
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [saving, setSaving] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [filter, setFilter] = useState("");

  const base = { cwd, ...(sessionId && { sessionId }) };
  const ask = useRef(request);
  ask.current = request;
  const where = useRef(base);
  where.current = base;
  // A slower older answer must not replace a newer one.
  const sent = useRef(0);
  const shown = useRef(0);
  const load = useCallback(async () => {
    const n = ++sent.current;
    try {
      const r = await ask.current<SkillsResult>({ type: "skills.list", ...where.current });
      if (n < shown.current) return;
      shown.current = n;
      setLoadError(undefined);
      setSkills(r.skills);
    } catch (e) {
      if (n < shown.current) return;
      shown.current = n;
      setLoadError((e as Error).message || "Failed to load skills");
    } finally {
      if (n === shown.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSkills([]);
    setLoading(true);
    setSaving(undefined);
    setError(undefined);
    setNotice(undefined);
    setFilter("");
    void load();
  }, [open, cwd, sessionId]);
  useEffect(() => void (open && changed && load()), [changed]);

  const isOn = (s: SkillRow) => s.state !== "off";

  /** One switch: off hides the skill from Claude and from the command list. */
  async function toggle(skill: SkillRow) {
    if (saving) return;
    const state = isOn(skill) ? "off" : "on";
    setError(undefined);
    setNotice(undefined);
    setSaving(skill.name);
    setSkills((all) => all.map((s) => (s.name === skill.name ? { ...s, state } : s)));
    try {
      const r = await request<SkillsSetStateResult>({ type: "skills.setState", ...base, name: skill.name, state, ...(skill.handles && { handles: skill.handles }) });
      setSkills(r.skills);
      if (!r.confirmed) setNotice(NOTICE_UNCONFIRMED);
    } catch (e) {
      if ((e as { code?: string }).code === "cli_timeout") setNotice(NOTICE_SLOW);
      else setError((e as Error).message || "Failed to change the skill state");
      // Back to what the session shows.
      await load();
    } finally {
      setSaving(undefined);
    }
  }

  const q = filter.trim().replace(/^\//, "").toLowerCase();
  const rows = [...skills]
    .filter((s) => !q || [s.displayName, s.name, s.description, s.source].some((t) => t?.toLowerCase().includes(q)))
    .sort((a, b) => a.source.localeCompare(b.source) || a.displayName.localeCompare(b.displayName));

  return (
    <ConfigDialog title="Skills" open={open} onClose={onClose} testId="skills-dialog">
      <label className="relative flex items-center">
        <SearchIcon className="pointer-events-none absolute left-3 size-4 text-faint" aria-hidden />
        <input
          autoFocus
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter skills…"
          aria-label="Filter skills…"
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full rounded-md bg-secondary/60 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground hover:bg-secondary focus-visible:bg-secondary max-md:h-11 max-md:text-base"
          data-testid="skills-filter"
        />
      </label>
      {loadError && <Banner kind="error">Failed to load skills: {loadError}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="warning">{notice}</Banner>}
      {loading && <p className="text-muted-foreground text-sm">Loading skills…</p>}
      {!loading && !rows.length && (
        <p className="py-6 text-center text-muted-foreground text-sm">{skills.length ? "No matching skills." : "No skills in this project."}</p>
      )}
      <div className="flex flex-col gap-px" data-testid="skills-list">
        {rows.map((s) => (
          <div key={s.name} className="flex items-center gap-2 rounded-md px-3 py-1 hover:bg-secondary max-md:min-h-11" data-testid="skills-row">
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[13px]">/{s.displayName}</span>
              <span className="block truncate text-[13px] text-muted-foreground">{skillMeta(s)}</span>
            </div>
            {s.lockedBy ? (
              <span
                className="mr-1 shrink-0 text-[13px] text-muted-foreground"
                title={lockText(s.lockedBy)}
                aria-label={`${s.displayName}: ${isOn(s) ? "On" : "Off"}, locked. ${lockText(s.lockedBy)}`}
                data-testid="skills-lock"
              >
                {isOn(s) ? "On" : "Off"} · locked
              </span>
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={isOn(s)}
                aria-label={`${s.displayName}: ${isOn(s) ? "On" : "Off"}`}
                title={isOn(s) ? "Claude can use this skill. Click to turn it off." : "Claude cannot use this skill. Click to turn it on."}
                disabled={!!saving}
                onClick={() => void toggle(s)}
                className={`flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full px-1 text-[12px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 max-md:h-11 max-md:w-16 ${isOn(s) ? "justify-end bg-primary text-primary-foreground" : "justify-start bg-secondary text-muted-foreground"}`}
                data-testid="skills-state"
              >
                <span className="rounded-full bg-background/90 px-1.5 py-0.5 leading-none">{saving === s.name ? "…" : isOn(s) ? "On" : "Off"}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </ConfigDialog>
  );
}
