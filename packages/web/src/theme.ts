// Color scheme: follows the OS by default (OpenCode `system`), or forced light / dark; kept per browser.
import { useSyncExternalStore } from "react";
export type ThemePref = "system" | "light" | "dark";

const KEY = "claude-ui.theme";
const query = () => matchMedia("(prefers-color-scheme: dark)");

export const nextPref = (p: ThemePref): ThemePref => (p === "system" ? "light" : p === "light" ? "dark" : "system");

export function loadPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Sets `.dark` on <html>; "system" also resolves to dark, the app's default. Returns the stop function. */
export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Storage blocked: the choice lasts for this page.
  }
  const mq = query();
  const set = () => {
    const dark = pref !== "light";
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#080808" : "#fafafa");
  };
  set();
  if (pref === "light") return () => {};
  mq.addEventListener("change", set);
  return () => mq.removeEventListener("change", set);
}

const isDark = () => document.documentElement.classList.contains("dark");
const onDarkChange = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => o.disconnect();
};

/** True while `.dark` is on <html>: for components that theme themselves (diffs). */
export const useDark = () => useSyncExternalStore(onDarkChange, isDark, () => false);
