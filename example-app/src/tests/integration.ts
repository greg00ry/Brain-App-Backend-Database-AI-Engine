import { Brain, OpenAICompatibleAdapter, OpenAICompatibleEmbeddingAdapter } from "@the-brain/core";
import { SQLiteStorageAdapter } from "@the-brain/adapter-sqlite";
import * as fs from "fs";
import * as path from "path";

// ─── Setup ────────────────────────────────────────────────────────────────────

const STORAGE_DIR = "./.brain-test";

// Clean previous test run
if (fs.existsSync(STORAGE_DIR)) {
  fs.rmSync(STORAGE_DIR, { recursive: true });
}

const llm = new OpenAICompatibleAdapter(
  "http://localhost:11434/v1/chat/completions",
  "llama3",
);

const embedding = new OpenAICompatibleEmbeddingAdapter(
  "http://localhost:11434/v1/embeddings",
  "nomic-embed-text",
);

const storage = new SQLiteStorageAdapter(STORAGE_DIR);
const brain = new Brain(llm, storage, embedding);

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function log(label: string, text: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📌 ${label}`);
  console.log(`─`.repeat(60));
  console.log(text);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

await brain.loadActions();

console.log("🧠 The Brain — Integration Tests\n");

// ── 1. Save random facts ──────────────────────────────────────────────────────

log("SAVE #1", "Saving personal preference");
const r1 = await brain.process("user-1", "I prefer TypeScript over JavaScript because of type safety");
console.log(`Brain: ${r1.answer}`);
assert(r1.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r1.action})`);
assert(r1.answer.length > 0, "brain responded with something");
assert(!r1.answer.toLowerCase().includes("zapisano"), "no dry 'Zapisano' response");

log("SAVE #2", "Saving work habit");
const r2 = await brain.process("user-1", "I work best in the morning, between 7am and 11am. After lunch I lose focus.");
console.log(`Brain: ${r2.answer}`);
assert(r2.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r2.action})`);
assert(r2.answer.length > 10, "brain gave a real response");

log("SAVE #3", "Saving technical note");
const r3 = await brain.process("user-1", "MongoDB aggregation pipelines are faster than multiple queries when joining collections");
console.log(`Brain: ${r3.answer}`);
assert(r3.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r3.action})`);

log("SAVE #4", "Saving personal goal");
const r4 = await brain.process("user-1", "My goal for 2026 is to publish an open source framework used by at least 1000 developers");
console.log(`Brain: ${r4.answer}`);
assert(r4.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r4.action})`);

log("SAVE #5", "Saving random fact about food");
const r5 = await brain.process("user-1", "I hate cilantro. It tastes like soap to me.");
console.log(`Brain: ${r5.answer}`);
assert(r5.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r5.action})`);

log("SAVE #6", "Saving project note");
const r6 = await brain.process("user-1", "The Brain framework uses strength-based memory decay — entries lose strength over time and get pruned when they hit 0");
console.log(`Brain: ${r6.answer}`);
assert(r6.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r6.action})`);

log("SAVE #7", "Saving learning note");
const r7 = await brain.process("user-1", "zapamiętaj: nigdy nie używaj var w JavaScript, zawsze const albo let");
console.log(`Brain: ${r7.answer}`);
assert(r7.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r7.action})`);

log("SAVE #8", "Saving meeting note");
const r8 = await brain.process("user-1", "Had a great conversation about AI memory systems today. The key insight was that forgetting is as important as remembering.");
console.log(`Brain: ${r8.answer}`);
assert(r8.action === "SAVE_ONLY", `action is SAVE_ONLY (got: ${r8.action})`);

// ── 2. Recall saved facts ─────────────────────────────────────────────────────

log("RECALL #1", "Asking about programming preferences");
const q1 = await brain.process("user-1", "co wiem o TypeScript?");
console.log(`Brain: ${q1.answer}`);
assert(q1.action === "RESEARCH_BRAIN", `action is RESEARCH_BRAIN (got: ${q1.action})`);
assert(q1.answer.length > 20, "brain gave a real answer");

