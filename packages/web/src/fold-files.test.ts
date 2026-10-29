import { describe, expect, it } from "vitest";
import { foldFiles } from "./signal.ts";
import type { ToolCall } from "./store.ts";

const call = (tool: string, input: unknown): ToolCall =>
  ({ id: `${tool}-${Math.random()}`, type: "tool_call", toolUseId: "t", tool, input, status: "done" }) as ToolCall;

describe("foldFiles", () => {
  it("sums an Edit and a Write of the same file into one chip", () => {
    const files = foldFiles([
      call("Edit", { file_path: "/w/main.py", old_string: "a\nb\n", new_string: "a\nb\nc\n" }),
      call("Write", { file_path: "/w/main.py", content: "x\ny\n" }),
    ]);
    expect(files).toHaveLength(1);
    expect(files[0]!.name).toBe("main.py");
    expect(files[0]!.added).toBeGreaterThan(0);
  });

  it("keeps first-seen order and ignores calls that are not file edits", () => {
    const files = foldFiles([
      call("Bash", { command: "ls" }),
      call("Write", { file_path: "/w/b.txt", content: "1\n" }),
      call("Edit", { file_path: "/w/a.txt", old_string: "1\n", new_string: "1\n2\n" }),
    ]);
    expect(files.map((f) => f.name)).toEqual(["b.txt", "a.txt"]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 9 }, (_, i) => call("Write", { file_path: `/w/f${i}.txt`, content: "x\n" }));
    expect(foldFiles(many, 4)).toHaveLength(4);
  });

  it("no edited file means no chips", () => {
    expect(foldFiles([call("Read", { file_path: "/w/a.txt" })])).toEqual([]);
  });
});
