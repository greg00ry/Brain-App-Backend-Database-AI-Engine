import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSubconsciousRoutine } from "../services/brain/subconscious.routine.js";
import { IStorageAdapter } from "../adapters/IStorageAdapter.js";
import { IVaultEntry } from "../types/brain.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0;

function makeEntry(overrides: Partial<IVaultEntry> = {}): IVaultEntry {
  const id = `entry-${++idCounter}`;
  return {
    _id: { toString: () => id },
    userId: "user-1",
    rawText: "test entry",
    isAnalyzed: true,
    isConsolidated: false,
    lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    createdAt: new Date(),
    updatedAt: new Date(),
    analysis: { summary: "test", tags: ["tag"], strength: 5, category: "Tech", isProcessed: true },
    ...overrides,
  };
}

function makeStorage(overrides: Partial<IStorageAdapter> = {}): IStorageAdapter {
  return {
    getConsolidatedEntryIds: vi.fn().mockResolvedValue([]),
    findEntriesToDecay: vi.fn().mockResolvedValue([]),
    decayEntries: vi.fn().mockResolvedValue(0),
    pruneDeadEntries: vi.fn().mockResolvedValue(0),
    pruneDeadSynapses: vi.fn().mockResolvedValue(0),
    findEntriesReadyForLTM: vi.fn().mockResolvedValue([]),
    countEntries: vi.fn().mockResolvedValue(0),
    // unused but required by interface
    createEntry: vi.fn(),
    getEntryById: vi.fn(),
    getVaultData: vi.fn(),
    deleteVaultEntry: vi.fn(),
    getCategories: vi.fn(),
    getUniqueUserIds: vi.fn(),
    getActions: vi.fn(),
    upsertAction: vi.fn(),
    getChatHistory: vi.fn(),
    appendChatMessage: vi.fn(),
    findRelevantEntries: vi.fn(),
    findSimilarEntries: vi.fn(),
    updateEntryEmbedding: vi.fn(),
    findDeltaEntries: vi.fn(),
    findContextEntries: vi.fn(),
    applyTopicAnalysis: vi.fn(),
    findStrongEntries: vi.fn(),
    upsertLTM: vi.fn(),
    markConsolidated: vi.fn(),
    getSynapsesBySource: vi.fn(),
    processSynapseLinks: vi.fn(),
    ...overrides,
  } as unknown as IStorageAdapter;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("runSubconsciousRoutine", () => {
  beforeEach(() => { idCounter = 0; });

  // ─── Empty storage ──────────────────────────────────────────────────────

  it("returns zero stats when storage is empty", async () => {
    const storage = makeStorage();
    const stats = await runSubconsciousRoutine(storage);
    expect(stats.decayed).toBe(0);
    expect(stats.pruned).toBe(0);
    expect(stats.readyForLTM).toBe(0);
    expect(stats.totalProcessed).toBe(0);
  });

  // ─── Phase 1: Decay ─────────────────────────────────────────────────────

  it("decays entries that are not consolidated", async () => {
    const entries = [makeEntry(), makeEntry()];
    const storage = makeStorage({
      findEntriesToDecay: vi.fn().mockResolvedValue(entries),
      decayEntries: vi.fn().mockResolvedValue(2),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(storage.decayEntries).toHaveBeenCalledOnce();
    expect(stats.decayed).toBe(2);
  });

  it("skips consolidated entries during decay", async () => {
    const e1 = makeEntry();
    const e2 = makeEntry();
    const storage = makeStorage({
      getConsolidatedEntryIds: vi.fn().mockResolvedValue([e1._id.toString()]),
      findEntriesToDecay: vi.fn().mockResolvedValue([e1, e2]),
      decayEntries: vi.fn().mockResolvedValue(1),
    });
    await runSubconsciousRoutine(storage);
    const calledWith = (storage.decayEntries as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // only e2 should be passed — e1 is consolidated
    expect(calledWith.map((id: { toString(): string }) => id.toString())).toEqual([e2._id.toString()]);
  });

  it("does not call decayEntries when all entries are consolidated", async () => {
    const e = makeEntry();
    const storage = makeStorage({
      getConsolidatedEntryIds: vi.fn().mockResolvedValue([e._id.toString()]),
      findEntriesToDecay: vi.fn().mockResolvedValue([e]),
    });
    await runSubconsciousRoutine(storage);
    expect(storage.decayEntries).not.toHaveBeenCalled();
  });

  it("does not call decayEntries when no entries to decay", async () => {
    const storage = makeStorage({
      findEntriesToDecay: vi.fn().mockResolvedValue([]),
    });
    await runSubconsciousRoutine(storage);
    expect(storage.decayEntries).not.toHaveBeenCalled();
  });

  it("passes correct ids to decayEntries (multiple non-consolidated)", async () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const storage = makeStorage({
      findEntriesToDecay: vi.fn().mockResolvedValue(entries),
      decayEntries: vi.fn().mockResolvedValue(3),
    });
    await runSubconsciousRoutine(storage);
    const calledWith = (storage.decayEntries as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledWith).toHaveLength(3);
  });

  // ─── Phase 2: Pruning ────────────────────────────────────────────────────

  it("prunes dead entries and synapses", async () => {
    const storage = makeStorage({
      pruneDeadEntries: vi.fn().mockResolvedValue(5),
      pruneDeadSynapses: vi.fn().mockResolvedValue(3),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(stats.pruned).toBe(8); // 5 entries + 3 synapses
  });

  it("always calls pruneDeadEntries and pruneDeadSynapses", async () => {
    const storage = makeStorage();
    await runSubconsciousRoutine(storage);
    expect(storage.pruneDeadEntries).toHaveBeenCalledOnce();
    expect(storage.pruneDeadSynapses).toHaveBeenCalledOnce();
  });

  it("stats.pruned is sum of pruned entries and synapses", async () => {
    const storage = makeStorage({
      pruneDeadEntries: vi.fn().mockResolvedValue(10),
      pruneDeadSynapses: vi.fn().mockResolvedValue(7),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(stats.pruned).toBe(17);
  });

  it("stats.pruned is 0 when nothing to prune", async () => {
    const storage = makeStorage({
      pruneDeadEntries: vi.fn().mockResolvedValue(0),
      pruneDeadSynapses: vi.fn().mockResolvedValue(0),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(stats.pruned).toBe(0);
  });

  // ─── Phase 3: Ready for LTM ──────────────────────────────────────────────

  it("counts entries ready for LTM", async () => {
    const strong = [makeEntry({ analysis: { summary: "s", tags: [], strength: 10, category: "Tech", isProcessed: true } }), makeEntry({ analysis: { summary: "s", tags: [], strength: 10, category: "Tech", isProcessed: true } })];
    const storage = makeStorage({
      findEntriesReadyForLTM: vi.fn().mockResolvedValue(strong),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(stats.readyForLTM).toBe(2);
  });

  it("readyForLTM is 0 when no strong entries", async () => {
    const storage = makeStorage({
      findEntriesReadyForLTM: vi.fn().mockResolvedValue([]),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(stats.readyForLTM).toBe(0);
  });

  // ─── totalProcessed ──────────────────────────────────────────────────────

  it("reports total entries count", async () => {
    const storage = makeStorage({
      countEntries: vi.fn().mockResolvedValue(42),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(stats.totalProcessed).toBe(42);
  });

  // ─── Phase order ─────────────────────────────────────────────────────────

  it("calls phases in correct order: consolidatedIds → findToDecay → prune → readyForLTM", async () => {
    const callOrder: string[] = [];
    const storage = makeStorage({
      getConsolidatedEntryIds: vi.fn().mockImplementation(async () => { callOrder.push("getConsolidated"); return []; }),
      findEntriesToDecay: vi.fn().mockImplementation(async () => { callOrder.push("findToDecay"); return []; }),
      pruneDeadEntries: vi.fn().mockImplementation(async () => { callOrder.push("pruneEntries"); return 0; }),
      pruneDeadSynapses: vi.fn().mockImplementation(async () => { callOrder.push("pruneSynapses"); return 0; }),
      findEntriesReadyForLTM: vi.fn().mockImplementation(async () => { callOrder.push("findReadyForLTM"); return []; }),
    });
    await runSubconsciousRoutine(storage);
    expect(callOrder[0]).toBe("getConsolidated");
    expect(callOrder[1]).toBe("findToDecay");
    expect(callOrder.indexOf("pruneEntries")).toBeLessThan(callOrder.indexOf("findReadyForLTM"));
  });

  // ─── Error handling ──────────────────────────────────────────────────────

  it("returns partial stats when storage throws on decay", async () => {
    const storage = makeStorage({
      getConsolidatedEntryIds: vi.fn().mockRejectedValue(new Error("DB down")),
    });
    const stats = await runSubconsciousRoutine(storage);
    // should not throw, returns default stats
    expect(stats).toBeDefined();
    expect(stats.decayed).toBe(0);
  });

  it("returns partial stats when pruneDeadEntries throws", async () => {
    const storage = makeStorage({
      pruneDeadEntries: vi.fn().mockRejectedValue(new Error("IO error")),
    });
    const stats = await runSubconsciousRoutine(storage);
    expect(stats).toBeDefined();
  });
});
