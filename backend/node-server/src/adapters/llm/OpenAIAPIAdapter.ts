import { ILLMAdapter, LLMRequest } from "./ILLMAdapter.js";
import { LLM } from "../../config/constants.js";

// Works with any OpenAI-compatible API: LM Studio, Ollama, OpenAI, etc.
export class OpenAIAPIAdapter implements ILLMAdapter {
  constructor(
    private readonly url: string = LLM.API_URL,
    private readonly model: string = LLM.MODEL,
    private readonly apiKey: string = "local",
    private readonly timeout: number = LLM.TIMEOUT,
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

      const response = await fetch(this.url, {
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
