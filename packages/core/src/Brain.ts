import { ILLMAdapter } from "./adapters/ILLMAdapter.js";
import { IStorageAdapter, ActionInfo } from "./adapters/IStorageAdapter.js";
import { IEmbeddingAdapter } from "./adapters/IEmbeddingAdapter.js";
import { classifyIntent, ChatMessage } from "./services/ai/intent.service.js";
import { getBrainContext } from "./services/ai/intent.context.service.js";
import { proccessAndStore } from "./services/ingest/ingest.service.js";
import { runSubconsciousRoutine } from "./services/brain/subconscious.routine.js";
import { runConsciousProcessor } from "./services/brain/conscious.processor.js";
import { RESEARCH_ANSWER_PROMPT } from "./services/ai/prompts/research-answer.prompt.js";
import { SAVE_RESPONSE_PROMPT } from "./services/ai/prompts/save-response.prompt.js";
import { PERSONALITY_SYSTEM_PROMPT } from "./services/ai/prompts/personality.prompt.js";
import { LLM, CHAT } from "./config/constants.js";

export type ActionHandler = (
  userId: string,
  text: string,
  context: { synapticTree: string; hasContext: boolean },
  llm: ILLMAdapter,
  chatHistory?: { role: string; content: string }[],
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
  private saveCount = 0;

  constructor(
    private readonly llm: ILLMAdapter,
    private readonly storage: IStorageAdapter,
    private readonly embedding?: IEmbeddingAdapter,
  ) {
    this.handlers.set("RESEARCH_BRAIN", async (_userId, text, { synapticTree, hasContext }, _llm, chatHistory) => {
      const prompt = hasContext
        ? RESEARCH_ANSWER_PROMPT(text, synapticTree, chatHistory)
        : `The user asked: "${text}"\n\nYou don't have anything stored about this yet. Let them know and ask if they want to tell you more.`;

      const answer = await this.llm.complete({
        systemPrompt: PERSONALITY_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: LLM.INTENT_TEMPERATURE,
        maxTokens: LLM.INTENT_MAX_TOKENS,
      });
      return answer ?? "Coś poszło nie tak z generowaniem odpowiedzi.";
    });

    this.handlers.set("SAVE_ONLY", async (_userId, text, _context, _llm, chatHistory) => {
      const answer = await this.llm.complete({
        systemPrompt: PERSONALITY_SYSTEM_PROMPT,
        userPrompt: SAVE_RESPONSE_PROMPT(text, chatHistory),
        temperature: 0.8,
        maxTokens: 150,
      });
      return answer ?? "Zapisałem to.";
    });
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

  async process(userId: string, text: string): Promise<ProcessResult> {
    const actions = this.actionsCache.length > 0 ? this.actionsCache : BUILT_IN_ACTIONS;

    // Load persistent chat history from DB
    const chatHistory = await this.storage.getChatHistory(userId);

    const intent = await classifyIntent({ userText: text, chatHistory, actions }, this.llm);

    const context = await getBrainContext(userId, text, this.storage, this.embedding);

    const handler = this.handlers.get(intent.action);
    if (!handler) {
      return { action: intent.action, answer: `Nieznana akcja: ${intent.action}` };
    }

    let answer: string;

    if (intent.action === "SAVE_ONLY") {
      const entry = await proccessAndStore(userId, text, this.llm, this.storage, this.embedding);
      answer = await handler(userId, text, context, this.llm, chatHistory);

      // Trigger maintenance every N saves (fire and forget)
      this.saveCount++;
      if (this.saveCount % CHAT.MAINTENANCE_EVERY_N === 0) {
        this.runMaintenance().catch(err => console.error('[Brain] Maintenance error:', err));
      }

      // Persist chat history
      await this.storage.appendChatMessage(userId, "user", text, CHAT.HISTORY_MAX_STORED);
      await this.storage.appendChatMessage(userId, "assistant", answer, CHAT.HISTORY_MAX_STORED);

      return { action: "SAVE_ONLY", answer, entryId: entry._id };
    }

    answer = await handler(userId, text, context, this.llm, chatHistory);

    await this.storage.appendChatMessage(userId, "user", text, CHAT.HISTORY_MAX_STORED);
    await this.storage.appendChatMessage(userId, "assistant", answer, CHAT.HISTORY_MAX_STORED);

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
