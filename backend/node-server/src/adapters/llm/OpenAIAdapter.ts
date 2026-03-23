import { ILLMAdapter, LLMRequest } from "./ILLMAdapter.js";

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI ADAPTER - OpenAI API (gpt-4o, gpt-4-turbo, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30_000;

export class OpenAIAdapter implements ILLMAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gpt-4o",
    private readonly timeout: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async complete(request: LLMRequest): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const messages = [
        ...(request.systemPrompt
          ? [{ role: "system", content: request.systemPrompt }]
          : []),
        { role: "user", content: request.userPrompt },
      ];

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? null;

    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
