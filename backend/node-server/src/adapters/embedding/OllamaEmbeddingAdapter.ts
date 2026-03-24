import { IEmbeddingAdapter } from "./IEmbeddingAdapter.js";

export class OllamaEmbeddingAdapter implements IEmbeddingAdapter {
  constructor(
    private readonly endpoint: string = "http://localhost:11434",
    private readonly model: string = "nomic-embed-text",
  ) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.endpoint}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { embedding: number[] };
    return data.embedding;
  }
}