log("RECALL #2", "Asking about work habits");
const q2 = await brain.process("user-1", "when do I work best?");
console.log(`Brain: ${q2.answer}`);
assert(q2.action === "RESEARCH_BRAIN", `action is RESEARCH_BRAIN (got: ${q2.action})`);

log("RECALL #3", "Asking about goals");
const q3 = await brain.process("user-1", "what are my goals for 2026?");
console.log(`Brain: ${q3.answer}`);
assert(q3.action === "RESEARCH_BRAIN", `action is RESEARCH_BRAIN (got: ${q3.action})`);

log("RECALL #4", "Asking about something not saved");
const q4 = await brain.process("user-1", "what do I know about quantum computing?");
console.log(`Brain: ${q4.answer}`);
assert(q4.action === "RESEARCH_BRAIN", `action is RESEARCH_BRAIN (got: ${q4.action})`);
assert(q4.answer.length > 0, "brain responded even with no memory");

log("RECALL #5", "Asking about The Brain framework");
const q5 = await brain.process("user-1", "remind me how The Brain memory system works");
console.log(`Brain: ${q5.answer}`);
assert(q5.action === "RESEARCH_BRAIN", `action is RESEARCH_BRAIN (got: ${q5.action})`);

// ── 3. Conversational flow ────────────────────────────────────────────────────

log("CONVERSATION #1", "Follow-up on previous topic");
const c1 = await brain.process("user-1", "actually, I also like Rust but I haven't used it in production yet");
console.log(`Brain: ${c1.answer}`);
assert(c1.answer.length > 0, "brain responded to follow-up");

log("CONVERSATION #2", "Ambiguous input — should save or research?");
const c2 = await brain.process("user-1", "MongoDB");
console.log(`Brain: ${c2.answer}`);
assert(["SAVE_ONLY", "RESEARCH_BRAIN"].includes(c2.action), `action is one of the known actions (got: ${c2.action})`);

log("CONVERSATION #3", "Question with context from earlier saves");
const c3 = await brain.process("user-1", "given what you know about me, what tech stack would you recommend for my next project?");
console.log(`Brain: ${c3.answer}`);
assert(c3.answer.length > 20, "brain gave a contextual answer");

// ── 4. Custom action ──────────────────────────────────────────────────────────

log("CUSTOM ACTION — register QUICK_NOTE", "");
await brain.registerAction(
  "QUICK_NOTE",
  "user wants to quickly jot something down without elaboration, uses phrases like 'quick note', 'jot down', 'note to self'",
  async (_userId, text, _context, llm) => {
    const answer = await llm.complete({
      userPrompt: `The user said: "${text}". Acknowledge that you've noted it in one short sentence.`,
      temperature: 0.5,
      maxTokens: 50,
    });
    return answer ?? "Noted.";
  }
);

const qa1 = await brain.process("user-1", "quick note: buy coffee beans tomorrow");
console.log(`Brain: ${qa1.answer}`);
assert(qa1.action === "QUICK_NOTE", `custom action triggered (got: ${qa1.action})`);
assert(qa1.answer.length > 0, "custom handler returned response");

// ── 5. Storage check ──────────────────────────────────────────────────────────

log("STORAGE CHECK", "Verify entries were saved to disk");
const storageFiles = fs.readdirSync(STORAGE_DIR);
console.log(`  Files in .brain-test/: ${storageFiles.join(", ")}`);
assert(storageFiles.length > 0, "storage directory has files");

const chatHistory = await storage.getChatHistory("user-1");
console.log(`  Chat history: ${chatHistory.length} messages`);
assert(chatHistory.length > 0, "chat history was persisted");
assert(chatHistory.length <= 10, `chat history respects sliding window (got: ${chatHistory.length})`);

const actions = await storage.getActions();
console.log(`  Actions in registry: ${actions.map(a => a.name).join(", ")}`);
assert(actions.some(a => a.name === "QUICK_NOTE"), "custom action persisted in storage");

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(60)}\n`);

if (failed > 0) {
  process.exit(1);
}
