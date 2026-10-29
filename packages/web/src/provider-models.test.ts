import { describe, expect, it } from "vitest";
import { splitModels } from "./provider-settings.tsx";

describe("provider model list", () => {
  it("splits a saved list into trimmed ids", () => {
    expect(splitModels("a/b, c/d ,, e")).toEqual(["a/b", "c/d", "e"]);
  });

  it("an empty setting means no extra ids", () => {
    expect(splitModels("")).toEqual([]);
    expect(splitModels("   ")).toEqual([]);
  });

  it("keeps vendor prefixes and slashes intact", () => {
    expect(splitModels("river/deepseek-ai/DeepSeek-V4.1-Flash")).toEqual(["river/deepseek-ai/DeepSeek-V4.1-Flash"]);
  });
});
