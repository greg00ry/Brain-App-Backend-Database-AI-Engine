#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════════════════════
// @the-brain/mcp — MCP server
//
// Plugs The Brain into Claude Code, Cursor, and Cline as a persistent memory layer.
// Runs as a stdio server. Zero config — defaults to FileStorageAdapter + Ollama.
//
// Config via env vars:
//   BRAIN_LLM_URL      LLM endpoint   (default: http://localhost:11434/v1/chat/completions)
//   BRAIN_LLM_MODEL    LLM model      (default: llama3.2)
//   BRAIN_LLM_API_KEY  API key        (default: "local")
//   BRAIN_STORAGE_PATH Storage dir    (default: ~/.brain)
//   BRAIN_USER_ID      User ID        (default: "default")
// ═══════════════════════════════════════════════════════════════════════════════

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Brain, OpenAICompatibleAdapter } from "@the-brain/core";
import { FileStorageAdapter } from "@the-brain/adapter-files";
import { homedir } from "os";
import { join } from "path";

// ─── Config ───────────────────────────────────────────────────────────────────

const USER_ID = process.env.BRAIN_USER_ID ?? "default";
const LLM_URL = process.env.BRAIN_LLM_URL ?? "http://localhost:11434/v1/chat/completions";
const LLM_MODEL = process.env.BRAIN_LLM_MODEL ?? "llama3.2";
const LLM_API_KEY = process.env.BRAIN_LLM_API_KEY ?? "local";
const STORAGE_PATH = process.env.BRAIN_STORAGE_PATH ?? join(homedir(), ".brain");

// ─── Brain ────────────────────────────────────────────────────────────────────

const brain = new Brain(
  new OpenAICompatibleAdapter(LLM_URL, LLM_MODEL, LLM_API_KEY),
  new FileStorageAdapter(STORAGE_PATH),
);

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "the-brain", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

// ─── Tool definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "brain_save",
      description:
        "Save information to The Brain's persistent memory. Use this when you learn something about the user (preferences, decisions, context, goals) that should be remembered across sessions.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The information to save",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "brain_recall",
      description:
        "Search The Brain's persistent memory for relevant information. Use this when you need context about the user's past decisions, preferences, or knowledge before answering.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to search for in memory",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "brain_process",
      description:
        "Send a message through The Brain's full pipeline — it will classify intent, save if appropriate, search memory for context, and return a response. Use this for natural conversation with memory.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The user's message",
          },
        },
        required: ["text"],
      },
    },
  ],
}));

// ─── Tool handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "brain_save") {
      const text = String(args?.text ?? "");
      if (!text) {
        return { content: [{ type: "text", text: "Error: text is required" }], isError: true };
      }

      const entry = await brain.save(USER_ID, text);
      return {
        content: [
          {
            type: "text",
            text: `Saved to memory [id: ${entry._id}]`,
          },
        ],
      };
    }

    if (name === "brain_recall") {
      const query = String(args?.query ?? "");
      if (!query) {
        return { content: [{ type: "text", text: "Error: query is required" }], isError: true };
      }

      const { synapticTree, hasContext } = await brain.recall(USER_ID, query);

      if (!hasContext) {
        return {
          content: [{ type: "text", text: "No relevant memories found." }],
        };
      }

      return {
        content: [{ type: "text", text: synapticTree }],
      };
    }

    if (name === "brain_process") {
      const text = String(args?.text ?? "");
      if (!text) {
        return { content: [{ type: "text", text: "Error: text is required" }], isError: true };
      }

      const result = await brain.process(USER_ID, text);
      return {
        content: [
          {
            type: "text",
            text: `[${result.action}] ${result.answer}`,
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  await brain.loadActions();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // MCP servers must not write to stdout (it's the transport channel)
  // Log to stderr only
  process.stderr.write("[brain-mcp] Server running\n");
}

main().catch((err) => {
  process.stderr.write(`[brain-mcp] Fatal: ${err}\n`);
  process.exit(1);
});
