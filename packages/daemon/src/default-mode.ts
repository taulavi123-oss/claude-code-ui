import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSION_MODES, type PermissionMode } from "@claude-ui/protocol";

/**
 * `permissions.defaultMode` as Claude Code resolves it for `cwd`: the highest of local (.claude/settings.local.json), project
 * (.claude/settings.json) and user (`claudeDir`/settings.json) that sets a valid one. Read on each call, so edits apply to the next new session.
 * An unknown value is skipped (the next source decides), and `auto` / `bypassPermissions` count only from the user settings: Claude Code
 * ignores them in project files, so a cloned repo cannot turn off permission checks. Undefined when no file sets a usable value.
 */
/**
 * The mode a settings policy asks for. `ask` returns undefined so the Claude
 * settings files decide (the previous behaviour); `auto` needs bypass and falls
 * back to acceptEdits when the daemon was started without --allow-bypass.
 */
export function modeForPolicy(policy: unknown, modes: readonly PermissionMode[]): PermissionMode | undefined {
  if (policy === "auto") return modes.includes("bypassPermissions") ? "bypassPermissions" : modes.includes("acceptEdits") ? "acceptEdits" : "default";
  if (policy === "deny") return modes.includes("dontAsk") ? "dontAsk" : "default";
  return undefined;
}

export function readDefaultMode(claudeDir: string, cwd: string): string | undefined {
  const files = [
    [join(cwd, ".claude", "settings.local.json"), false],
    [join(cwd, ".claude", "settings.json"), false],
    [join(claudeDir, "settings.json"), true],
  ] as const;
  for (const [file, isUser] of files)
    try {
      const mode = JSON.parse(readFileSync(file, "utf8"))?.permissions?.defaultMode;
      if (PERMISSION_MODES.includes(mode) && (isUser || (mode !== "auto" && mode !== "bypassPermissions"))) return mode;
    } catch {
      // Missing or unreadable file: the next source decides.
    }
  return undefined;
}
