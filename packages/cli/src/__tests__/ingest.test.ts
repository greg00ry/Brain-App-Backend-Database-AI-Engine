import { describe, it, expect } from "vitest";
import { chunkText } from "../index.js";

describe("chunkText", () => {
  it("splits text into chunks of given size", () => {
    const text = "a".repeat(1500);
    const chunks = chunkText(text, 600, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(600);
  });

  it("applies overlap between chunks", () => {
    const text = "abcdefghij".repeat(100); // 1000 chars
    const chunks = chunkText(text, 200, 50);
    // second chunk starts 150 chars into the first
    expect(chunks[1].startsWith(text.slice(150, 160))).toBe(true);
  });

  it("filters out chunks shorter than 20 chars", () => {
    const text = "hello world  " + "x".repeat(600);
    const chunks = chunkText(text, 600, 100);
    chunks.forEach(c => expect(c.length).toBeGreaterThan(20));
  });

  it("returns single chunk when text fits in one", () => {
    const text = "short text here, something meaningful";
    const chunks = chunkText(text, 600, 100);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(text.trim());
  });

  it("handles empty string", () => {
    expect(chunkText("", 600, 100)).toEqual([]);
  });
});
