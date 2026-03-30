import { describe, it, expect, vi, beforeEach } from "vitest";
import { Brain } from "../Brain.js";
import type { ILLMAdapter, LLMRequest } from "../adapters/ILLMAdapter.js";
import type { IStorageAdapter } from "../adapters/IStorageAdapter.js";

// ─── Minimal mock storage ────────────────────────────────────────────────────

function makeMockStorage(): IStorageAdapter {
  return {
    createEntry: vi.fn().mockResolvedValue({ _id: "entry-1", rawText: "test", strength: 5 }),
    getEntryById: vi.fn().mockResolvedValue(null),
    getVaultData: vi.fn().mockResolvedValue({ entries: [], memories: [], categories: [] }),
    deleteVaultEntry: vi.fn().mockResolvedValue(null),
    getCategories: vi.fn().mockResolvedValue([]),
    getUniqueUserIds: vi.fn().mockResolvedValue([]),
    getActions: vi.fn().mockResolvedValue([
      { name: "RESEARCH_BRAIN", description: "user asks about memory" },
      { name: "SAVE_ONLY", description: "user wants to save" },
    ]),
    upsertAction: vi.fn().mockResolvedValue(undefined),
    getChatHistory: vi.fn().mockResolvedValue([]),
    appendChatMessage: vi.fn().mockResolvedValue(undefined),
    findRelevantEntries: vi.fn().mockResolvedValue([]),
    findSimilarEntries: vi.fn().mockResolvedValue([]),
    updateEntryEmbedding: vi.fn().mockResolvedValue(undefined),
    findDeltaEntries: vi.fn().mockResolvedValue([]),
    findContextEntries: vi.fn().mockResolvedValue([]),
    applyTopicAnalysis: vi.fn().mockResolvedValue(0),
    findStrongEntries: vi.fn().mockResolvedValue([]),
    upsertLTM: vi.fn().mockResolvedValue(undefined),
    markConsolidated: vi.fn().mockResolvedValue(undefined),
    getSynapsesBySource: vi.fn().mockResolvedValue([]),
    processSynapseLinks: vi.fn().mockResolvedValue(0),
    getConsolidatedEntryIds: vi.fn().mockResolvedValue([]),
    findEntriesToDecay: vi.fn().mockResolvedValue([]),
    decayEntries: vi.fn().mockResolvedValue(0),
    pruneDeadEntries: vi.fn().mockResolvedValue(0),
    pruneDeadSynapses: vi.fn().mockResolvedValue(0),
    findEntriesReadyForLTM: vi.fn().mockResolvedValue([]),
    countEntries: vi.fn().mockResolvedValue(0),
  } as unknown as IStorageAdapter;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Brain", () => {
  let llm: ILLMAdapter;
  let storage: IStorageAdapter;
  let brain: Brain;

  beforeEach(async () => {
    llm = {
      complete: vi.fn().mockImplementation((req: LLMRequest) => {
        // Intent classification — prompt contains "### ROLE"
        if (req.userPrompt?.includes("### ROLE")) {
          return Promise.resolve('{"action":"SAVE_ONLY","confidence":90,"reasoning":"user is sharing info"}');
        }
        // Analyze text — prompt contains "Analyze the following text"
        if (req.userPrompt?.includes("Analyze the following text")) {
          return Promise.resolve('{"summary":"test note","tags":["test"],"strength":5,"category":"general"}');
        }
        // Personality response (SAVE_ONLY handler)
        return Promise.resolve("Ciekawe! Opowiedz mi więcej.");
      }),
    };
    storage = makeMockStorage();
    brain = new Brain(llm, storage);
    await brain.loadActions();
  });

  it("loadActions seeds built-in actions", async () => {
    expect(storage.upsertAction).toHaveBeenCalledWith("RESEARCH_BRAIN", expect.any(String), true);
    expect(storage.upsertAction).toHaveBeenCalledWith("SAVE_ONLY", expect.any(String), true);
  });

  it("process SAVE_ONLY returns answer and entryId", async () => {
    const result = await brain.process("user-1", "Mam spotkanie jutro o 10");
    expect(result.action).toBe("SAVE_ONLY");
    expect(result.answer).toBeTruthy();
    expect(result.entryId).toBeDefined();
  });

  it("process SAVE_ONLY appends chat history", async () => {
    await brain.process("user-1", "Mam spotkanie jutro o 10");
    expect(storage.appendChatMessage).toHaveBeenCalledWith("user-1", "user", expect.any(String), expect.any(Number));
    expect(storage.appendChatMessage).toHaveBeenCalledWith("user-1", "assistant", expect.any(String), expect.any(Number));
  });

  it("process RESEARCH_BRAIN calls llm for answer", async () => {
    (llm.complete as ReturnType<typeof vi.fn>).mockImplementation((req: LLMRequest) => {
      if (req.userPrompt?.includes("AVAILABLE ACTIONS")) {
        return Promise.resolve('{"action":"RESEARCH_BRAIN","confidence":92,"reasoning":"memory query"}');
      }
      return Promise.resolve("Nie mam jeszcze nic na ten temat.");
    });

    const result = await brain.process("user-1", "co wiem o Pythonie");
    expect(result.action).toBe("RESEARCH_BRAIN");
    expect(result.answer).toBeTruthy();
  });

  it("registerAction adds custom handler", async () => {
    const handler = vi.fn().mockResolvedValue("custom response");

    // getActions returns updated list after registration
    (storage.getActions as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { name: "RESEARCH_BRAIN", description: "user asks about memory" },
      { name: "SAVE_ONLY", description: "user wants to save" },
      { name: "CUSTOM_ACTION", description: "does something custom" },
    ]);

    await brain.registerAction("CUSTOM_ACTION", "does something custom", handler);

    (llm.complete as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      '{"action":"CUSTOM_ACTION","confidence":90,"reasoning":"matched"}'
    );

    const result = await brain.process("user-1", "do the custom thing");
    expect(result.action).toBe("CUSTOM_ACTION");
    expect(handler).toHaveBeenCalled();
  });
});
