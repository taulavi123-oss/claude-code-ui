// Settings › Permissions: the default permission policy for new sessions.
// ask = Claude Code prompts; auto = bypassPermissions (no prompts); deny = dontAsk
// (refuse anything that would need a prompt). Existing sessions keep their mode.
import type { Settings, SettingsPatch } from "@claude-ui/protocol";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  return (
    <section className="flex flex-col gap-2" data-testid="settings-permissions">
      <p className="text-sm text-muted-foreground">
        Default for new sessions. Ask prompts before edits and commands. Auto accept runs edits and commands without asking
        (bypassPermissions) — only inside this container. Deny refuses anything that would need a prompt (dontAsk).
      </p>
      <label className="flex flex-col gap-1 border-t py-2">
        <span className="text-sm">Permission mode</span>
        <Select
          value={permissions.policy}
          onValueChange={(v) => v && void save({ permissions: { policy: v as Settings["permissions"]["policy"] } })}
        >
          <SelectTrigger aria-label="Permission mode" data-testid="settings-permissions-policy" className="w-full max-md:h-11" disabled={saving}>
            <SelectValue>{(v: Settings["permissions"]["policy"]) => LABELS[v]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ask">Ask</SelectItem>
            <SelectItem value="auto">Auto accept</SelectItem>
            <SelectItem value="deny">Deny</SelectItem>
          </SelectContent>
        </Select>
        {permissions.policy === "auto" && bypassAvailable === false && (
          <span className="text-xs text-destructive" data-testid="settings-permissions-bypass-off">
            The daemon runs without --allow-bypass, so Auto accept falls back to accepting edits only. Add
            CLAUDE_UI_ALLOW_BYPASS=1 to vip.env and restart the server.
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {permissions.policy === "ask"
            ? "Claude asks before it edits files or runs commands."
            : permissions.policy === "auto"
              ? "New sessions start in bypassPermissions: no prompts. The daemon needs --allow-bypass."
              : "New sessions start in dontAsk: anything that would prompt is refused."}
        </span>
      </label>
    </section>
  );
}
