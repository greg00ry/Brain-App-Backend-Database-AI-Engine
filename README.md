# The Brain

> **Privacy-first AI framework for reliable task routing and memory**

[![Status](https://img.shields.io/badge/status-refactoring-yellow)](https://github.com/greg00ry/Brain-App-Backend-Database-AI-Engine)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

---

## 🚧 Currently Refactoring

**The Brain is being extracted from standalone app → framework + CLI**

**Branch:** `framework-extraction`

**Status:** Work in progress (March 2026)

---

## Mission

This is NOT just another AI wrapper.

**The Brain** is a resistance movement against AI centralization.

While Big Tech rebuilds Soviet-style central planning (cloud APIs, subscriptions, surveillance), we're building infrastructure for **privacy-first, user-owned AI**.

Read [CLAUDE.md](CLAUDE.md) for full mission statement.

---

## What Makes This Different

### Novel Architecture

1. **Hybrid Intent Routing**
   - Combines AI + rules + confidence scoring
   - 95% accuracy with weak OR strong models
   - Works with local LLMs (DeepSeek) AND cloud (GPT-4)
   - Graceful degradation

2. **Biologically-Inspired Memory**
   - Strength-based decay (important stays, trivial fades)
   - Subconscious routine (pure math, deterministic)
   - Consolidation (strong memories → long-term)
   - Graph RAG (relationships, not just similarity)

3. **Guardrails System**
   - Determinism layer over LLM randomness
   - Reliable task execution
   - Production-ready

4. **LLM Agnostic**
   - Bring your own LLM (local, cloud, hybrid)
   - Storage agnostic (MongoDB, files, SQLite, Postgres)
   - UI agnostic (CLI, web, mobile, Discord bot)

---

## Architecture (New)
```
┌─────────────────────────────────────┐
│    @the-brain/core (framework)      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Intent Routing             │   │
│  │  (AI + rules + confidence)  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Memory System              │   │
│  │  (decay, consolidation)     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Guardrails                 │   │
│  │  (determinism)              │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
         │                    │
    ┌────▼─────┐       ┌─────▼─────┐
    │ LLM      │       │ Storage   │
    │ Adapters │       │ Adapters  │
    └──────────┘       └───────────┘
         │                    │
    Local/Cloud        Mongo/Files/SQL
```

**User brings:** LLM choice, storage choice, UI
**We provide:** Routing, memory, reliability

---

## Quick Start (Legacy - being refactored)

**Note:** Instructions below are for the legacy monolithic app.
Framework + CLI coming soon.

### Prerequisites

- Node.js 18+
- MongoDB
- LM Studio (for local LLM)

### Backend Setup
```bash
cd backend/node-server
npm install
cp .env.example .env
# Edit .env (set MONGODB_URI, LM_STUDIO_URL)
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Roadmap

### Phase 1: Framework Extraction (Current - March 2026)

- [ ] Extract core logic to `@the-brain/core`
- [ ] Create storage adapter interface
- [ ] Implement MongoAdapter (existing code)
- [ ] Implement FileAdapter (new)
- [ ] Create LLM adapter interface  
- [ ] Implement LocalLLMAdapter (existing)
- [ ] Implement OpenAIAdapter (new)
- [ ] Build CLI (`@the-brain/cli`)
- [ ] Documentation

### Phase 2: Ecosystem (April-May 2026)

- [ ] npm publish (`@the-brain/core`)
- [ ] MCP server (Claude integration)
- [ ] Community examples
- [ ] Additional adapters (SQLite, Postgres)

### Phase 3: Premium Features (Later)

- [ ] Enterprise support
- [ ] Managed hosting (optional)
- [ ] Advanced features
- [ ] Standalone app (if needed)

---

## Philosophy

**Red Lines (Never Cross):**

1. ❌ No cloud LLM APIs (unless user explicitly chooses)
2. ❌ No user data collection
3. ❌ No VC funding
4. ❌ No selling to Big Tech

**Core Principles:**

- Privacy > Convenience
- User ownership > Subscriptions
- Independence > Scale
- Freedom > Features

This is **digital Solidarność** (Polish Solidarity movement).

---

## Why Framework?

**Problem:** Standalone app forces choices (local LLM, MongoDB, our UI)

**Solution:** Framework lets users choose (local/cloud, any storage, any UI)

**Value:** We provide the HARD parts (routing, memory, guardrails), you provide the choices

**Result:** Wider adoption, same mission (enable privacy-first AI)

---

## Contributing

Currently in active refactoring. 

Check [CLAUDE.md](CLAUDE.md) for mission, philosophy, and technical context.

**Current focus:** Framework extraction on `framework-extraction` branch

---

## License

AGPL-3.0 (deliberately protective - prevents corporate capture)

---

## Author

**Grzegorz Trzaskoma**

Polish developer who grew up post-communist, building resistance to AI centralization.

*"My babcia escaped Soviet central planning. I won't rebuild it with better UX."*

**Forbes 2029 goal:** Independent founder who decentralized AI

---

## Status

🚧 **Active refactoring** - Watch this space!

**Follow progress:** `framework-extraction` branch

