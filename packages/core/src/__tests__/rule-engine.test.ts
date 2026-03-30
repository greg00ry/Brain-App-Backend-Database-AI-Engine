import { describe, it, expect } from "vitest";
import { matchRules } from "../services/ai/rule-engine.js";

describe("matchRules", () => {
  describe("RESEARCH_BRAIN", () => {
    it("matches Polish explicit memory search", () => {
      expect(matchRules("co wiem o Pythonie")?.action).toBe("RESEARCH_BRAIN");
      expect(matchRules("przeszukaj pamięć")?.action).toBe("RESEARCH_BRAIN");
    });

    it("matches English explicit memory search", () => {
      expect(matchRules("what do i know about Python")?.action).toBe("RESEARCH_BRAIN");
      expect(matchRules("search my memory for notes")?.action).toBe("RESEARCH_BRAIN");
    });

    it("matches recall commands", () => {
      expect(matchRules("przypomnij mi o projekcie")?.action).toBe("RESEARCH_BRAIN");
      expect(matchRules("remind me about the project")?.action).toBe("RESEARCH_BRAIN");
    });

    it("returns confidence >= 90 for explicit commands", () => {
      const result = matchRules("co wiem o Pythonie");
      expect(result?.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  describe("SAVE_ONLY", () => {
    it("matches Polish save commands", () => {
      expect(matchRules("zapamiętaj: mój login to admin")?.action).toBe("SAVE_ONLY");
      expect(matchRules("zapisz to na później")?.action).toBe("SAVE_ONLY");
      expect(matchRules("zanotuj że spotkanie o 15")?.action).toBe("SAVE_ONLY");
    });

    it("matches English save commands", () => {
      expect(matchRules("save this for later")?.action).toBe("SAVE_ONLY");
      expect(matchRules("remember: meeting at 3pm")?.action).toBe("SAVE_ONLY");
      expect(matchRules("note: review PR tomorrow")?.action).toBe("SAVE_ONLY");
    });

    it("returns confidence 95 for explicit save", () => {
      const result = matchRules("save this");
      expect(result?.confidence).toBe(95);
    });
  });

  describe("no match", () => {
    it("returns null for generic statements", () => {
      expect(matchRules("hello")).toBeNull();
      expect(matchRules("jak się masz")).toBeNull();
      expect(matchRules("the weather is nice today")).toBeNull();
    });
  });
});
