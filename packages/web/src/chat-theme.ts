// Chat themes: live ASCII wallpapers behind the conversation.
//
// Palette, gradient stops and glyph sets come from Claudie
// (https://github.com/siinn1706/claudie, MIT, (c) 2026 Nguyễn Văn Nam and
// Luis Roberto for Claudinho). This file re-implements the ambient character
// fields for the browser: no subjects, no audio, no assets copied.
import { useSyncExternalStore } from "react";

export type ChatThemeId = "none" | "claude-code" | "cloud-drift" | "honu-lagoon" | "koi-pond" | "jellyfish" | "paper-boats" | "fireflies" | "moonlit";

/** How the character field moves. */
export type FieldKind = "pulse" | "drift" | "flow" | "pond" | "fall" | "ripple" | "swarm" | "stars";

export type ChatTheme = {
  id: ChatThemeId;
  label: string;
  /** Gradient stops of the background, top to bottom. */
  stops: string[];
  /** Characters painted, sparse to dense. */
  chars: string;
  /** Ink per density step. */
  ink: string[];
  /** Grid colour drawn under the characters. */
  grid: string;
  kind: FieldKind;
  /** 0 = still, 1 = lively. */
  motion: number;
};

export const CHAT_THEMES: ChatTheme[] = [
  { id: "none", label: "None", stops: [], chars: "", ink: [], grid: "", kind: "pulse", motion: 0 },
  {
    id: "claude-code",
    label: "Claude Code",
    stops: ["#3b2217", "#1b130f", "#0b0908"],
    chars: " ·'.",
    ink: ["rgba(224,138,100,0.25)", "rgba(224,138,100,0.45)", "rgba(240,170,130,0.7)", "rgba(245,196,168,0.9)"],
    grid: "rgba(255,236,220,0.035)",
    kind: "pulse",
    motion: 0.35,
  },
  {
    id: "cloud-drift",
    label: "Cloud Drift",
    stops: ["#4ea2e6", "#93cbf3", "#d9effc"],
    chars: " v^",
    ink: ["rgba(30,70,110,0.35)", "rgba(30,70,110,0.5)", "rgba(30,70,110,0.7)", "rgba(30,70,110,0.9)"],
    grid: "rgba(255,255,255,0.09)",
    kind: "drift",
    motion: 0.5,
  },
  {
    id: "honu-lagoon",
    label: "Honu Lagoon",
    stops: ["#b2f4e8", "#4ad6d6", "#1aa8ca", "#0e80b6"],
    chars: " ·-~",
    ink: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.34)", "rgba(255,255,255,0.52)", "rgba(255,255,255,0.78)"],
    grid: "rgba(255,255,255,0.07)",
    kind: "flow",
    motion: 0.6,
  },
  {
    id: "koi-pond",
    label: "Koi Pond",
    stops: ["#2a8a7f", "#196258", "#0c3631"],
    chars: " ·oO",
    ink: ["rgba(220,255,240,0.22)", "rgba(220,255,240,0.4)", "rgba(220,255,240,0.62)", "rgba(220,255,240,0.85)"],
    grid: "rgba(220,255,240,0.045)",
    kind: "pond",
    motion: 0.5,
  },
  {
    id: "jellyfish",
    label: "Jellyfish",
    stops: ["#0f4373", "#08223f", "#020a17"],
    chars: " ·*+",
    ink: ["rgba(170,215,255,0.18)", "rgba(170,215,255,0.35)", "rgba(190,225,255,0.55)", "rgba(220,240,255,0.8)"],
    grid: "rgba(160,200,255,0.05)",
    kind: "fall",
    motion: 0.5,
  },
  {
    id: "paper-boats",
    label: "Paper Boats",
    stops: ["#9cc9cc", "#6aa3ab", "#3e7681"],
    chars: " -~",
    ink: ["rgba(255,255,255,0.24)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.58)", "rgba(255,255,255,0.8)"],
    grid: "rgba(255,255,255,0.07)",
    kind: "ripple",
    motion: 0.45,
  },
  {
    id: "fireflies",
    label: "Fireflies",
    stops: ["#0c2119", "#07130e", "#030806"],
    chars: " ·*",
    ink: ["rgba(214,240,74,0.3)", "rgba(214,240,74,0.55)", "rgba(251,255,154,0.8)", "rgba(251,255,154,1)"],
    grid: "rgba(200,255,200,0.035)",
    kind: "swarm",
    motion: 0.8,
  },
  {
    id: "moonlit",
    label: "Moonlit",
    stops: ["#0a1236", "#14275f", "#22407e"],
    chars: " ·+*",
    ink: ["rgba(230,236,255,0.2)", "rgba(230,236,255,0.4)", "rgba(230,236,255,0.62)", "rgba(255,250,230,0.9)"],
    grid: "rgba(180,200,255,0.05)",
    kind: "stars",
    motion: 0.35,
  },
];

const KEY = "claude-ui.chatTheme";
const listeners = new Set<() => void>();
let memory: ChatThemeId = "none";

export function loadChatTheme(): ChatThemeId {
  try {
    const v = localStorage.getItem(KEY);
    return CHAT_THEMES.some((t) => t.id === v) ? (v as ChatThemeId) : "none";
  } catch {
    return memory;
  }
}

export function saveChatTheme(id: ChatThemeId) {
  memory = id;
  try {
    if (id === "none") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, id);
  } catch {
    // Storage blocked: the choice lasts while the page is open.
  }
  for (const fn of listeners) fn();
}

const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export const useChatTheme = () => useSyncExternalStore(subscribe, loadChatTheme, () => "none" as ChatThemeId);

export const chatThemeOf = (id: ChatThemeId) => CHAT_THEMES.find((t) => t.id === id) ?? CHAT_THEMES[0]!;

/** `/theme <name>`: the theme a typed command names, or undefined. A bare `/theme` clears it. */
export function themeFromCommand(text: string): ChatThemeId | undefined {
  const m = /^\/theme(?:\s+(.+?))?\s*$/i.exec(text.trim());
  if (!m) return undefined;
  const raw = (m[1] ?? "").trim();
  if (!raw) return "none";
  // "Honu Lagoon", "honu-lagoon" and "HonuLagoon" all name the same theme.
  const want = raw.toLowerCase().replace(/[^a-z]/g, "");
  return CHAT_THEMES.find((t) => t.id.replace(/[^a-z]/g, "") === want || t.label.toLowerCase().replace(/[^a-z]/g, "") === want)?.id;
}
