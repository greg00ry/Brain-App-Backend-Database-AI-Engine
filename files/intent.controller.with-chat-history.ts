import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { classifyIntent } from "../services/ai/intent.service.js";
import { aiQueue } from "../services/queue.service.js";
import { executeActionInBackground } from "../services/actions/action.executor.service.js";
import { getChatHistory, addChatMessage } from "../services/chat/chat.history.service.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CONTROLLER - With Chat History Integration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /intent/stream
 * Przetwarza intencję użytkownika z dostępem do historii rozmowy
 */
export const intentControllerWithChatHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { text, sessionId } = req.body as { text: string; sessionId?: string };
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required" });
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
      // KROK 0: Pobierz historię rozmowy (ostatnie 10 wiadomości)
      // ═══════════════════════════════════════════════════════════════════════
      
      console.log('[IntentController] Fetching chat history...');
      const chatHistory = await getChatHistory(userId, 10, sessionId);
      console.log(`[IntentController] Retrieved ${chatHistory.length} messages from history`);

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 1: Klasyfikacja intencji (z historią!)
      // ═══════════════════════════════════════════════════════════════════════
      
      sendSSE({
        stage: "intent_classification",
        status: "processing",
        content: "Analizuję intencję...",
      });

      const intentResult = await classifyIntent({
        userText: text.trim(),
        userId: userId.toString(),
        chatHistory: chatHistory, // ← TUTAJ PRZEKAZUJEMY HISTORIĘ!
      });

      sendSSE({
        stage: "intent_classification",
        status: "complete",
        content: `Wykryto: ${intentResult.action}`,
        data: intentResult,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // KROK 1.5: Zapisz wiadomość użytkownika do historii
      // ═══════════════════════════════════════════════════════════════════════
      
      await addChatMessage(userId, 'user', text.trim(), sessionId);

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
      // KROK 3.5: Wyślij odpowiedź Jarvisa (z pola "answer")
      // ═══════════════════════════════════════════════════════════════════════
      
      if (intentResult.answer) {
        sendSSE({
          stage: "jarvis_response",
          status: "complete",
          content: intentResult.answer, // ← "Wszystko git, mordo!"
        });

        // Zapisz odpowiedź Jarvisa do historii
        await addChatMessage(userId, 'assistant', intentResult.answer, sessionId);
      }

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
          intentResult, // Przekazujemy pełny wynik (eventData, emailData)
        });

        sendSSE({
          stage: "action_tools",
          status: "background",
          content: `${intentResult.action} wykona się w tle.`,
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
          sessionId: sessionId || 'default',
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
