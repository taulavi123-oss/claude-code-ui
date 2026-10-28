import { describe, expect, it } from "vitest";
import { apiModeEnabled, applyStoredProvider, configuredModels, providerConfigError, providerEnv, resolvedProvider, withoutApiKeys } from "../src/provider.ts";

const base = { ANTHROPIC_BASE_URL: "https://gateway.example", ANTHROPIC_AUTH_TOKEN: "secret-token", ANTHROPIC_MODEL: "vendor/model" };

describe("provider", () => {
  it("defaults to subscription mode and strips API credentials", () => {
    const env = { ...base, ANTHROPIC_API_KEY: "api-key" };
    expect(apiModeEnabled(env)).toBe(false);
    const out = providerEnv(env);
    expect(out.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(out.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(out.ANTHROPIC_API_KEY).toBeUndefined();
    expect(withoutApiKeys(env).ANTHROPIC_MODEL).toBe("vendor/model");
  });

  it("passes only the API-mode provider variables", () => {
    const out = providerEnv({ ...base, CLAUDE_UI_PROVIDER_MODE: "api", ANTHROPIC_API_KEY: "api-key", CLAUDE_UI_MODELS: "vendor/model, vendor/two" });
    expect(out.ANTHROPIC_BASE_URL).toBe("https://gateway.example");
    expect(out.ANTHROPIC_AUTH_TOKEN).toBe("secret-token");
    expect(out.ANTHROPIC_API_KEY).toBeUndefined();
    expect(out.CLAUDE_CODE_MAX_CONTEXT_TOKENS).toBe("1000000");
    expect(out.CLAUDE_CODE_MAX_OUTPUT_TOKENS).toBe("64000");
  });

  it("fails fast when API mode is incomplete without naming the secret", () => {
    expect(providerConfigError({ CLAUDE_UI_PROVIDER_MODE: "api" })).toContain("ANTHROPIC_BASE_URL");
    expect(providerConfigError({ CLAUDE_UI_PROVIDER_MODE: "api", ANTHROPIC_BASE_URL: "x", ANTHROPIC_MODEL: "m" })).toContain("ANTHROPIC_AUTH_TOKEN");
    const error = providerConfigError({ CLAUDE_UI_PROVIDER_MODE: "api", ANTHROPIC_BASE_URL: "x", ANTHROPIC_MODEL: "m", ANTHROPIC_AUTH_TOKEN: "super-secret" });
    expect(error).toBeUndefined();
  });

  it("uses the configured model list and preserves slashes", () => {
    expect(configuredModels({ CLAUDE_UI_MODELS: "a/b, c/d" }).map((m) => m.value)).toEqual(["a/b", "c/d"]);
    expect(configuredModels({ ANTHROPIC_MODEL: "one/model" }).map((m) => m.value)).toEqual(["one/model"]);
  });
});

describe("stored provider", () => {
  const provider = { mode: "api" as const, baseUrl: "https://gateway.example", model: "vendor/model", models: "vendor/model", contextWindow: 1000000, maxOutputTokens: 64000 };

  const withEnv = (fn: () => void) => {
    const saved = { ...process.env };
    try {
      for (const key of ["CLAUDE_UI_PROVIDER_MODE", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "CLAUDE_UI_MODELS", "CLAUDE_UI_CONTEXT_WINDOW", "CLAUDE_UI_MAX_OUTPUT_TOKENS"]) delete process.env[key];
      fn();
    } finally {
      process.env = saved;
    }
  };

  it("keeps the launcher key when the UI saved no key", () => {
    withEnv(() => {
      process.env.ANTHROPIC_AUTH_TOKEN = "from-vip-env";
      applyStoredProvider(provider);
      expect(process.env.ANTHROPIC_AUTH_TOKEN).toBe("from-vip-env");
      expect(process.env.CLAUDE_UI_PROVIDER_MODE).toBe("api");
      expect(process.env.ANTHROPIC_BASE_URL).toBe("https://gateway.example");
    });
  });

  it("a key saved in the UI wins over the environment", () => {
    withEnv(() => {
      process.env.ANTHROPIC_AUTH_TOKEN = "from-vip-env";
      applyStoredProvider(provider, "from-ui");
      expect(process.env.ANTHROPIC_AUTH_TOKEN).toBe("from-ui");
    });
  });

  it("resolves empty API fields and the key from the environment", () => {
    withEnv(() => {
      process.env.ANTHROPIC_BASE_URL = "https://env.example";
      process.env.ANTHROPIC_MODEL = "env/model";
      process.env.ANTHROPIC_AUTH_TOKEN = "env-key";
      expect(resolvedProvider({ ...provider, baseUrl: "", model: "" })).toEqual({ mode: "api", baseUrl: "https://env.example", model: "env/model", key: "env-key" });
    });
  });
});
