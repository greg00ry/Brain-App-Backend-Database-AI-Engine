import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { classifyIntent } from "../services/ai/intent.service.js";
import { aiQueue } from "../services/queue.service.js";
import { executeActionInBackground } from "../services/actions/action.executor.service.js";

/**
 * POST /intent/stream
 * Flow:
 * 1. Klasyfikuje intencję (SAVE_ONLY/SAVE_SEARCH/SAVE_MAIL)
 * 2. Dodaje do kolejki AI (analiza + zapis)
 * 3. Odpala Action Tools w tle (asynchronicznie)
 * 4. Streamuje progres do klienta
 */
export const intentControllerWithActions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { text } = req.body as { text: string };
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Konfiguracja SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // KROK 1: Klasyfikacja intencji
      // ═══════════════════════════════════════════════════════════════════════
      
      sendSSE({
        stage: "intent_classification",
        status: "processing",
        content: "Analizuję intencję...",
      });

      const intentResult = await classifyIntent(text.trim());

      sendSSE({
        stage: "intent_classification",
        status: "complete",
        content: `Wykryto: ${intentResult.action}`,
        data: intentResult,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 2: Sprawdź status kolejki
      // ═══════════════════════════════════════════════════════════════════════
      
      const queueStatus = aiQueue.getStatus();

      if (queueStatus.queueLength > 0) {
        sendSSE({
          stage: "queue",
          status: "waiting",
          content: `W kolejce: ${queueStatus.queueLength} zadań`,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 3: Przetwarzanie przez AI (analiza + zapis do bazy)
      // ═══════════════════════════════════════════════════════════════════════
      
      sendSSE({
        stage: "ai_processing",
        status: "processing",
        content: "Analizuję treść...",
      });

      const queueResult = await aiQueue.enqueue(
        userId.toString(),
        text.trim(),
        intentResult.action
      );

      sendSSE({
        stage: "ai_processing",
        status: "complete",
        content: "Analiza zakończona",
        data: queueResult,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 4: Odpalam Action Tools w tle (NIE CZEKAMY!)
      // ═══════════════════════════════════════════════════════════════════════
      
      const entryId = queueResult.entry._id.toString();

      if (intentResult.action !== "SAVE_ONLY") {
        sendSSE({
          stage: "action_tools",
          status: "triggered",
          content: `Uruchamiam ${intentResult.action} w tle...`,
        });

        // Odpalamy w tle - nie czekamy na wynik
        executeActionInBackground({
          userId: userId.toString(),
          entryId,
          text: text.trim(),
          action: intentResult.action,
        });

        sendSSE({
          stage: "action_tools",
          status: "background",
          content: `${intentResult.action} wykona się w tle. Sprawdź później szczegóły.`,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 5: Zakończenie
      // ═══════════════════════════════════════════════════════════════════════
      
      sendSSE({
        stage: "complete",
        status: "done",
        content: "Gotowe!",
        data: {
          entryId,
          action: intentResult.action,
        },
        done: true,
      });

      res.end();
    } catch (error) {
      console.error("[IntentController] Błąd:", error);

      sendSSE({
        stage: "error",
        status: "failed",
        content: "Wystąpił błąd podczas przetwarzania",
        error: error instanceof Error ? error.message : String(error),
      });

      res.end();
    }
  }
);
