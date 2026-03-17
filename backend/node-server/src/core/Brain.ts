import { ILLMAdapter } from "../adapters/llm/ILLMAdapter.js";
import { IStorageAdapter } from "../adapters/storage/IStorageAdapter.js";
import { classifyIntent, ChatMessage } from "../services/ai/intent.service.js";
import { getBrainContext } from "../services/ai/intent.context.service.js";
import { proccessAndStore } from "../services/ingest/ingest.service.js";
import { runSubconsciousRoutine } from "../services/brain/subconscious.routine.js";
import { runConsciousProcessor } from "../services/brain/conscious.processor.js";

export class Brain {
  constructor(
    private readonly llm: ILLMAdapter,
    private readonly storage: IStorageAdapter
  ) {}

  async process(userId: string, text: string, chatHistory?: ChatMessage[]) {
    const [intentResult, entry] = await Promise.all([
      classifyIntent({ userText: text, userId, chatHistory }, this.llm, this.storage),
      proccessAndStore(userId, text, this.llm, this.storage),
    ]);
    return { action: intentResult.action, answer: intentResult.answer, entryId: entry._id };
  }

  async recall(userId: string, text: string) {
    return getBrainContext(userId, text, this.storage);
  }

  async save(userId: string, text: string) {
    return proccessAndStore(userId, text, this.llm, this.storage);
  }

  async runMaintenance() {
    const subStats = await runSubconsciousRoutine(this.storage);
    const consciousStats = await runConsciousProcessor(this.llm, this.storage);
    return { subStats, consciousStats };
  }
}
