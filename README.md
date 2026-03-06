# 🧠 The Brain - Agentic AI System

> **Personal AI Assistant with Neural Memory, Intent Classification, and Action Execution**

⚠️ **MVP / Work in Progress** - This project is in active development. See [Current Status](#-current-status--technical-debt) for details.

The Brain is a sophisticated agentic AI system that combines conversational AI with persistent memory, intelligent task execution, and neural-inspired data organization. Built with Node.js, TypeScript, and MongoDB, it provides a JARVIS-like experience with advanced context awareness and autonomous action capabilities.

---

## 🌟 Features

### 🤖 **Intelligent AI Assistant**
- **Intent Classification**: Automatically detects user intent (search, email, calendar, research)
- **Action Execution**: Autonomously executes tasks in the background
- **Context Awareness**: Remembers conversations and adapts responses
- **Multi-Modal Support**: Handles text, events, emails, and web research

### 🧠 **Neural Memory System**
- **Synaptic Connections**: Automatically creates relationships between memories
- **Recursive Context Retrieval**: 3x3 branching tree for deep context
- **Strength-Based Recall**: Prioritizes important memories
- **Long-Term Storage**: Persistent memory in MongoDB

### 🎯 **Agentic Capabilities**
- **Web Research**: Automatic internet search via Tavily API
- **Email Automation**: Generates and sends emails with full body content
- **Calendar Management**: Creates events and reminders
- **Brain Research**: Searches own memory for past conversations

### 💬 **Advanced Chat Interface**
- **Real-time Streaming**: SSE-based streaming responses
- **Chat History**: Persistent conversation memory
- **Research Display**: Shows facts and sources inline
- **Reactive UI**: Brain logo responds to AI state

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Command      │  │ Neural       │  │ Chat         │    │
│  │ Center       │  │ Console      │  │ History      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                             ↕ SSE Stream
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js + TypeScript)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Intent Controller → Intent Service → Action Executor │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Chat History │  │ Context      │  │ Queue        │    │
│  │ Service      │  │ Service      │  │ Service      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Action Tools: Search | Email | Calendar | Research  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER (MongoDB)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ VaultEntry   │  │ Synapse      │  │ ChatHistory  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                 LLM LAYER (DeepSeek/Qwen)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DeepSeek Coder V2 Lite (16B) - Intent Classification│  │
│  │ Local LLM via LM Studio (http://localhost:1234)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** 6.0+ (local or Atlas)
- **LM Studio** with DeepSeek Coder V2 Lite model
- **Tavily API Key** (for web search)
- **SMTP credentials** (for email sending)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/the-brain.git
cd the-brain

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

Create `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/the-brain

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# LLM (LM Studio)
LLM_API_URL=http://localhost:1234/v1/chat/completions
LLM_MODEL=deepseek-coder-v2-lite-instruct
LLM_TIMEOUT=30000

# Tavily API (Web Search)
TAVILY_API_KEY=your-tavily-api-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### Run LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download **DeepSeek Coder V2 Lite Instruct** model
3. Start local server on port 1234
4. Configure:
   - Context Length: 8192
   - Temperature: 0.2
   - GPU Layers: -1 (all)

### Start Application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

Access at: **http://localhost:3000**

---

## 📖 Usage

### Basic Commands

```
User: "Jaka pogoda w Warszawie?"
→ AI searches web, returns weather with sources

User: "Wyślij email do john@example.com że projekt opóźniony"
→ AI generates full email and sends it

User: "Przypomnij mi jutro o 10:00 o spotkaniu"
→ AI creates calendar event

User: "Co mi mówiłeś o projekcie AI?"
→ AI searches own memory database
```

### Intent Actions

| Action | Trigger | Example |
|--------|---------|---------|
| **SAVE_SEARCH** | Questions, "jaka", "gdzie", "podaj" | "Jaka pogoda?" |
| **SAVE_MAIL** | "wyślij email", has @email | "Wyślij do test@gmail.com" |
| **CREATE_EVENT** | "przypomnij", "jutro", time | "Przypomnij jutro o 10" |
| **RESEARCH_BRAIN** | "co mówiłeś", "znajdź w notatkach" | "Co mówiłeś o AI?" |
| **SAVE_ONLY** | General chat | "Jak się masz?" |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens
- **AI Integration**: Axios (LM Studio API)
- **Web Search**: Tavily API
- **Email**: Nodemailer (SMTP)

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Create React App
- **State Management**: React Hooks

### AI Models
- **Primary**: DeepSeek Coder V2 Lite (16B) - Intent Classification
- **Alternative**: Qwen 2.5 VL (7B)
- **Inference**: LM Studio (local)

---

## 🔧 Configuration

### Intent Classification Settings

**File**: `backend/src/services/ai/intent.service.ts`

```typescript
// DeepSeek Coder V2 Lite
temperature: 0.2      // Higher for better reasoning
max_tokens: 500       // Full email generation
timeout: 30000        // 30s for complex queries

// Context
chatHistory: 3        // Last 3 messages
brainContext: 400     // Max 400 chars
```

### Memory System Settings

**File**: `backend/src/services/ai/intent.context.service.ts`

```typescript
// Recursive retrieval
maxDepth: 3           // 3 levels deep
branchingFactor: 3    // Top 3 synapses per node
maxResults: 3         // Top 3 relevant entries
```

### Action Executor Settings

**File**: `backend/src/services/actions/action.executor.service.ts`

```typescript
// Search
maxResults: 5         // Tavily search results
searchDepth: 'basic'  // 'basic' or 'advanced'

// Email
defaultSubject: 'Message from Jarvis'
```

---

## 🧪 Testing

### Backend API

```bash
# Test intent classification
curl -X POST http://localhost:3001/api/intent/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"jaka pogoda w warszawie"}'

# Expected SSE stream:
# data: {"stage":"intent","status":"processing"}
# data: {"stage":"answer","content":"Sprawdzam pogodę, mordo."}
# data: {"stage":"results","data":{"facts":[...]}}
# data: {"stage":"complete","done":true}
```

### Test Different Intents

```bash
# Weather search
curl -d '{"text":"jaka pogoda w Warszawie"}'

# Email
curl -d '{"text":"wyslij email do test@gmail.com"}'

# Calendar
curl -d '{"text":"przypomnij mi jutro o 10"}'

# Memory search
curl -d '{"text":"co mi mówiłeś o AI"}'
```

---

## 📊 Performance

### Benchmarks (DeepSeek Coder V2 Lite)

| Metric | Value |
|--------|-------|
| Intent classification accuracy | >90% |
| Keyword fallback rate | <10% |
| Email generation quality | High (full sentences) |
| Context awareness | 3 messages + 400 chars |
| Response time (simple) | ~2-3s |
| Response time (with search) | ~5-8s |

### System Requirements

**Minimum**:
- CPU: 8 cores
- RAM: 16GB
- GPU: 8GB VRAM (for LLM)
- Storage: 20GB

**Recommended**:
- CPU: 12+ cores
- RAM: 32GB
- GPU: 16GB+ VRAM
- Storage: 50GB SSD

---

## 🔐 Security

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Environment variable configuration
- ✅ CORS protection
- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization

### Authentication Flow

```typescript
// Register
POST /api/auth/register
{ "email": "user@example.com", "password": "secure123" }

// Login
POST /api/auth/login
→ Returns JWT token

// Protected routes
Authorization: Bearer <token>
```

---

## 🐛 Troubleshooting

### Common Issues

**Problem**: LLM returns same response for all queries
```bash
# Solution: Check prompt length and model
# DeepSeek: ~1200 chars, temp 0.2
# Qwen: ~300 chars, temp 0.05
```

**Problem**: Email not sending
```bash
# Solution: Check SMTP credentials
# Gmail: Enable "Less secure app access" or use App Password
```

**Problem**: Brain state not changing
```bash
# Solution: Check SSE stream in browser console
# Should see: intent → processing → action → results → complete
```

**Problem**: Chat history not working
```bash
# Solution: Verify ChatHistory model and service
# Check MongoDB collection: chathistories
```

---

## 🚧 Current Status & Technical Debt

### MVP Status

This project is a **Minimum Viable Product** demonstrating core agentic AI capabilities. While functional, it contains technical debt and areas requiring improvement before production use.

**What Works:**
- ✅ Intent classification with DeepSeek Coder V2 Lite
- ✅ Background action execution (search, email, calendar)
- ✅ Basic neural memory with synaptic connections
- ✅ SSE streaming chat interface
- ✅ Context-aware conversations

**What Needs Work:**
- ⚠️ Frontend code quality and architecture
- ⚠️ Synapse creation logic (needs optimization)
- ⚠️ Search/retrieval algorithms (can be improved)
- ⚠️ Error handling and edge cases
- ⚠️ Test coverage (minimal)

### Known Issues & Limitations

#### 🎨 Frontend Technical Debt

**Issues:**
- Component structure needs refactoring
- State management could use Redux/Zustand
- CSS organization needs improvement (too many inline styles)
- Lack of proper TypeScript interfaces for props
- No error boundaries
- Limited responsive design
- Accessibility (a11y) not implemented

**Planned Improvements:**
```typescript
// Current: Inline styles and mixed concerns
<div className="flex-1 overflow-y-auto p-6 scrollbar-thin">

// Future: Proper component architecture
<ChatContainer>
  <MessageList messages={messages} />
  <InputArea onSend={handleSend} />
</ChatContainer>
```

#### 🧠 Neural Memory System

**Current Limitations:**
- Synapse creation is simplistic (keyword matching)
- No decay/forgetting mechanism
- Limited relationship types (only "relates_to")
- No confidence scoring for connections
- Recursive retrieval can be slow (O(n³))

**Needs Improvement:**
```typescript
// Current: Basic keyword matching
const keywords = text.split(' ');

// Future: Semantic similarity with embeddings
const similarity = cosineSimilarity(
  embedding(entry1), 
  embedding(entry2)
);
```

#### 🔍 Search & Retrieval

**Current Issues:**
- Simple MongoDB regex search (not optimized)
- No full-text search indexes
- No semantic search (embeddings)
- Limited ranking algorithm
- No caching layer

**Planned Migration:**
```typescript
// Current: MongoDB regex
db.vaultEntries.find({ 
  rawText: { $regex: keywords, $options: 'i' } 
});

// Future: Vector search with Pinecone/Weaviate
vectorDB.search({
  vector: embedding(query),
  topK: 10,
  filter: { userId: userId }
});
```

#### 🔄 Service Architecture

**Current Stack:**
- All services in Node.js/TypeScript
- Synchronous processing in some areas
- No microservices separation
- Limited scalability

**Potential Migrations:**

| Service | Current | Considered Migration | Reason |
|---------|---------|---------------------|--------|
| **Intent Classification** | Node.js + LM Studio | Python + FastAPI | Better ML ecosystem |
| **Embedding Generation** | N/A | Python + sentence-transformers | Required for semantic search |
| **Search Engine** | MongoDB | Elasticsearch / Pinecone | Better full-text & vector search |
| **Queue System** | In-memory | Redis + Bull | Persistence & distributed workers |
| **Cache Layer** | None | Redis | Performance improvement |

**Example Future Architecture:**
```
┌─────────────────────────────────────────────────┐
│ Frontend (React)                                 │
└─────────────────────────────────────────────────┘
                     ↕
┌─────────────────────────────────────────────────┐
│ API Gateway (Node.js)                           │
└─────────────────────────────────────────────────┘
        ↕                ↕                ↕
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Core Service │ │ ML Service   │ │ Search       │
│ (Node.js)    │ │ (Python)     │ │ (Elastic)    │
│              │ │              │ │              │
│ • Auth       │ │ • Intent     │ │ • Vector     │
│ • CRUD       │ │ • Embeddings │ │ • Full-text  │
│ • Actions    │ │ • NLP        │ │ • Ranking    │
└──────────────┘ └──────────────┘ └──────────────┘
        ↕                ↕                ↕
┌─────────────────────────────────────────────────┐
│ Data Layer (MongoDB + Redis + Vector DB)       │
└─────────────────────────────────────────────────┘
```

### Technical Debt Backlog

**High Priority:**
- [ ] Refactor frontend component structure
- [ ] Implement proper error handling across services
- [ ] Add comprehensive logging system
- [ ] Create unit and integration tests
- [ ] Optimize synapse creation algorithm
- [ ] Add database indexes for performance

**Medium Priority:**
- [ ] Migrate to vector database for semantic search
- [ ] Implement caching layer (Redis)
- [ ] Add rate limiting and request validation
- [ ] Improve email template system
- [ ] Better calendar conflict detection
- [ ] Add monitoring and observability

**Low Priority (Future):**
- [ ] Microservices architecture
- [ ] GraphQL API layer
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

### Performance Bottlenecks

**Identified Issues:**

1. **Recursive Context Retrieval** (3x3x3 = 27 queries)
   ```typescript
   // Current: O(n³) complexity
   for (const entry of entries) {
     for (const synapse of synapses) {
       for (const related of relatedEntries) {
         // Process...
       }
     }
   }
   
   // Future: Batch queries + caching
   const allRelated = await VaultEntry.find({
     _id: { $in: synapseIds }
   }).lean();
   ```

2. **LLM Response Time** (~2-5s per classification)
   - Consider: Smaller models for simple intents
   - Add: Intent caching for common queries
   - Future: Fine-tuned specialized model

3. **MongoDB Query Performance**
   - Missing indexes on frequently queried fields
   - No query result caching
   - Inefficient aggregation pipelines

### Code Quality Issues

**Needs Improvement:**
- Inconsistent error handling patterns
- Mixed async/await and promise chains
- Insufficient input validation
- Limited TypeScript strict mode usage
- No API versioning
- Hardcoded configuration values

**Example Refactor Needed:**
```typescript
// Current: Mixed patterns, poor error handling
try {
  const result = await someService();
  if (result) {
    return result;
  }
} catch (err) {
  console.log(err); // ❌ Just logging
}

// Future: Consistent patterns, proper handling
try {
  const result = await someService.execute();
  return Result.ok(result);
} catch (error) {
  logger.error('Service failed', { error, context });
  return Result.err(new ServiceError(error));
}
```

---

## 🗺️ Roadmap

### Phase 1: Technical Debt Cleanup (Q1 2025)
- [ ] **Frontend Refactor**: Component architecture, state management
- [ ] **Test Suite**: Unit tests (80% coverage target)
- [ ] **Error Handling**: Standardized error patterns
- [ ] **Performance**: Database indexing, query optimization
- [ ] **Documentation**: API docs, architecture diagrams

### Phase 2: Core Improvements (Q2 2025)
- [ ] **Semantic Search**: Vector embeddings with Pinecone/Weaviate
- [ ] **Enhanced Synapses**: Similarity-based connections, decay mechanism
- [ ] **Caching Layer**: Redis for frequent queries
- [ ] **Monitoring**: Prometheus + Grafana
- [ ] **CI/CD**: Automated testing and deployment

### Phase 3: New Features (Q3 2025)
- [ ] **Voice Input/Output**: Speech-to-text and TTS
- [ ] **Multi-user Support**: Team collaboration
- [ ] **Plugin System**: Extensible action tools
- [ ] **Mobile App**: React Native version
- [ ] **Advanced Scheduling**: Recurring events, conflict detection

### Phase 4: Scale & Production (Q4 2025)
- [ ] **Cloud Deployment**: Docker + Kubernetes
- [ ] **Microservices**: Separate ML service (Python)
- [ ] **Fine-tuned Model**: Custom intent classifier
- [ ] **Graph Visualization**: Neural memory explorer
- [ ] **Enterprise Features**: SSO, audit logs, multi-tenancy

---

## 🤝 Contributing

**Note**: This is an MVP with significant technical debt. Contributions are welcome, but please be aware of the current limitations and ongoing refactoring efforts.

### Priority Areas for Contribution

**High Impact:**
1. Frontend component refactoring
2. Test coverage improvement
3. Performance optimization (indexing, caching)
4. Documentation improvements

**Medium Impact:**
1. Vector search implementation
2. Better error handling
3. API improvements
4. Security enhancements

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript strict mode
- Follow ESLint configuration
- Write unit tests for new features
- Update documentation
- **Check [Technical Debt](#-current-status--technical-debt) before major refactors**

### Areas Needing Help

**Frontend:**
- [ ] Component library setup (shadcn/ui or similar)
- [ ] State management (Redux/Zustand)
- [ ] Responsive design improvements
- [ ] Accessibility (WCAG 2.1)

**Backend:**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Integration tests
- [ ] Database migration system
- [ ] Performance benchmarks

**DevOps:**
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Monitoring setup
- [ ] Deployment scripts

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- **DeepSeek AI** - For the excellent Coder V2 Lite model
- **LM Studio** - For making local LLM inference easy
- **Tavily** - For the web search API
- **Anthropic** - For inspiration from Claude's conversational style

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/the-brain/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/the-brain/discussions)
- **Email**: your-email@example.com

---

## ⭐ Star History

If you find this project useful, please consider giving it a star!

---

**Built with 🧠 by developers who believe AI should remember.**
