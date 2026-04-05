# Show HN Comment

---

Hi HN,

I built The Brain because I kept hitting the same problem with AI agents: they don't forget.

Vector databases are good filing cabinets. But human memory isn't a filing cabinet — it decays, consolidates, and forms associations. An agent that treats a passing thought the same as a core belief isn't useful long-term.

So I built a TypeScript framework that implements three things vector DBs don't:

1. **Strength-based decay** — entries lose strength over time. Trivial memories fade. Important ones survive. Runs as pure math, no LLM needed.
2. **Conscious consolidation** — strong memories get summarized by an LLM into long-term knowledge groups. Like sleep consolidation.
3. **Graph RAG with synapses** — entries connect to each other with weighted edges. Retrieval traverses the graph, not just similarity scores.

It's also LLM-agnostic — one adapter works with Ollama, LM Studio, OpenAI, anything OpenAI-compatible. And storage-agnostic — files (zero config) or MongoDB (full features).

This is still early. I've tested it on my setup with my models. I don't know how it behaves with Mistral or on Windows or with someone using it at scale. That's why I'm posting here — I need people to break it and tell me what doesn't work.

Four packages on npm: `@the-brain/core`, `@the-brain/adapter-mongo`, `@the-brain/adapter-files`, `@the-brain/cli`.

```bash
npm install @the-brain/core @the-brain/adapter-files
```

GitHub: https://github.com/greg00ry/the-brain
Longer writeup: [link to Dev.to article]

Happy to answer questions about the architecture, especially the decay/consolidation system — that's the part I'm least sure gets the constants right.

