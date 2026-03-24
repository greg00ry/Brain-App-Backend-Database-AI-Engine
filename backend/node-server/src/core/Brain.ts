import { ILLMAdapter } from "../adapters/llm/ILLMAdapter.js";
import { IStorageAdapter } from "../adapters/storage/IStorageAdapter.js";
import { IEmbeddingAdapter } from "../adapters/embedding/IEmbeddingAdapter.js";
import { classifyIntent, ChatMessage } from "../services/ai/intent.service.js";
import { getBrainContext } from "../services/ai/intent.context.service.js";
import { proccessAndStore } from "../services/ingest/ingest.service.js";
import { runSubconsciousRoutine } from "../services/brain/subconscious.routine.js";
import { runConsciousProcessor } from "../services/brain/conscious.processor.js";
import { RESEARCH_ANSWER_PROMPT } from "../services/ai/prompts/research-answer.prompt.js";
import { LLM } from "../config/constants.js";

export interface ProcessResult {
  action: string;
  answer: string;
  entryId?: unknown;
}

export class Brain {
  constructor(
    private readonly llm: ILLMAdapter,
    private readonly storage: IStorageAdapter,
    private readonly embedding?: IEmbeddingAdapter,
  ) {}

  async process(userId: string, text: string, chatHistory?: ChatMessage[]): Promise<ProcessResult> {
    const intent = await classifyIntent({ userText: text, chatHistory }, this.llm);

    if (intent.action === "RESEARCH_BRAIN") {
      const { synapticTree, hasContext } = await getBrainContext(userId, text, this.storage, this.embedding);

      if (!hasContext) {
        return { action: "RESEARCH_BRAIN", answer: "Nie znalazłem nic w pamięci na ten temat." };
      }

      const prompt = RESEARCH_ANSWER_PROMPT(text, synapticTree, chatHistory);
      const answer = await this.llm.complete({
        userPrompt: prompt,
        temperature: LLM.INTENT_TEMPERATURE,
        maxTokens: LLM.INTENT_MAX_TOKENS,
      });

      return {
        action: "RESEARCH_BRAIN",
        answer: answer ?? "Znalazłem wspomnienia, ale nie udało mi się wygenerować odpowiedzi.",
      };
    }

    // SAVE_ONLY
    const entry = await proccessAndStore(userId, text, this.llm, this.storage, this.embedding);
    return { action: "SAVE_ONLY", answer: "Zapisano.", entryId: entry._id };
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
