// Whether the ASCII pet shows in the session, and where it sits. Per browser.
// On by default: Clawd is part of the room, and the switch turns him off.
import { useSyncExternalStore } from "react";

const KEY = "claude-ui.pet";
const listeners = new Set<() => void>();
let memory = true;

export function loadPetEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return memory;
  }
}

export function savePetEnabled(on: boolean) {
  memory = on;
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "0");
  } catch {
    // Storage blocked: the choice lasts while the page is open.
  }
  for (const fn of listeners) fn();
}

const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export const usePetEnabled = () => useSyncExternalStore(subscribe, loadPetEnabled, () => true);
