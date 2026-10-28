import { describe, expect, it } from "vitest";
import { permissionModesFor } from "@claude-ui/protocol";
import { modeForPolicy } from "../src/default-mode.ts";

const withBypass = permissionModesFor({ allowBypass: true, supportsAuto: true });
const withoutBypass = permissionModesFor({ allowBypass: false, supportsAuto: false });

describe("permission policy", () => {
  it("ask leaves the choice to the Claude settings files", () => {
    expect(modeForPolicy("ask", withBypass)).toBeUndefined();
  });

  it("auto uses bypassPermissions when the daemon allows it", () => {
    expect(modeForPolicy("auto", withBypass)).toBe("bypassPermissions");
  });

  it("auto falls back to acceptEdits without --allow-bypass", () => {
    expect(modeForPolicy("auto", withoutBypass)).toBe("acceptEdits");
  });

  it("deny uses dontAsk", () => {
    expect(modeForPolicy("deny", withBypass)).toBe("dontAsk");
  });

  it("an unknown policy changes nothing", () => {
    expect(modeForPolicy("nope", withBypass)).toBeUndefined();
    expect(modeForPolicy(undefined, withBypass)).toBeUndefined();
  });
});
