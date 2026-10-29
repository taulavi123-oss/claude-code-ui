// Settings › Permissions: the default permission policy for new sessions.
// ask = Claude Code prompts; auto = bypassPermissions (no prompts); deny = dontAsk
// (refuse anything that would need a prompt). Existing sessions keep their mode.
import type { Settings, SettingsPatch } from "@claude-ui/protocol";

type Props = {
  permissions: Settings["permissions"];
  saving: boolean;
  save: (patch: SettingsPatch, field?: string) => Promise<void>;
  /** False when the daemon was started without --allow-bypass. */
  bypassAvailable?: boolean;
};

const LABELS: Record<Settings["permissions"]["policy"], string> = {
  ask: "Ask",
  auto: "Auto accept",
  deny: "Deny",
};

export function PermissionsSection({ permissions, saving, save, bypassAvailable }: Props) {
  const options: { value: Settings["permissions"]["policy"]; title: string; hint: string }[] = [
    { value: "ask", title: "Ask", hint: "Claude prompts before it edits files or runs commands." },
    {
      value: "auto",
      title: "Auto accept",
      hint: bypassAvailable === false
        ? "Bypass is off on this daemon, so edits are accepted but commands still ask."
        : "No prompts: edits and commands run as bypassPermissions inside this container.",
    },
    { value: "deny", title: "Deny", hint: "Anything that would need a prompt is refused (dontAsk)." },
  ];

  return (
    <section className="flex flex-col gap-3" data-testid="settings-permissions">
      <div role="radiogroup" aria-label="Permission mode" className="flex flex-col gap-2" data-testid="settings-permissions-policy">
        {options.map((option) => {
          const active = permissions.policy === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={saving}
              onClick={() => option.value !== permissions.policy && void save({ permissions: { policy: option.value } })}
              className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 ${active ? "border-primary/60 bg-accent" : "hover:bg-accent/50"}`}
              data-testid={`settings-permissions-${option.value}`}
            >
              <span className={`text-sm ${active ? "font-medium" : ""}`}>{option.title}</span>
              <span className="text-muted-foreground text-xs">{option.hint}</span>
            </button>
          );
        })}
      </div>
      {permissions.policy === "auto" && bypassAvailable === false && (
        <span className="text-xs text-destructive" data-testid="settings-permissions-bypass-off">
          The daemon runs without --allow-bypass, so Auto accept falls back to accepting edits only. Add
          CLAUDE_UI_ALLOW_BYPASS=1 to vip.env and restart the server.
        </span>
      )}
      <label className="flex items-center gap-3 border-t pt-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm">Session limit</span>
          <span className="block text-muted-foreground text-xs">
            Live sessions allowed at once. A 2 GB container wants 1. 0 means no limit.
          </span>
        </span>
        <input
          type="number"
          min={0}
          max={20}
          value={permissions.maxSessions}
          disabled={saving}
          aria-label="Session limit"
          data-testid="settings-permissions-max-sessions"
          className="h-9 w-20 rounded-lg border bg-background px-3 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-11"
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 0 && n <= 20) void save({ permissions: { maxSessions: n } });
          }}
        />
      </label>
      <p className="text-muted-foreground text-xs">
        Applies to new sessions; changing it also updates the sessions that are open.
      </p>
    </section>
  );
}

