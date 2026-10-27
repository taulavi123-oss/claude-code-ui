# claude-code-ui

[![npm](https://img.shields.io/npm/v/claude-code-ui)](https://www.npmjs.com/package/claude-code-ui)
[![license](https://img.shields.io/npm/l/claude-code-ui)](https://github.com/cuonghuunguyen/claude-code-ui/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-cuonghuunguyen.github.io-blue)](https://cuonghuunguyen.github.io/claude-code-ui/)

A web UI for Claude Code. Run, watch and steer many sessions from your browser or phone. A small local daemon runs everything on your own machine: no cloud, no relay, no telemetry. Unofficial; not affiliated with Anthropic.

**Docs: https://cuonghuunguyen.github.io/claude-code-ui/**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cuonghuunguyen/claude-code-ui/main/docs/site/public/screenshots/workspace-dark.png">
  <img alt="claude-code-ui: projects and sessions on the left, a session in the middle, the changes panel on the right" src="https://raw.githubusercontent.com/cuonghuunguyen/claude-code-ui/main/docs/site/public/screenshots/workspace-light.png">
</picture>

## Install

You need Node.js 22+ and Claude Code logged in (`claude login`; your subscription is used, no API key). On Linux and WSL also a C++ toolchain for the terminal panel (`sudo apt install build-essential python3`).

```sh
npx claude-code-ui            # run without installing
npm i -g claude-code-ui       # or install; the command is `claude-ui`
claude-ui
```

It prints a pairing link and a QR code. Open the link to use the app.

With the daemon running, other terminals can ask it: `claude-ui status`, `claude-ui sessions` (`--json` for scripts), `claude-ui projects`, `claude-ui workers`, and `claude-ui open` to open the app in your browser (`--print` prints the pairing link). After `claude-ui update`, run `npm i -g claude-code-ui` to get the new launcher with these commands. To use it from your phone, start it with `claude-ui --tailscale`.

## Custom Anthropic-compatible endpoint (API mode)

By default claude-ui uses your Claude subscription (`claude login`). For a
self-hosted Anthropic Messages API gateway, set an explicit API mode; the
daemon then passes the gateway settings to the Agent SDK instead of removing
API keys:

```sh
export CLAUDE_UI_PROVIDER_MODE=api
export ANTHROPIC_BASE_URL=https://gateway.example
export ANTHROPIC_AUTH_TOKEN=...
export ANTHROPIC_MODEL=vendor/model
export CLAUDE_UI_MODELS=vendor/model,vendor/model-fast   # optional
export CLAUDE_UI_CONTEXT_WINDOW=1000000                  # optional
export CLAUDE_UI_MAX_OUTPUT_TOKENS=64000                 # optional
claude-ui --lan
```

Only Anthropic Messages API-compatible gateways work; an OpenAI-only endpoint
needs a translation proxy. Subscription mode is unchanged and continues to
strip inherited API keys. The key is read from the environment, never written
to `~/.config/claude-ui`, the browser, or logs.

The published CLI pins `node-pty` 1.2 beta, whose Linux x64 prebuild lets a
container without `make`/`g++` install the terminal panel. A source checkout
still needs the build tools for its development dependency.

## What you get

- Sessions in tabs, grouped by project. They keep running when the browser closes.
- Same behavior as Claude Code: permission prompts, modes, models, slash commands, skills, `/rewind`. Sessions from the `claude` CLI show up too.
- A Focus page and notifications for everything that waits for you.
- File tree and editor, diffs, a git graph and a terminal next to the chat.
- Works on a phone and installs as an app (over HTTPS).
- Windows with WSL, and Docker containers, from one install.

Read more:
[Install & first run](https://cuonghuunguyen.github.io/claude-code-ui/guide/install) ·
[Quick tour](https://cuonghuunguyen.github.io/claude-code-ui/guide/tour) ·
[Keyboard shortcuts](https://cuonghuunguyen.github.io/claude-code-ui/reference/shortcuts) ·
[CLI flags](https://cuonghuunguyen.github.io/claude-code-ui/reference/cli) ·
[Troubleshooting](https://cuonghuunguyen.github.io/claude-code-ui/reference/troubleshooting) ·
[Privacy](https://cuonghuunguyen.github.io/claude-code-ui/reference/privacy)

## Security in one paragraph

The daemon can run any command on your machine, so treat access to it like shell access. It listens on `127.0.0.1` only (unless `--lan`), every connection needs the pairing token, sessions stay inside `--roots`, and permission prompts are on by default. Keep the pairing link private. Details: [Privacy](https://cuonghuunguyen.github.io/claude-code-ui/reference/privacy).

## Contributing

Build from source, project layout, tests and release steps: [CONTRIBUTING.md](https://github.com/cuonghuunguyen/claude-code-ui/blob/main/CONTRIBUTING.md). Changes: [CHANGELOG.md](https://github.com/cuonghuunguyen/claude-code-ui/blob/main/CHANGELOG.md).

## License

[MIT](https://github.com/cuonghuunguyen/claude-code-ui/blob/main/LICENSE). Bundled third-party licenses: [THIRD_PARTY_NOTICES.md](https://github.com/cuonghuunguyen/claude-code-ui/blob/main/THIRD_PARTY_NOTICES.md).
