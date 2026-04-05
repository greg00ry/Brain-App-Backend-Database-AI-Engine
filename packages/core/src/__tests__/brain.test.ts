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

  // ─── Unknown action ────────────────────────────────────────────────────────

  it("process returns error message for unknown action without handler", async () => {
    // LLM returns an action name that exists in cache but has no handler
    (storage.getActions as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: "SAVE_ONLY", description: "save" },
      { name: "GHOST_ACTION", description: "ghost" },
    ]);
    await brain.loadActions();

    (llm.complete as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      '{"action":"GHOST_ACTION","confidence":90,"reasoning":"ghost"}'
    );

    const result = await brain.process("user-1", "something");
    expect(result.action).toBe("GHOST_ACTION");
    expect(result.answer).toContain("GHOST_ACTION");
    expect(result.entryId).toBeUndefined();
  });

  // ─── SAVE_ONLY fallback answer ─────────────────────────────────────────────

  it("SAVE_ONLY returns fallback answer when LLM returns null", async () => {
    (llm.complete as ReturnType<typeof vi.fn>).mockImplementation((req: LLMRequest) => {
      if (req.userPrompt?.includes("### ROLE")) return Promise.resolve('{"action":"SAVE_ONLY","confidence":90,"reasoning":"save"}');
      if (req.userPrompt?.includes("Analyze the following text")) return Promise.resolve('{"summary":"s","tags":[],"strength":5,"category":"Tech"}');
      return Promise.resolve(null); // SAVE_ONLY handler gets null
    });
    const result = await brain.process("user-1", "some fact");
    expect(result.answer).toBe("Zapisałem to.");
  });

  // ─── RESEARCH_BRAIN fallback answer ───────────────────────────────────────

  it("RESEARCH_BRAIN returns fallback answer when LLM returns null", async () => {
    (llm.complete as ReturnType<typeof vi.fn>).mockImplementation((req: LLMRequest) => {
      if (req.userPrompt?.includes("### ROLE")) return Promise.resolve('{"action":"RESEARCH_BRAIN","confidence":92,"reasoning":"recall"}');
      return Promise.resolve(null);
    });
    const result = await brain.process("user-1", "co wiem o pythonie?");
    expect(result.answer).toBe("Coś poszło nie tak z generowaniem odpowiedzi.");
  });

  // ─── RESEARCH_BRAIN without context ──────────────────────────────────────

  it("RESEARCH_BRAIN without context uses fallback prompt", async () => {
    (storage.findRelevantEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (llm.complete as ReturnType<typeof vi.fn>).mockImplementation((req: LLMRequest) => {
      if (req.userPrompt?.includes("### ROLE")) return Promise.resolve('{"action":"RESEARCH_BRAIN","confidence":92,"reasoning":"recall"}');
      // capture what prompt was used
      return Promise.resolve("I don't know yet");
    });
    const result = await brain.process("user-1", "co wiem o kwantach?");
    expect(result.answer).toBe("I don't know yet");
    // the no-context prompt contains this phrase
    const calls = (llm.complete as ReturnType<typeof vi.fn>).mock.calls;
    const researchCall = calls.find(c => c[0].userPrompt?.includes("don't have anything stored"));
    expect(researchCall).toBeDefined();
  });

  // ─── RESEARCH_BRAIN appends chat history ─────────────────────────────────

  it("RESEARCH_BRAIN also appends chat history", async () => {
    (llm.complete as ReturnType<typeof vi.fn>).mockImplementation((req: LLMRequest) => {
      if (req.userPrompt?.includes("### ROLE")) return Promise.resolve('{"action":"RESEARCH_BRAIN","confidence":92,"reasoning":"recall"}');
      return Promise.resolve("odpowiedź");
    });
    await brain.process("user-1", "co wiem?");
    expect(storage.appendChatMessage).toHaveBeenCalledWith("user-1", "user", expect.any(String), expect.any(Number));
    expect(storage.appendChatMessage).toHaveBeenCalledWith("user-1", "assistant", expect.any(String), expect.any(Number));
  });

  // ─── registerAction ────────────────────────────────────────────────────────

  it("registerAction calls upsertAction with isBuiltIn=false", async () => {
    (storage.getActions as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await brain.registerAction("MY_ACTION", "desc", vi.fn().mockResolvedValue("ok"));
    expect(storage.upsertAction).toHaveBeenCalledWith("MY_ACTION", "desc", false);
  });

  it("registerAction refreshes actionsCache from storage", async () => {
    const updatedActions = [
      { name: "SAVE_ONLY", description: "save" },
      { name: "MY_ACTION", description: "desc" },
    ];
    (storage.getActions as ReturnType<typeof vi.fn>).mockResolvedValue(updatedActions);
    await brain.registerAction("MY_ACTION", "desc", vi.fn().mockResolvedValue("ok"));
    expect(storage.getActions).toHaveBeenCalled();
  });

  it("custom handler receives userId, text, context, llm, chatHistory", async () => {
    const handler = vi.fn().mockResolvedValue("handled");
    (storage.getActions as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: "SAVE_ONLY", description: "save" },
      { name: "MY_ACTION", description: "my" },
    ]);
    (storage.getChatHistory as ReturnType<typeof vi.fn>).mockResolvedValue([
      { role: "user", content: "prev message" },
    ]);
    await brain.registerAction("MY_ACTION", "my", handler);

    (llm.complete as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      '{"action":"MY_ACTION","confidence":90,"reasoning":"matched"}'
    );

    await brain.process("user-42", "trigger it");
    expect(handler).toHaveBeenCalledWith(
      "user-42",
      "trigger it",
      expect.objectContaining({ synapticTree: expect.any(String), hasContext: expect.any(Boolean) }),
      expect.any(Object), // llm
      expect.arrayContaining([expect.objectContaining({ role: "user" })]),
    );
  });

  // ─── recall() and save() ──────────────────────────────────────────────────

  it("recall() delegates to getBrainContext and returns context", async () => {
    (storage.findRelevantEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const result = await brain.recall("user-1", "python tips");
    expect(result).toHaveProperty("hasContext");
    expect(result).toHaveProperty("synapticTree");
    expect(result).toHaveProperty("relevantEntries");
  });

  it("save() delegates to proccessAndStore and returns entry", async () => {
    const result = await brain.save("user-1", "some fact to save");
    expect(result).toBeDefined();
    expect(storage.createEntry).toHaveBeenCalledWith("user-1", "some fact to save", expect.any(Object));
  });

  // ─── runMaintenance() ─────────────────────────────────────────────────────

  it("runMaintenance returns subStats and consciousStats", async () => {
    const result = await brain.runMaintenance();
    expect(result).toHaveProperty("subStats");
    expect(result).toHaveProperty("consciousStats");
    expect(result.subStats).toHaveProperty("decayed");
    expect(result.consciousStats).toHaveProperty("analyzed");
  });

  it("runMaintenance calls subconscious and conscious processors", async () => {
    await brain.runMaintenance();
    // subconscious calls these
    expect(storage.getConsolidatedEntryIds).toHaveBeenCalled();
    expect(storage.pruneDeadEntries).toHaveBeenCalled();
    // conscious calls these
    expect(storage.getCategories).toHaveBeenCalled();
  });

  // ─── Maintenance triggered every MAINTENANCE_EVERY_N saves ───────────────

  it("maintenance is triggered after every 20th SAVE_ONLY (fire and forget)", async () => {
    const maintenanceSpy = vi.spyOn(brain, "runMaintenance").mockResolvedValue({
      subStats: { decayed: 0, pruned: 0, readyForLTM: 0, totalProcessed: 0 },
      consciousStats: { analyzed: 0, consolidated: 0, synapsesCreated: 0 },
    });

    for (let i = 0; i < 20; i++) {
      await brain.process("user-1", `fact number ${i}`);
      await Promise.resolve();
    }

    expect(maintenanceSpy).toHaveBeenCalledTimes(1);
  });

  it("maintenance not triggered before 20th save", async () => {
    const maintenanceSpy = vi.spyOn(brain, "runMaintenance").mockResolvedValue({
      subStats: { decayed: 0, pruned: 0, readyForLTM: 0, totalProcessed: 0 },
      consciousStats: { analyzed: 0, consolidated: 0, synapsesCreated: 0 },
    });

    for (let i = 0; i < 19; i++) {
      await brain.process("user-1", `fact number ${i}`);
    }

    expect(maintenanceSpy).not.toHaveBeenCalled();
  });

  // ─── process() uses actionsCache when loaded ─────────────────────────────

  it("process uses BUILT_IN_ACTIONS when actionsCache is empty (no loadActions called)", async () => {
    const freshBrain = new Brain(llm, storage);
    // no loadActions — actionsCache is empty → falls back to BUILT_IN_ACTIONS
    const result = await freshBrain.process("user-1", "save this fact");
    expect(["SAVE_ONLY", "RESEARCH_BRAIN"]).toContain(result.action);
  });

  it("process passes chat history from storage to classifyIntent", async () => {
    const history = [
      { role: "user" as const, content: "earlier message" },
      { role: "assistant" as const, content: "earlier reply" },
    ];
    (storage.getChatHistory as ReturnType<typeof vi.fn>).mockResolvedValue(history);

    await brain.process("user-1", "follow up");

    // LLM is called for intent classification — check that prompt contains history
    const intentCall = (llm.complete as ReturnType<typeof vi.fn>).mock.calls
      .find(c => c[0].userPrompt?.includes("### ROLE"));
    expect(intentCall).toBeDefined();
    // The prompt is built with chat history included
    expect(intentCall![0].userPrompt).toContain("earlier message");
  });
});
