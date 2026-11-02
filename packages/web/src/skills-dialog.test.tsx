// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { SkillRow } from "@claude-ui/protocol";
import type { Request } from "./client.ts";
import { SkillsDialog } from "./skills-dialog.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const skill = (name: string, over: Partial<SkillRow> = {}): SkillRow => ({ name, displayName: name, description: `${name} desc`, source: "user", tokens: 100, state: "on", advertised: true, handles: {}, ...over });
const SKILLS: SkillRow[] = [
  skill("probe", { source: "project", tokens: 17 }),
  skill("review-pr", { source: "user", tokens: 285 }),
  skill("ponytail:ponytail", { source: "plugin", tokens: 281, lockedBy: "plugin", handles: { aliases: ["ponytail"] } }),
  skill("hidden", { source: "user", tokens: 40, state: "off", advertised: false }),
  skill("fixed", { source: "user", state: "name-only", lockedBy: "reserved-name" }),
];

let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

type Handler = (msg: Request) => unknown;
async function render(handlers: Record<string, Handler> = {}) {
  let skills = structuredClone(SKILLS);
  const calls: Request[] = [];
  const request = vi.fn(async (msg: Request) => {
    calls.push(msg);
    const h = handlers[msg.type];
    if (h) return h(msg);
    if (msg.type === "skills.list") return { skills };
    if (msg.type === "skills.setState") {
      const m = msg as { name: string; state: string };
      skills = skills.map((s) => (s.name === m.name ? { ...s, state: m.state } : s));
      return { skills, confirmed: true };
    }
    return {};
  });
  const el = document.createElement("div");
  document.body.append(el);
  let setOpen!: (o: boolean) => void;
  function Host() {
    const [open, set] = useState(true);
    setOpen = set;
    return <SkillsDialog open={open} cwd="/p" sessionId="s1" request={request as never} onClose={() => set(false)} />;
  }
  root = createRoot(el);
  await act(async () => root!.render(<Host />));
  const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const all = (id: string) => [...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)];
  const text = () => q("skills-dialog")?.textContent ?? "";
  const click = (e: HTMLElement | null | undefined) => act(async () => void e!.click());
  const type = async (e: HTMLElement, v: string) =>
    act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(e, v);
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
  const toggle = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  return { q, all, text, click, type, toggle, calls, setOpen };
}

it("lists every skill once, by source then name, with its toggle and locks", { timeout: 20_000 }, async () => {
  const d = await render();
  expect(d.calls[0]).toEqual({ type: "skills.list", cwd: "/p", sessionId: "s1" });
  expect(d.text()).toContain("Skills");
  expect(d.all("skills-row").map((r) => r.querySelector("span")!.textContent)).toEqual(["/ponytail:ponytail", "/probe", "/fixed", "/hidden", "/review-pr"]);
  expect(d.all("skills-lock").map((l) => l.textContent)).toEqual(["On · locked", "On · locked"]);
  expect(d.toggle("hidden: Off")).toBeTruthy();
});

it("the switch turns a skill off and on again through the daemon", async () => {
  const d = await render();
  await d.click(d.toggle("probe: On"));
  expect(d.calls.at(-1)).toEqual({ type: "skills.setState", cwd: "/p", sessionId: "s1", name: "probe", state: "off", handles: {} });
  expect(d.toggle("probe: Off")).toBeTruthy();
  await d.click(d.toggle("probe: Off"));
  expect(d.calls.at(-1)).toMatchObject({ type: "skills.setState", name: "probe", state: "on" });
  expect(d.toggle("probe: On")).toBeTruthy();
});

it("a hidden legacy skill shows Off until it is switched on", async () => {
  const d = await render();
  expect(d.toggle("hidden: Off")).toBeTruthy();
});

it("a locked skill has no switch", async () => {
  const d = await render();
  expect(d.toggle("ponytail:ponytail: On")).toBeNull();
});

it("shows the unconfirmed notice and keeps the daemon's rows", async () => {
  const d = await render({ "skills.setState": () => ({ skills: SKILLS, confirmed: false }) });
  await d.click(d.toggle("probe: On"));
  expect(d.q("banner-warning")!.textContent).toBe("Saved. This session still has the old state and may not have reloaded yet; reopen the dialog to check.");
});

it("a failure shows the error and re-reads the list", async () => {
  const d = await render({ "skills.setState": () => Promise.reject(new Error("This setting cannot be changed")) });
  await d.click(d.toggle("probe: On"));
  expect(d.q("banner-error")!.textContent).toBe("This setting cannot be changed");
  expect(d.calls.filter((c) => c.type === "skills.list")).toHaveLength(2);
});

it("filters by name, source and description; empty states", async () => {
  const d = await render();
  await d.type(d.q("skills-filter")!, "/PRO");
  expect(d.all("skills-row").map((r) => r.querySelector("span")!.textContent)).toEqual(["/probe"]);
  await d.type(d.q("skills-filter")!, "zzz");
  expect(d.text()).toContain("No matching skills.");
  await act(async () => root!.unmount());
  const empty = await render({ "skills.list": () => ({ skills: [] }) });
  expect(empty.text()).toContain("No skills in this project.");
});
