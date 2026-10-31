// jsdom's getComputedStyle matches every rule of its UA stylesheet per element; floating-ui (Base UI popups) calls it for
// each ancestor on every open, ~300 ms per popup, which timed tests out under load. No test asserts layout: inline styles are enough.
if (typeof window !== "undefined") window.getComputedStyle = (el: Element) => (el as HTMLElement).style ?? new CSSStyleDeclaration();

// jsdom has no CSS.escape. The sidebar uses it to build a selector for the
// session to focus, so without this a "Load more" test threw before asserting.
if (typeof globalThis.CSS === "undefined") (globalThis as { CSS?: unknown }).CSS = {};
const css = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS!;
if (typeof css.escape !== "function") {
  css.escape = (value: string) => String(value).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, (c) => `\\${c}`);
}
