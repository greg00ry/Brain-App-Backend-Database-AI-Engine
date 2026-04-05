# @the-brain/adapter-sqlite

SQLite storage adapter for [@the-brain/core](https://www.npmjs.com/package/@the-brain/core).

Zero-config, single-file database. No server required. Good for local tools, CLI apps, and desktop agents.

## Requirements

Node.js >= 22.5.0 (uses built-in `node:sqlite`)

## Install

```bash
npm install @the-brain/adapter-sqlite
```

## Usage

```typescript
import { Brain, OpenAICompatibleAdapter } from "@the-brain/core";
import { SQLiteStorageAdapter } from "@the-brain/adapter-sqlite";

const brain = new Brain(
  new OpenAICompatibleAdapter(
    "http://localhost:11434/v1/chat/completions",
    "llama3.2"
  ),
  new SQLiteStorageAdapter("./.brain") // path to storage directory
);

await brain.loadActions();
```

Database is stored at `./.brain/brain.db`. Schema is created automatically on first run.

## License

AGPL-3.0 — [github.com/greg00ry/the-brain](https://github.com/greg00ry/the-brain)
