import { IEmbeddingAdapter } from "../IEmbeddingAdapter.js";

// Works with any OpenAI-compatible embeddings API: LM Studio, Ollama, OpenAI, etc.
export class OpenAICompatibleEmbeddingAdapter implements IEmbeddingAdapter {
  constructor(
    private readonly url: string = "http://localhost:1234/v1/embeddings",
    private readonly model: string = "nomic-embed-text",
    private readonly apiKey: string = "local",
  ) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: text }),
    });

    if (!response.ok) {
      throw new Error(`Embeddings API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: { embedding: number[] }[] };
    return data.data[0].embedding;
  }
}
