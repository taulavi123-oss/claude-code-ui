import type { ChatThemeId } from "../chat-theme.ts";

/** Our theme ids → the Claudie theme ids the ported engine knows. */
export const THEME_ID: Record<Exclude<ChatThemeId, "none">, string> = {
  "claude-code": "claude",
  "cloud-drift": "clouds",
  "honu-lagoon": "lagoon",
  "koi-pond": "koi",
  jellyfish: "jelly",
  "paper-boats": "boats",
  fireflies: "fireflies",
  moonlit: "moonlit",
};
