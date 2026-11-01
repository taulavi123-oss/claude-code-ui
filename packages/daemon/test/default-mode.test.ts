import { describe, expect, it } from "vitest";
import { permissionModesFor } from "@claude-ui/protocol";
import { modeForPolicy } from "../src/default-mode.ts";

const withBypass = permissionModesFor({ allowBypass: true, supportsAuto: true });
const withoutBypass = permissionModesFor({ allowBypass: false, supportsAuto: false });

describe("permission policy", () => {
  it("ask leaves the choice to the Claude settings files", () => {
    expect(modeForPolicy("ask", withBypass)).toBeUndefined();
  });

  it("build uses bypassPermissions when the daemon allows it", () => {
    expect(modeForPolicy("build", withBypass)).toBe("bypassPermissions");
  });

  it("build falls back to acceptEdits without --allow-bypass", () => {
    expect(modeForPolicy("build", withoutBypass)).toBe("acceptEdits");
  });

  it("auto uses Claude's own auto mode when the model supports it", () => {
    expect(modeForPolicy("auto", withBypass)).toBe("auto");
    expect(modeForPolicy("auto", withoutBypass)).toBe("default");
  });

  it("deny uses dontAsk", () => {
    expect(modeForPolicy("deny", withBypass)).toBe("dontAsk");
  });

  it("plan starts new sessions in plan mode", () => {
    expect(modeForPolicy("plan", withBypass)).toBe("plan");
    expect(modeForPolicy("plan", withoutBypass)).toBe("plan");
  });

  it("an unknown policy changes nothing", () => {
    expect(modeForPolicy("nope", withBypass)).toBeUndefined();
    expect(modeForPolicy(undefined, withBypass)).toBeUndefined();
  });
});
