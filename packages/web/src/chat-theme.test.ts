// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CHAT_THEMES, chatThemeOf, loadChatTheme, saveChatTheme, themeFromCommand } from "./chat-theme.ts";

describe("chat theme", () => {
  it("starts on none and remembers a choice", () => {
    localStorage.clear();
    expect(loadChatTheme()).toBe("none");
    saveChatTheme("koi-pond");
    expect(loadChatTheme()).toBe("koi-pond");
    saveChatTheme("none");
    expect(localStorage.getItem("claude-ui.chatTheme")).toBeNull();
  });

  it("an unknown stored value reads as none", () => {
    localStorage.setItem("claude-ui.chatTheme", "not-a-theme");
    expect(loadChatTheme()).toBe("none");
  });

  it("/theme names a theme by id or label, bare /theme clears it", () => {
    expect(themeFromCommand("/theme koi-pond")).toBe("koi-pond");
    expect(themeFromCommand("/theme KoiPond")).toBe("koi-pond");
    expect(themeFromCommand("/theme Honu Lagoon")).toBe("honu-lagoon");
    expect(themeFromCommand("/theme")).toBe("none");
    expect(themeFromCommand("/theme nope")).toBeUndefined();
    expect(themeFromCommand("hello /theme")).toBeUndefined();
  });

  it("every theme but none has ink and characters", () => {
    for (const t of CHAT_THEMES) {
      if (t.id === "none") continue;
      expect(t.chars.length).toBeGreaterThan(0);
      expect(t.ink.length).toBeGreaterThan(0);
    }
    expect(chatThemeOf("none").chars).toBe("");
  });
});
