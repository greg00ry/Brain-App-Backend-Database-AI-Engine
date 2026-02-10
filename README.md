# 🧠 The Brain App - Backend

A biologically-inspired memory system that mimics how the human brain processes, stores, and forgets information.

## 🌟 Features

### Memory Architecture
- **VaultEntry** - Short-term memory storage with strength-based retention
- **LongTermMemory** - Consolidated memories that persist
- **Synapse** - Neural connections between related memories
- **Categories** - Semantic organization of memories

### Cognitive Processes

#### 👁️ Consciousness (Świadomość)
- AI-driven analysis of new entries
- Semantic connection discovery
- Category assignment and tagging
- Long-term memory consolidation

#### 🌘 Subconsciousness (Podświadomość)
- Automatic memory decay (strength -1 per day for inactive entries)
- Pruning of forgotten memories (strength ≤ 0)
- Identification of strong memories for LTM

#### 💤 Dreaming Mode
- Synapse decay for unused connections
- Pruning of weak synapses
- Memory consolidation during "sleep"

## 🛠️ Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** Passport.js (Local + JWT strategies)
- **AI:** LM Studio (OpenAI-compatible local LLM)
- **Scheduling:** node-cron

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/brain-app-backend.git
cd brain-app-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Seed categories
npm run seed:categories

# Start development server
npm run dev
```

## ⚙️ Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/brain-app
JWT_SECRET=your-super-secret-jwt-key-change-me
LM_STUDIO_URL=http://localhost:1234
```

## 🚀 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run seed:categories` | Seed default categories |
| `npm run seed:test` | Seed test data for development |
| `npm run dev:test-conscious` | Run with consciousness test on startup |
| `npm run dev:test-subconscious` | Run with subconsciousness test on startup |
| `npm run dev:test-full` | Run full vault processor on startup |
| `npm run dev:test-dreaming` | Run dreaming mode on startup |

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Vault Entries
- `GET /api/entries` - Get all entries
- `POST /api/entries` - Create new entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Long-term Memory
- `GET /api/memory` - Get all LTM entries
- `GET /api/memory/by-category` - Get LTM grouped by category
- `POST /api/memory` - Create LTM entry
- `PUT /api/memory/:id` - Update LTM entry
- `DELETE /api/memory/:id` - Delete LTM entry

### Synapses
- `GET /api/synapses` - Get all synapses
- `GET /api/synapses/stats` - Get synapse statistics
- `GET /api/synapses/strongest` - Get strongest connections
- `GET /api/synapses/context/:entryId` - Get connected entries
- `POST /api/synapses/fire` - Fire a synapse (strengthen connection)

### Categories
- `GET /api/categories` - Get all categories

### Jobs (Manual Triggers)
- `POST /api/jobs/process-vault` - Run full vault processor
- `POST /api/jobs/subconscious` - Run subconsciousness only
- `POST /api/jobs/conscious` - Run consciousness only
- `POST /api/jobs/dreaming-mode` - Run dreaming mode
- `GET /api/jobs/status` - Get job status

### OpenAI-Compatible Proxy (LM Studio)
- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Chat completion
- `POST /v1/completions` - Text completion
- `POST /v1/embeddings` - Generate embeddings

## 🧪 Testing

```bash
# Seed test data
npm run seed:test

# Run with consciousness processor
npm run dev:test-conscious

# Run with subconsciousness processor
npm run dev:test-subconscious

# Run full processor
npm run dev:test-full
```

## 📊 Data Models

### VaultEntry
```typescript
{
  userId: string;
  rawText: string;
  summary: string | null;
  tags: string[];
  strength: number; // 0-10, decays over time
  category: string | null;
  isAnalyzed: boolean;
  isConsolidated: boolean;
  lastActivityAt: Date;
}
```

### Synapse
```typescript
{
  from: ObjectId; // VaultEntry reference
  to: ObjectId;   // VaultEntry reference
  weight: number; // 0.0-1.0, connection strength
  stability: number; // 0.0-1.0, resistance to decay
  reason: string; // AI-generated explanation
  lastFired: Date;
}
```

### LongTermMemory
```typescript
{
  userId: string;
  summary: string;
  tags: string[];
  categoryId: ObjectId | null;
  categoryName: string;
  topic: string;
  sourceEntryIds: ObjectId[];
  strength: number;
}
```

## 🔄 Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Vault Processor | Daily at midnight | Full consciousness + subconsciousness |
| Dreaming Mode | Daily at 3:00 AM | Synapse decay and pruning |

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
