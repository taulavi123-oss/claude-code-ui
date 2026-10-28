# Opt-in Anthropic-compatible API provider mode

ADR 0002 keeps the default daemon on the owner's Claude subscription and strips
inherited API keys. Some self-hosted deployments use an Anthropic Messages API
gateway instead of a subscription.

API mode is explicit:

- `CLAUDE_UI_PROVIDER_MODE=api`
- `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` (or `ANTHROPIC_API_KEY`) and
  `ANTHROPIC_MODEL`
- optional `CLAUDE_UI_MODELS`, `CLAUDE_UI_CONTEXT_WINDOW`,
  `CLAUDE_UI_MAX_OUTPUT_TOKENS`

`providerEnv()` is the single environment boundary for every SDK query and
bundled CLI call. Subscription mode removes API keys and the gateway base;
API mode passes the provider variables and fails startup if they are
incomplete. The key is never written to config, browser storage, URLs or logs.

Only Anthropic Messages API-compatible gateways are supported. An OpenAI-only
endpoint needs a translation proxy outside this daemon.
