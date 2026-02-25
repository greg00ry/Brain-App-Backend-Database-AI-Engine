import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/typeHelper.js";
import { AuthRequest } from "../middleware/auth.js";
import { Response } from "express";
import {
  createEvent,
  getUpcomingEvents,
  getTodayEvents,
  getOverdueEvents,
  getEventsInRange,
  markEventAsDone,
  rescheduleEvent,
  deleteEvent,
  getCalendarStats,
} from "../services/calendar/calendar.service.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR ROUTER - Full CRUD + Stats
// ═══════════════════════════════════════════════════════════════════════════════

const router = Router();

// ─── Create Event ────────────────────────────────────────────────────────────

/**
 * POST /calendar
 * Body: { title, description?, startDate, endDate?, category? }
 */
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, description, startDate, endDate, category } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ 
        error: "Missing required fields: title, startDate" 
      });
    }

    const result = await createEvent({
      userId,
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      category,
    });

    if (result.success) {
      res.status(201).json(result.event);
    } else {
      res.status(400).json({ error: result.error });
    }
  })
);

// ─── Get Upcoming Events ─────────────────────────────────────────────────────

/**
 * GET /calendar/upcoming?limit=10
 */
router.get(
  "/upcoming",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const events = await getUpcomingEvents(userId, limit);

    res.json({ count: events.length, events });
  })
);

// ─── Get Today's Events ──────────────────────────────────────────────────────

/**
 * GET /calendar/today
 */
router.get(
  "/today",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const events = await getTodayEvents(userId);

    res.json({ count: events.length, events });
  })
);

// ─── Get Overdue Events ──────────────────────────────────────────────────────

/**
 * GET /calendar/overdue
 */
router.get(
  "/overdue",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const events = await getOverdueEvents(userId);

    res.json({ count: events.length, events });
  })
);

// ─── Get Events in Range ─────────────────────────────────────────────────────

/**
 * GET /calendar/range?start=2024-12-01&end=2024-12-31
 */
router.get(
  "/range",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ 
        error: "Missing query params: start, end" 
      });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const events = await getEventsInRange(userId, startDate, endDate);

    res.json({ count: events.length, events });
  })
);

// ─── Get Calendar Stats ──────────────────────────────────────────────────────

/**
 * GET /calendar/stats
 */
router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const stats = await getCalendarStats(userId);

    res.json(stats);
  })
);

// ─── Mark Event as Done ──────────────────────────────────────────────────────

/**
 * PATCH /calendar/:eventId/done
 */
router.patch(
  "/:eventId/done",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId } = req.params;

    const result = await markEventAsDone(eventId);

    if (result.success) {
      res.json(result.event);
    } else {
      res.status(404).json({ error: result.error });
    }
  })
);

// ─── Reschedule Event ────────────────────────────────────────────────────────

/**
 * PATCH /calendar/:eventId/reschedule
 * Body: { startDate, endDate? }
 */
router.patch(
  "/:eventId/reschedule",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate) {
      return res.status(400).json({ error: "Missing startDate" });
    }

    const newStartDate = new Date(startDate);
    const newEndDate = endDate ? new Date(endDate) : undefined;

    if (isNaN(newStartDate.getTime())) {
      return res.status(400).json({ error: "Invalid startDate format" });
    }

    const result = await rescheduleEvent(eventId, newStartDate, newEndDate);

    if (result.success) {
      res.json(result.event);
    } else {
      res.status(404).json({ error: result.error });
    }
  })
);

// ─── Delete Event ────────────────────────────────────────────────────────────

/**
 * DELETE /calendar/:eventId
 */
router.delete(
  "/:eventId",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId } = req.params;

    const result = await deleteEvent(eventId);

    if (result.success) {
      res.json({ message: "Event deleted", event: result.event });
    } else {
      res.status(404).json({ error: result.error });
    }
  })
);

export default router;
