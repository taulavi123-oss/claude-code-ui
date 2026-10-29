import type { ModelInfo } from "@anthropic-ai/claude-agent-sdk";
import type { Settings } from "@claude-ui/protocol";

const DEFAULT_CONTEXT_TOKENS = "1000000";
const DEFAULT_MAX_OUTPUT_TOKENS = "64000";

/** The daemon runs with the owner's Claude subscription by default; API mode is explicit. */
export function apiModeEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (env.CLAUDE_UI_PROVIDER_MODE ?? "").trim().toLowerCase() === "api";
}

/** Remove credentials an inherited shell could otherwise bill per token (ADR 0002). */
export function withoutApiKeys(env: NodeJS.ProcessEnv) {
  const { ANTHROPIC_API_KEY: _key, ANTHROPIC_AUTH_TOKEN: _token, ANTHROPIC_BASE_URL: _base, ...rest } = env;
  return rest;
}

/** The first missing/invalid API-mode setting, or undefined when it is usable. Never includes a secret. */
export function providerConfigError(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!apiModeEnabled(env)) return undefined;
  if (!(env.ANTHROPIC_BASE_URL ?? "").trim()) return "CLAUDE_UI_PROVIDER_MODE=api requires ANTHROPIC_BASE_URL";
  if (!(env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY ?? "").trim()) return "CLAUDE_UI_PROVIDER_MODE=api requires ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY";
  if (!(env.ANTHROPIC_MODEL ?? "").trim()) return "CLAUDE_UI_PROVIDER_MODE=api requires ANTHROPIC_MODEL";
  return undefined;
}

/** One model id per entry, in config order, exact slashes preserved. */
export function configuredModels(env: NodeJS.ProcessEnv = process.env): ModelInfo[] {
  const fromEnv = (env.CLAUDE_UI_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  const fallback = (env.ANTHROPIC_MODEL ?? "").trim();
  const ids = [...new Set(fromEnv.length ? fromEnv : fallback ? [fallback] : [])];
  return ids.map((value) => ({ value, displayName: value, description: "API provider model", supportsAutoMode: false }) as ModelInfo);
}

/**
 * Environment for every SDK query and bundled-CLI call.
 * Subscription mode keeps ADR 0002: no API key or gateway base can leak in.
 * API mode passes only the provider variables the Agent SDK needs.
 */
export function providerEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (!apiModeEnabled(env)) return withoutApiKeys(env);

  const token = (env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY ?? "").trim();
  const out: NodeJS.ProcessEnv = { ...env };
  delete out.ANTHROPIC_API_KEY;
  out.ANTHROPIC_AUTH_TOKEN = token;
  out.ANTHROPIC_BASE_URL = (env.ANTHROPIC_BASE_URL ?? "").trim().replace(/\/+$/, "");
  out.ANTHROPIC_MODEL = (env.ANTHROPIC_MODEL ?? "").trim();

  const model = out.ANTHROPIC_MODEL;

  if (model) {
    for (const key of ["ANTHROPIC_DEFAULT_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"]) {
      out[key] ??= model;
    }
  }

  out.CLAUDE_CODE_MAX_CONTEXT_TOKENS ??= env.CLAUDE_UI_CONTEXT_WINDOW?.trim() || DEFAULT_CONTEXT_TOKENS;
  out.CLAUDE_CODE_MAX_OUTPUT_TOKENS ??= env.CLAUDE_UI_MAX_OUTPUT_TOKENS?.trim() || DEFAULT_MAX_OUTPUT_TOKENS;
  return out;
}

type ProviderSettings = Settings["provider"];

/** Apply UI settings to this daemon's environment; the process is single-user. */
export function applyStoredProvider(provider: ProviderSettings, token?: string) {
  if (provider.mode === "env") return;
  if (provider.mode === "subscription") {
    for (const key of ["CLAUDE_UI_PROVIDER_MODE", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "CLAUDE_UI_MODELS", "CLAUDE_UI_CONTEXT_WINDOW", "CLAUDE_UI_MAX_OUTPUT_TOKENS"]) delete process.env[key];
    return;
  }
  process.env.CLAUDE_UI_PROVIDER_MODE = "api";
  process.env.ANTHROPIC_BASE_URL = provider.baseUrl.trim();
  process.env.ANTHROPIC_MODEL = provider.model.trim();
  process.env.CLAUDE_UI_MODELS = provider.models.trim();
  process.env.CLAUDE_UI_CONTEXT_WINDOW = String(provider.contextWindow);
  process.env.CLAUDE_UI_MAX_OUTPUT_TOKENS = String(provider.maxOutputTokens);
  // A key saved in the UI wins. Without one, keep the key the launcher
  // exported from vip.env: deleting it logged the CLI out ("Please run
  // /login") the moment API mode was selected but no key was typed.
  if (token) process.env.ANTHROPIC_AUTH_TOKEN = token;
}

