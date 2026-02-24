import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { AuthRequest } from "../middleware/auth.js";
import { Response } from "express";
import { getEntryById, getEntriesWithActionTools } from "../services/db/entry.service.js";

const router = Router();

/**
 * GET /actions/status/:entryId
 * Pobiera status action tools dla konkretnego wpisu
 */
router.get(
  "/status/:entryId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { entryId } = req.params;
    const userId = req.user?._id;

    const entry = await getEntryById(entryId);

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    // Sprawdź czy użytkownik ma dostęp do tego wpisu
    if (entry.userId.toString() !== userId?.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Zwróć status action tools
    res.json({
      entryId: entry._id,
      actionTools: entry.actionTools || {},
      createdAt: entry.createdAt,
    });
  })
);

/**
 * GET /actions/list
 * Pobiera listę wszystkich wpisów z action tools dla zalogowanego użytkownika
 */
router.get(
  "/list",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const entries = await getEntriesWithActionTools(userId.toString());

    res.json({
      count: entries.length,
      entries: entries.map((entry) => ({
        id: entry._id,
        text: entry.rawText,
        analysis: entry.analysis,
        actionTools: entry.actionTools,
        createdAt: entry.createdAt,
      })),
    });
  })
);

/**
 * GET /actions/health
 * Sprawdza dostępność zewnętrznych serwisów (Tavily, Email)
 */
router.get(
  "/health",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const health = {
      tavily: {
        configured: !!process.env.TAVILY_API_KEY,
        status: "unknown",
      },
      email: {
        configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        status: "unknown",
      },
    };

    // Opcjonalnie: sprawdź połączenie (może być wolne)
    try {
      const { verifyEmailConfig } = await import("../services/actions/email.service.js");
      health.email.status = (await verifyEmailConfig()) ? "ok" : "error";
    } catch {
      health.email.status = "error";
    }

    res.json(health);
  })
);

export default router;
