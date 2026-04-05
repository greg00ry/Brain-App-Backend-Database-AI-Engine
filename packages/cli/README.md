# @the-brain/cli

CLI for [@the-brain/core](https://www.npmjs.com/package/@the-brain/core) — local-first cognitive memory.

Save facts, ask questions, ingest PDFs, and chat interactively — all from the terminal.

## Install

```bash
npm install -g @the-brain/cli
```

## Setup

Create a `.env` file (or export env vars):

```bash
# LLM — any OpenAI-compatible endpoint
LLM_API_URL=http://localhost:11434/v1/chat/completions
LLM_MODEL=llama3.2
# LLM_API_KEY=sk-...   # required for cloud providers

# MongoDB
MONGODB_URI=mongodb://localhost:27017/brain

# Optional: embeddings for semantic search
# EMBEDDING_API_URL=http://localhost:11434/v1/embeddings
# EMBEDDING_MODEL=nomic-embed-text

# Optional: user ID (default: "default")
# BRAIN_USER_ID=my-user
```

Works with any OpenAI-compatible LLM — local (Ollama, LM Studio) or cloud (Groq, OpenAI):

```bash
# Groq (free, fast, no local GPU needed)
LLM_API_URL=https://api.groq.com/openai/v1/chat/completions
LLM_MODEL=llama-3.3-70b-versatile
LLM_API_KEY=gsk_...
```

## Commands

### Interactive chat (default)
```bash
brain
# or
brain chat
```

### Save a fact
```bash
brain save "I prefer tabs over spaces"
brain save "Meeting with team every Monday at 10" --permanent
```

`--permanent` — entry never decays or gets pruned. Use for important facts and ingested documents.

### Ask a question
```bash
brain process "What do I prefer for indentation?"
```

Brain classifies intent automatically — if it's a question it searches memory, if it's a fact it saves it.

### Search memory directly
```bash
brain recall "indentation preferences"
```

### Ingest PDFs
```bash
# Single file
brain ingest ./document.pdf

# Entire folder
brain ingest ./docs/

# Custom chunk size
brain ingest ./manual.pdf --chunk-size 800 --overlap 150
```

PDF content is saved as permanent memory — it never decays.

### Run maintenance
```bash
brain maintenance
```

Triggers decay, pruning, synapse building, and long-term memory consolidation.

## License

AGPL-3.0 — [github.com/greg00ry/the-brain](https://github.com/greg00ry/the-brain)
