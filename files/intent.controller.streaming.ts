import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { classifyIntent } from "../services/ai/intent.service.js";
import { aiQueue } from "../services/queue.service.js";

/**
 * POST /intent (wersja ze streamingiem SSE)
 * Wysyła progresywne update'y do klienta podczas przetwarzania
 */
export const intentControllerStreaming = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { text } = req.body as { text: string };
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Konfiguracja SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendSSE = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // KROK 1: Klasyfikacja intencji
    sendSSE({ 
      stage: 'intent_classification', 
      status: 'processing',
      content: 'Analizuję intencję...' 
    });

    const intentResult = await classifyIntent(text.trim());
    
    sendSSE({ 
      stage: 'intent_classification', 
      status: 'complete',
      content: `Wykryto: ${intentResult.action}`,
      data: intentResult 
    });

    // KROK 2: Dodanie do kolejki
    const queueStatus = aiQueue.getStatus();
    
    if (queueStatus.queueLength > 0) {
      sendSSE({ 
        stage: 'queue', 
        status: 'waiting',
        content: `W kolejce: ${queueStatus.queueLength} zadań` 
      });
    }

    // KROK 3: Przetwarzanie przez AI
    sendSSE({ 
      stage: 'ai_processing', 
      status: 'processing',
      content: 'Analizuję treść...' 
    });

    const result = await aiQueue.enqueue(userId.toString(), text.trim(), intentResult.action);
    
    sendSSE({ 
      stage: 'ai_processing', 
      status: 'complete',
      content: 'Analiza zakończona',
      data: result 
    });

    // KROK 4: Zakończenie
    sendSSE({ 
      stage: 'complete', 
      status: 'done',
      content: 'Gotowe!',
      done: true 
    });

    res.end();

  } catch (error) {
    console.error("[IntentController] Błąd:", error);
    
    sendSSE({ 
      stage: 'error', 
      status: 'failed',
      content: 'Wystąpił błąd podczas przetwarzania',
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.end();
  }
});
