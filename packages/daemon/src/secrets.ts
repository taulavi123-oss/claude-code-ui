// Write-only secrets (docs/spec.md "Settings", GH-447): secrets.json in the config dir (mode 0600), same JSON-file helper as settings.json.
// A secret is never sent in a reply, a broadcast or a log line; clients only learn whether one is set.
import { createJsonFile } from "./json-file.ts";

type Stored = { jiraToken?: string; anthropicToken?: string };
const parse = (raw: unknown): Stored => {
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>).jiraToken : undefined;
  const a = raw && typeof raw === "object" ? (raw as Record<string, unknown>).anthropicToken : undefined;
  return { ...(typeof t === "string" && t ? { jiraToken: t } : {}), ...(typeof a === "string" && a ? { anthropicToken: a } : {}) };
};
/** A Jira API token or personal access token: printable, no spaces, at most 2000 characters. */
export const tokenProblem = (t: unknown): string | undefined =>
  typeof t !== "string" || !t || t.length > 2000 || !/^[\x21-\x7e]+$/.test(t) ? "The token must be 1 to 2000 printable characters without spaces" : undefined;
/** An Anthropic-compatible gateway key: printable, no spaces, at most 4000 characters. */
export const providerTokenProblem = (t: unknown): string | undefined =>
  typeof t !== "string" || !t || t.length > 4000 || !/^[\x21-\x7e]+$/.test(t) ? "The API key must be 1 to 4000 printable characters without spaces" : undefined;

/** Without `file` the secrets live in memory only (tests). */
export function createSecrets({ file }: { file?: string } = {}) {
  const store = createJsonFile<Stored>(file, parse, "secrets");
  return {
    jiraToken: (): string | undefined => store.get().jiraToken,
    anthropicToken: (): string | undefined => store.get().anthropicToken,
    /** null clears. Throws when the token is invalid or the save fails. */
    setJiraToken(token: string | null) {
      if (token !== null) {
        const p = tokenProblem(token);
        if (p) throw new Error(p);
      }
      store.change((d) => {
        if (token === null) delete d.jiraToken;
        else d.jiraToken = token;
      });
    },
    /** null clears. Throws when the key is invalid or the save fails. */
    setAnthropicToken(token: string | null) {
      if (token !== null) {
        const p = providerTokenProblem(token);
        if (p) throw new Error(p);
      }
      store.change((d) => {
        if (token === null) delete d.anthropicToken;
        else d.anthropicToken = token;
      });
    },
  };
}
export type Secrets = ReturnType<typeof createSecrets>;
