#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import { Command } from "commander";
import { connectDB } from "../config/db.js";
import { brain } from "../core/brain.instance.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const USER_ID = process.env.BRAIN_USER_ID ?? "default";

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup() {
  await connectDB();
}

async function teardown() {
  const mongoose = await import("mongoose");
  await mongoose.default.disconnect();
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("brain")
  .description("The Brain — local-first cognitive memory framework")
  .version("0.1.0");

// brain process "text"
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

// brain save "text"
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

// brain recall "text"
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

// brain maintenance
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

program.parse();
