import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { classifyIntent } from "../services/ai/intent.service.js";
import { aiQueue } from "../services/ai/queue.service.js";
import { executeActionInBackground } from "../services/actions/action.executor.service.js";
import { getChatHistory, addChatMessage } from "../services/chat/chat.history.service.js";
import { storageAdapter } from "../services/db/storage.js";
import { CHAT, SSE } from "../config/constants.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CONTROLLER - With Research Results Display
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /intent/stream
 * SSE Stream z wyświetlaniem wyników researchu
 */
export const intentController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { text, sessionId } = req.body as { text: string; sessionId?: string };
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required" });
    }

    // SSE setup
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // KROK 1: Historia czatu
      // ═══════════════════════════════════════════════════════════════════════
      
      const chatHistory = await getChatHistory(userId, CHAT.HISTORY_LIMIT_FOR_LLM, sessionId);
      console.log(`[IntentController] Chat history: ${chatHistory.length} messages`);

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 2: Klasyfikacja intencji
      // ═══════════════════════════════════════════════════════════════════════
      
      sendSSE({
        stage: "intent",
        status: "processing",
        content: "🧠 Analizuję...",
      });

      const intentResult = await classifyIntent({
        userText: text.trim(),
        userId: userId.toString(),
        chatHistory: chatHistory,
      });

      sendSSE({
        stage: "intent",
        status: "complete",
        content: `🧠 ${intentResult.action}`,
        data: { action: intentResult.action },
      });

      // Zapisz user message
      await addChatMessage(userId, 'user', text.trim(), sessionId);

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 3: AI Processing + Zapis
      // ═══════════════════════════════════════════════════════════════════════
      
      sendSSE({
        stage: "processing",
        status: "working",
        content: "⚙️ Zapisuję...",
      });

      const queueResult = await aiQueue.enqueue(
        userId.toString(),
        text.trim(),
        intentResult.action
      );

      const entryId = queueResult.entry._id.toString();

      sendSSE({
        stage: "processing",
        status: "complete",
        content: "⚙️ Zapisane",
      });

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 4: Odpowiedź Jarvisa
      // ═══════════════════════════════════════════════════════════════════════
      
      if (intentResult.answer) {
        sendSSE({
          stage: "answer",
          status: "complete",
          content: `📝 ${intentResult.answer}`,
        });

        await addChatMessage(userId, 'assistant', intentResult.answer, sessionId);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 5: Action Tools (w tle)
      // ═══════════════════════════════════════════════════════════════════════
      
      if (intentResult.action !== "SAVE_ONLY") {
        sendSSE({
          stage: "action",
          status: "triggered",
          content: `🚀 ${intentResult.action}...`,
        });

        // Odpalam w tle
        executeActionInBackground({
          userId: userId.toString(),
          entryId,
          text: text.trim(),
          action: intentResult.action,
          intentResult,
        });

        // ═══════════════════════════════════════════════════════════════════════
        // KROK 6: Polling dla wyników researchu (dla SAVE_SEARCH i RESEARCH_BRAIN)
        // ═══════════════════════════════════════════════════════════════════════
        
        if (intentResult.action === "SAVE_SEARCH" || intentResult.action === "RESEARCH_BRAIN") {
          const maxWait = SSE.POLL_TIMEOUT_MS;
          const startTime = Date.now();
          let resultsFound = false;

          while (Date.now() - startTime < maxWait && !resultsFound) {
            await new Promise(resolve => setTimeout(resolve, SSE.POLL_INTERVAL_MS));

            const poll = await storageAdapter.pollEntrySearchResult(entryId);

            if (poll?.completed) {
              resultsFound = true;
              if (poll.facts && poll.facts.length > 0) {
                sendSSE({
                  stage: "results",
                  status: "complete",
                  content: "✅ Znalazłem!",
                  data: {
                    facts: poll.facts,
                    sources: poll.sources || [],
                  },
                });
              }
            }
          }

          if (!resultsFound) {
            sendSSE({
              stage: "results",
              status: "timeout",
              content: "⏱️ Research trwa dłużej...",
            });
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 7: Zakończenie
      // ═══════════════════════════════════════════════════════════════════════
      
      sendSSE({
        stage: "complete",
        status: "done",
        content: "✅ Gotowe!",
        data: { entryId },
        done: true,
      });

      res.end();
    } catch (error) {
      console.error("[IntentController] Error:", error);

      sendSSE({
        stage: "error",
        status: "failed",
        content: "❌ Błąd",
        error: error instanceof Error ? error.message : String(error),
      });

      res.end();
    }
  }
);

export default intentController;