/** The settings the daemon should use: env keeps the launcher's environment. */
export function resolvedProvider(provider: ProviderSettings, token?: string) {
  if (provider.mode === "env") {
    const baseUrl = (process.env.ANTHROPIC_BASE_URL ?? "").trim();
    const model = (process.env.ANTHROPIC_MODEL ?? "").trim();
    const key = (token ?? process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.ANTHROPIC_API_KEY ?? "").trim();
    return { mode: ((process.env.CLAUDE_UI_PROVIDER_MODE ?? "").trim().toLowerCase() === "api" ? "api" : "subscription") as "api" | "subscription", baseUrl, model, key };
  }
  // API mode still falls back to the launcher's environment for anything the
  // form left empty, so Test connection works with the key in vip.env.
  const baseUrl = provider.baseUrl.trim() || (process.env.ANTHROPIC_BASE_URL ?? "").trim();
  const model = provider.model.trim() || (process.env.ANTHROPIC_MODEL ?? "").trim();
  const key = (token ?? process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.ANTHROPIC_API_KEY ?? "").trim();
  return { mode: provider.mode, baseUrl, model, key };
}

/** Model ids from the gateway (`GET /v1/models`); the same key resolution as a query. */
export async function providerModels(provider: ProviderSettings, token?: string): Promise<{ models: string[] }> {
  const p = resolvedProvider(provider, token);
  if (p.mode !== "api") throw new Error("provider_not_configured: switch Provider mode to API and save the endpoint");
  if (!p.baseUrl) throw new Error("provider_not_configured: base URL is required");
  if (!p.key) throw new Error("provider_not_configured: an API key is required");
  let response: Response;
  try {
    response = await fetch(`${p.baseUrl.replace(/\/+$/, "")}/v1/models`, {
      headers: { "anthropic-version": "2023-06-01", authorization: `Bearer ${p.key}`, "x-api-key": p.key },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    throw new Error(`provider_unreachable: ${(e as Error).message}`);
  }
  if (response.status === 401 || response.status === 403) throw new Error("provider_auth: the gateway rejected the key");
  if (!response.ok) throw new Error(`provider_failed: HTTP ${response.status}`);
  const body = (await response.json().catch(() => undefined)) as
    | { data?: Array<{ id?: unknown } | string>; models?: Array<{ id?: unknown } | string> }
    | undefined;
  const rows = body?.data ?? body?.models ?? [];
  const models = rows
    .map((row) => (typeof row === "string" ? row : typeof row?.id === "string" ? row.id : ""))
    .filter(Boolean);
  if (!models.length) throw new Error("provider_empty: the gateway returned no model ids");
  return { models };
}

/** One cheap request; never generates tokens and never returns the key. */
export async function providerHealth(provider: ProviderSettings, token?: string): Promise<{ model: string; latencyMs: number }> {
  const p = resolvedProvider(provider, token);
  if (p.mode !== "api") throw new Error("provider_not_configured: switch Provider mode to API and save the endpoint");
  if (!p.baseUrl || !p.model) throw new Error("provider_not_configured: base URL and model are required");
  if (!p.key) throw new Error("provider_not_configured: an API key is required");
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(`${p.baseUrl.replace(/\/+$/, "")}/v1/messages/count_tokens`, {
      method: "POST",
      headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", authorization: `Bearer ${p.key}`, "x-api-key": p.key },
      body: JSON.stringify({ model: p.model, messages: [{ role: "user", content: "hi" }] }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    throw new Error(`provider_unreachable: ${(e as Error).message}`);
  }
  if (response.status === 401 || response.status === 403) throw new Error("provider_auth: the gateway rejected the key");
  if (!response.ok) throw new Error(`provider_failed: HTTP ${response.status}`);
  return { model: p.model, latencyMs: Date.now() - started };
}
