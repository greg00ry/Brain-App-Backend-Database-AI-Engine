# @the-brain/adapter-mongo

MongoDB storage adapter for [@the-brain/core](https://www.npmjs.com/package/@the-brain/core).

Recommended for production — enables full graph queries, synaptic connections, and atomic strength updates.

## Install

```bash
npm install @the-brain/adapter-mongo mongoose
```

## Usage

```typescript
import { Brain, OpenAICompatibleAdapter } from "@the-brain/core";
import { MongoStorageAdapter, connectDB } from "@the-brain/adapter-mongo";

await connectDB("mongodb://localhost:27017/brain");

const brain = new Brain(
  new OpenAICompatibleAdapter(
    "http://localhost:11434/v1/chat/completions",
    "llama3.2"
  ),
  new MongoStorageAdapter()
);

await brain.loadActions();
```

`connectDB` reads `MONGODB_URI` from env if no argument is passed:

```bash
MONGODB_URI=mongodb://localhost:27017/brain
```

## Why MongoDB

Some features of `@the-brain/core` require MongoDB to work at full capacity:

| Feature | MongoDB | SQLite |
|---|---|---|
| Synaptic graph traversal | ✅ | ✅ |
| Atomic strength decay | ✅ | ✅ |
| Embedding similarity search | ✅ (JS cosine) | ✅ (JS cosine) |
| Multi-user at scale | ✅ | ⚠️ |
| Zero-config setup | ❌ | ✅ |

## License

AGPL-3.0 — [github.com/greg00ry/the-brain](https://github.com/greg00ry/the-brain)
