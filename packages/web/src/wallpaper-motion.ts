// Wallpaper animation preference, per browser: Auto follows the OS reduced
// motion setting, Always animates even when the OS asks for less motion, Off
// paints one still frame. Kept here so the composer and Settings agree.
import { useSyncExternalStore } from "react";

export type WallpaperMotion = "auto" | "always" | "off";

const KEY = "claude-ui.wallpaper-motion";
const listeners = new Set<() => void>();
let memory: WallpaperMotion = "auto";

export function loadWallpaperMotion(): WallpaperMotion {
  try {
    const value = localStorage.getItem(KEY);
    return value === "always" || value === "off" ? value : "auto";
  } catch {
    return memory;
  }
}

export function saveWallpaperMotion(value: WallpaperMotion) {
  memory = value;
  try {
    if (value === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    // Storage blocked: the choice lasts while the page is open.
  }
  for (const fn of listeners) fn();
}

const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export const useWallpaperMotion = () => useSyncExternalStore(subscribe, loadWallpaperMotion, () => "auto" as WallpaperMotion);
