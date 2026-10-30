// Whether the ASCII pet shows in the session, and where it sits. Per browser.
import { useSyncExternalStore } from "react";

const KEY = "claude-ui.pet";
const listeners = new Set<() => void>();
let memory = false;

export function loadPetEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return memory;
  }
}

export function savePetEnabled(on: boolean) {
  memory = on;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice lasts while the page is open.
  }
  for (const fn of listeners) fn();
}

const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export const usePetEnabled = () => useSyncExternalStore(subscribe, loadPetEnabled, () => false);
