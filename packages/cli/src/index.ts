#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import { Command } from "commander";
import * as readline from "readline";
import { Brain, OpenAICompatibleAdapter, OpenAICompatibleEmbeddingAdapter } from "@the-brain/core";
import { MongoStorageAdapter, connectDB } from "@the-brain/adapter-mongo";
import mongoose from "mongoose";

// ─── Config ───────────────────────────────────────────────────────────────────

const USER_ID = process.env.BRAIN_USER_ID ?? "default";

const LLM_URL = process.env.LLM_API_URL ?? "http://localhost:11434/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL ?? "llama3.2";
const LLM_API_KEY = process.env.LLM_API_KEY ?? "local";

const EMBEDDING_URL = process.env.EMBEDDING_API_URL ?? "http://localhost:11434/v1/embeddings";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";

// ─── Brain ────────────────────────────────────────────────────────────────────

const brain = new Brain(
  new OpenAICompatibleAdapter(LLM_URL, LLM_MODEL, LLM_API_KEY),
  new MongoStorageAdapter(),
  new OpenAICompatibleEmbeddingAdapter(EMBEDDING_URL, EMBEDDING_MODEL),
);

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup() {
  await connectDB();
  await brain.loadActions();
}

async function teardown() {
  await mongoose.disconnect();
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("brain")
  .description("The Brain — local-first cognitive memory framework")
  .version("0.1.0");

program
  .command("process <text>")
  .description("Classify intent, save to vault, and respond")
  .action(async (text: string) => {
    await setup();
    try {
      const result = await brain.process(USER_ID, text);
      console.log(`[${result.action}] ${result.answer}`);
    } finally {
      await teardown();
    }
  });

program
  .command("save <text>")
  .description("Save text directly to vault")
  .action(async (text: string) => {
    await setup();
    try {
      const entry = await brain.save(USER_ID, text);
      console.log(`Saved [${entry._id}]`);
    } finally {
      await teardown();
    }
  });

program
  .command("recall <text>")
  .description("Search memory and return synaptic context")
  .action(async (text: string) => {
    await setup();
    try {
      const { synapticTree, hasContext } = await brain.recall(USER_ID, text);
      if (!hasContext) {
        console.log("No relevant memories found.");
      } else {
        console.log(synapticTree);
      }
    } finally {
      await teardown();
    }
  });

program
  .command("maintenance")
  .description("Run nightly maintenance (decay, pruning, consolidation)")
  .action(async () => {
    await setup();
    try {
      const { subStats, consciousStats } = await brain.runMaintenance();
      console.log(`Subconscious: -${subStats.decayed} decayed, -${subStats.pruned} pruned, ${subStats.readyForLTM} ready for LTM`);
      console.log(`Conscious:    +${consciousStats.synapsesCreated} synapses, ${consciousStats.consolidated} consolidated`);
    } finally {
      await teardown();
    }
  });

program
  .command("chat", { isDefault: true })
  .description("Interactive chat with The Brain")
  .action(async () => {
    await setup();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('🧠 The Brain — type your message, Ctrl+C to exit\n');

    const ask = () => {
      rl.question('You: ', async (input) => {
        const text = input.trim();
        if (!text) { ask(); return; }

        try {
          const result = await brain.process(USER_ID, text);
          console.log(`\nBrain: ${result.answer}\n`);
        } catch (err) {
          console.error('Error:', err);
        }

        ask();
      });
    };

    rl.on('close', async () => {
      console.log('\nBye.');
      await teardown();
      process.exit(0);
    });

    ask();
  });

program.parse();
