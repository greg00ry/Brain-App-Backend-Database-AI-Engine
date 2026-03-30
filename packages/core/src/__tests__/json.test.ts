import { describe, it, expect } from "vitest";
import { cleanAndParseJSON } from "../utils/json.js";

describe("cleanAndParseJSON", () => {
  it("parses clean JSON", () => {
    expect(cleanAndParseJSON('{"action":"SAVE_ONLY","confidence":90}')).toEqual({
      action: "SAVE_ONLY",
      confidence: 90,
    });
  });

  it("strips markdown code blocks", () => {
    const input = '```json\n{"action":"SAVE_ONLY"}\n```';
    expect(cleanAndParseJSON(input)).toEqual({ action: "SAVE_ONLY" });
  });

  it("extracts JSON from surrounding text", () => {
    const input = 'Here is the result: {"action":"RESEARCH_BRAIN","confidence":85} done.';
    expect(cleanAndParseJSON(input)).toEqual({ action: "RESEARCH_BRAIN", confidence: 85 });
  });

  it("removes trailing commas", () => {
    const input = '{"action":"SAVE_ONLY","confidence":90,}';
    expect(cleanAndParseJSON(input)).toEqual({ action: "SAVE_ONLY", confidence: 90 });
  });

  it("strips inline comments", () => {
    const input = '{"action":"SAVE_ONLY", // classified\n"confidence":90}';
    expect(cleanAndParseJSON(input)).toEqual({ action: "SAVE_ONLY", confidence: 90 });
  });

  it("returns null for invalid JSON", () => {
    expect(cleanAndParseJSON("not json at all")).toBeNull();
    expect(cleanAndParseJSON("")).toBeNull();
  });
});
