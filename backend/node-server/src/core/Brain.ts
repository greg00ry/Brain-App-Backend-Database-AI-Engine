import { ILLMAdapter } from "../adapters/llm/ILLMAdapter.js";
import { IStorageAdapter, ActionInfo } from "../adapters/storage/IStorageAdapter.js";
import { IEmbeddingAdapter } from "../adapters/embedding/IEmbeddingAdapter.js";
import { classifyIntent, ChatMessage } from "../services/ai/intent.service.js";
import { getBrainContext } from "../services/ai/intent.context.service.js";
import { proccessAndStore } from "../services/ingest/ingest.service.js";
import { runSubconsciousRoutine } from "../services/brain/subconscious.routine.js";
import { runConsciousProcessor } from "../services/brain/conscious.processor.js";
import { RESEARCH_ANSWER_PROMPT } from "../services/ai/prompts/research-answer.prompt.js";
import { LLM } from "../config/constants.js";

export type ActionHandler = (
  userId: string,
  text: string,
  context: { synapticTree: string; hasContext: boolean },
  llm: ILLMAdapter,
) => Promise<string>;

export interface ProcessResult {
  action: string;
  answer: string;
  entryId?: unknown;
}

// ─── Built-in handlers ────────────────────────────────────────────────────────

const BUILT_IN_ACTIONS: { name: string; description: string }[] = [
  { name: "RESEARCH_BRAIN", description: "user asks a question about past notes, memory, or stored knowledge" },
  { name: "SAVE_ONLY", description: "user states a fact, shares info, or wants to store something" },
];

export class Brain {
  private actionsCache: ActionInfo[] = [];
  private handlers = new Map<string, ActionHandler>();

  constructor(
    private readonly llm: ILLMAdapter,
    private readonly storage: IStorageAdapter,
    private readonly embedding?: IEmbeddingAdapter,
  ) {
    this.handlers.set("RESEARCH_BRAIN", async (userId, text, { synapticTree, hasContext }) => {
      if (!hasContext) return "Nie znalazłem nic w pamięci na ten temat.";
      const prompt = RESEARCH_ANSWER_PROMPT(text, synapticTree);
      const answer = await this.llm.complete({
        userPrompt: prompt,
        temperature: LLM.INTENT_TEMPERATURE,
        maxTokens: LLM.INTENT_MAX_TOKENS,
      });
      return answer ?? "Znalazłem wspomnienia, ale nie udało mi się wygenerować odpowiedzi.";
    });

    this.handlers.set("SAVE_ONLY", async () => "Zapisano.");
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async loadActions(): Promise<void> {
    // Seed built-in actions if not present
    for (const action of BUILT_IN_ACTIONS) {
      await this.storage.upsertAction(action.name, action.description, true);
    }
    this.actionsCache = await this.storage.getActions();
  }

  async registerAction(name: string, description: string, handler: ActionHandler): Promise<void> {
    await this.storage.upsertAction(name, description, false);
    this.actionsCache = await this.storage.getActions();
    this.handlers.set(name, handler);
  }

  // ─── Process ──────────────────────────────────────────────────────────────

  async process(userId: string, text: string, chatHistory?: ChatMessage[]): Promise<ProcessResult> {
    const actions = this.actionsCache.length > 0 ? this.actionsCache : BUILT_IN_ACTIONS;

    const intent = await classifyIntent({ userText: text, chatHistory, actions }, this.llm);

    const context = await getBrainContext(userId, text, this.storage, this.embedding);

    const handler = this.handlers.get(intent.action);
    if (!handler) {
      return { action: intent.action, answer: `Nieznana akcja: ${intent.action}` };
    }

    if (intent.action === "SAVE_ONLY") {
      const entry = await proccessAndStore(userId, text, this.llm, this.storage, this.embedding);
      return { action: "SAVE_ONLY", answer: "Zapisano.", entryId: entry._id };
    }

    const answer = await handler(userId, text, context, this.llm);
    return { action: intent.action, answer };
  }

  async recall(userId: string, text: string) {
    return getBrainContext(userId, text, this.storage, this.embedding);
  }

  async save(userId: string, text: string) {
    return proccessAndStore(userId, text, this.llm, this.storage, this.embedding);
  }

  async runMaintenance() {
    const subStats = await runSubconsciousRoutine(this.storage);
    const consciousStats = await runConsciousProcessor(this.llm, this.storage);
    return { subStats, consciousStats };
  }
}
