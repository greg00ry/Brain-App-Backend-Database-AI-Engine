import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAICompatibleAdapter } from "../adapters/llm/OpenAICompatibleAdapter.js";
import { OpenAICompatibleEmbeddingAdapter } from "../adapters/embedding/OpenAICompatibleEmbeddingAdapter.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function chatResponse(content: string) {
  return makeResponse({ choices: [{ message: { content } }] });
}

function embeddingResponse(vector: number[]) {
  return makeResponse({ data: [{ embedding: vector }] });
}

// ═══════════════════════════════════════════════════════════════════════════════
// OpenAICompatibleAdapter
// ═══════════════════════════════════════════════════════════════════════════════

describe("OpenAICompatibleAdapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it("returns content from successful response", async () => {
    fetchMock.mockResolvedValue(chatResponse("Hello world"));
    const adapter = new OpenAICompatibleAdapter("http://localhost:1234/v1/chat/completions", "model", "key");
    const result = await adapter.complete({ userPrompt: "Hi" });
    expect(result).toBe("Hello world");
  });

  it("sends POST request to the configured URL", async () => {
    fetchMock.mockResolvedValue(chatResponse("ok"));
    const adapter = new OpenAICompatibleAdapter("http://my-server/v1/chat/completions", "my-model", "key");
    await adapter.complete({ userPrompt: "test" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://my-server/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends Authorization header with Bearer token", async () => {
    fetchMock.mockResolvedValue(chatResponse("ok"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "my-secret-key");
    await adapter.complete({ userPrompt: "test" });
    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers["Authorization"]).toBe("Bearer my-secret-key");
  });

  it("includes system prompt as system message when provided", async () => {
    fetchMock.mockResolvedValue(chatResponse("ok"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    await adapter.complete({ systemPrompt: "You are helpful", userPrompt: "Hello" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: "system", content: "You are helpful" });
    expect(body.messages[1]).toEqual({ role: "user", content: "Hello" });
  });

  it("omits system message when systemPrompt is not provided", async () => {
    fetchMock.mockResolvedValue(chatResponse("ok"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    await adapter.complete({ userPrompt: "Hello" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
  });

  it("sends model, temperature, and max_tokens in request body", async () => {
    fetchMock.mockResolvedValue(chatResponse("ok"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "gpt-test", "key");
    await adapter.complete({ userPrompt: "test", temperature: 0.5, maxTokens: 200 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("gpt-test");
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(200);
  });

  // ─── Non-OK responses ──────────────────────────────────────────────────────

  it("returns null on 400 response", async () => {
    fetchMock.mockResolvedValue(makeResponse({ error: "bad request" }, 400));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  it("returns null on 401 unauthorized", async () => {
    fetchMock.mockResolvedValue(makeResponse({ error: "unauthorized" }, 401));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  it("returns null on 500 server error", async () => {
    fetchMock.mockResolvedValue(makeResponse({ error: "server error" }, 500));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  // ─── Network errors ────────────────────────────────────────────────────────

  it("returns null when fetch throws (network error)", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  it("returns null when fetch is aborted (timeout)", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key", 100);
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  // ─── Missing / malformed response fields ──────────────────────────────────

  it("returns null when choices is empty array", async () => {
    fetchMock.mockResolvedValue(makeResponse({ choices: [] }));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  it("returns null when choices is missing", async () => {
    fetchMock.mockResolvedValue(makeResponse({}));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  it("returns null when message.content is missing", async () => {
    fetchMock.mockResolvedValue(makeResponse({ choices: [{ message: {} }] }));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  it("returns null when message is missing", async () => {
    fetchMock.mockResolvedValue(makeResponse({ choices: [{}] }));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    const result = await adapter.complete({ userPrompt: "test" });
    expect(result).toBeNull();
  });

  // ─── Timeout cleanup ───────────────────────────────────────────────────────

  it("clears timer after successful response (no pending timer leak)", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    fetchMock.mockResolvedValue(chatResponse("ok"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    await adapter.complete({ userPrompt: "test" });
    expect(clearSpy).toHaveBeenCalled();
  });

  it("clears timer after network error", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    fetchMock.mockRejectedValue(new Error("network fail"));
    const adapter = new OpenAICompatibleAdapter("http://localhost/v1/chat", "model", "key");
    await adapter.complete({ userPrompt: "test" });
    expect(clearSpy).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OpenAICompatibleEmbeddingAdapter
// ═══════════════════════════════════════════════════════════════════════════════

describe("OpenAICompatibleEmbeddingAdapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it("returns embedding vector on success", async () => {
    const vector = [0.1, 0.2, 0.3];
    fetchMock.mockResolvedValue(embeddingResponse(vector));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "nomic", "key");
    const result = await adapter.embed("hello");
    expect(result).toEqual(vector);
  });

  it("sends POST to configured URL", async () => {
    fetchMock.mockResolvedValue(embeddingResponse([0.1]));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://my-embed-server/v1/embeddings", "model", "key");
    await adapter.embed("text");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://my-embed-server/v1/embeddings",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends Authorization header with Bearer token", async () => {
    fetchMock.mockResolvedValue(embeddingResponse([0.5]));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "model", "my-key");
    await adapter.embed("text");
    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers["Authorization"]).toBe("Bearer my-key");
  });

  it("sends model and input text in request body", async () => {
    fetchMock.mockResolvedValue(embeddingResponse([0.1]));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "nomic-embed", "key");
    await adapter.embed("the quick brown fox");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("nomic-embed");
    expect(body.input).toBe("the quick brown fox");
  });

  it("returns high-dimensional vector correctly", async () => {
    const vector = Array.from({ length: 768 }, (_, i) => i / 768);
    fetchMock.mockResolvedValue(embeddingResponse(vector));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "model", "key");
    const result = await adapter.embed("text");
    expect(result).toHaveLength(768);
    expect(result[0]).toBeCloseTo(0);
    expect(result[767]).toBeCloseTo(767 / 768);
  });

  // ─── Error responses ───────────────────────────────────────────────────────

  it("throws on 400 response with status text", async () => {
    fetchMock.mockResolvedValue(new Response("Bad Request", { status: 400, statusText: "Bad Request" }));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "model", "key");
    await expect(adapter.embed("text")).rejects.toThrow("400");
  });

  it("throws on 401 unauthorized", async () => {
    fetchMock.mockResolvedValue(new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "model", "key");
    await expect(adapter.embed("text")).rejects.toThrow("Embeddings API error");
  });

  it("throws on 500 server error", async () => {
    fetchMock.mockResolvedValue(new Response("Server Error", { status: 500, statusText: "Internal Server Error" }));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "model", "key");
    await expect(adapter.embed("text")).rejects.toThrow("500");
  });

  // ─── Network errors propagate ──────────────────────────────────────────────

  it("propagates network error (fetch throws)", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "model", "key");
    await expect(adapter.embed("text")).rejects.toThrow("ECONNREFUSED");
  });

  it("propagates timeout (AbortError)", async () => {
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));
    const adapter = new OpenAICompatibleEmbeddingAdapter("http://localhost/v1/embeddings", "model", "key");
    await expect(adapter.embed("text")).rejects.toThrow();
  });
});
