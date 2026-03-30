import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileStorageAdapter } from "../FileStorageAdapter.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const TEST_DIR = path.join(os.tmpdir(), `brain-test-${Date.now()}`);

describe("FileStorageAdapter", () => {
  let adapter: FileStorageAdapter;

  beforeEach(() => {
    adapter = new FileStorageAdapter(TEST_DIR);
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("createEntry and getEntryById", async () => {
    const entry = await adapter.createEntry("user-1", "test note", {
      summary: "test summary",
      tags: ["test"],
      strength: 5,
      category: "general",
      isProcessed: false,
    });

    expect(entry._id).toBeTruthy();
    expect(entry.rawText).toBe("test note");

    const found = await adapter.getEntryById(String(entry._id));
    expect(found?.rawText).toBe("test note");
  });

  it("getEntryById returns null for unknown id", async () => {
    const result = await adapter.getEntryById("nonexistent-id");
    expect(result).toBeNull();
  });

  it("findRelevantEntries matches keywords", async () => {
    await adapter.createEntry("user-1", "Python async programming", {
      summary: "async Python", tags: ["python"], strength: 5, category: "dev", isProcessed: false,
    });
    await adapter.createEntry("user-1", "JavaScript promises", {
      summary: "JS promises", tags: ["js"], strength: 5, category: "dev", isProcessed: false,
    });

    const results = await adapter.findRelevantEntries("user-1", ["python"]);
    expect(results.length).toBe(1);
    expect(results[0].rawText).toContain("Python");
  });

  it("chat history stores and retrieves messages", async () => {
    await adapter.appendChatMessage("user-1", "user", "hello", 10);
    await adapter.appendChatMessage("user-1", "assistant", "hi there", 10);

    const history = await adapter.getChatHistory("user-1");
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[0].content).toBe("hello");
    expect(history[1].role).toBe("assistant");
  });

  it("chat history respects maxMessages sliding window", async () => {
    for (let i = 0; i < 5; i++) {
      await adapter.appendChatMessage("user-1", "user", `message ${i}`, 3);
    }

    const history = await adapter.getChatHistory("user-1");
    expect(history.length).toBeLessThanOrEqual(3);
    expect(history[history.length - 1].content).toBe("message 4");
  });

  it("upsertAction and getActions", async () => {
    await adapter.upsertAction("CUSTOM_ACTION", "does something", false);
    await adapter.upsertAction("BUILT_IN", "built-in action", true);

    const actions = await adapter.getActions();
    expect(actions.some(a => a.name === "CUSTOM_ACTION")).toBe(true);
    expect(actions.some(a => a.name === "BUILT_IN")).toBe(true);
  });

  it("upsertAction updates existing", async () => {
    await adapter.upsertAction("MY_ACTION", "old description", false);
    await adapter.upsertAction("MY_ACTION", "new description", false);

    const actions = await adapter.getActions();
    const action = actions.find(a => a.name === "MY_ACTION");
    expect(action?.description).toBe("new description");
    expect(actions.filter(a => a.name === "MY_ACTION")).toHaveLength(1);
  });
});
