import { Types } from "mongoose";
import { CalendarEvent, ICalendarEvent, EventCategory } from "../../models/CalendarEvent.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR SERVICE - Event Management
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateEventParams {
  userId: string | Types.ObjectId;
  title: string;
  description?: string;
  startDate: Date | string;
  endDate?: Date | string;
  category?: EventCategory;
  sourceEntryId?: Types.ObjectId;
}

export interface EventResult {
  success: boolean;
  event?: ICalendarEvent;
  error?: string;
}

// ─── Create Event ────────────────────────────────────────────────────────────

/**
 * Tworzy nowe wydarzenie w kalendarzu
 */
export async function createEvent(params: CreateEventParams): Promise<EventResult> {
  try {
    // Konwertuj daty jeśli są stringami
    const startDate = typeof params.startDate === 'string' 
      ? new Date(params.startDate) 
      : params.startDate;
      
    const endDate = params.endDate 
      ? (typeof params.endDate === 'string' ? new Date(params.endDate) : params.endDate)
      : null;

    // Walidacja dat
    if (isNaN(startDate.getTime())) {
      return { success: false, error: "Invalid startDate" };
    }

    if (endDate && isNaN(endDate.getTime())) {
      return { success: false, error: "Invalid endDate" };
    }

    if (endDate && endDate <= startDate) {
      return { success: false, error: "endDate must be after startDate" };
    }

    // Utworzenie wydarzenia
    const event = new CalendarEvent({
      userId: params.userId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      startDate,
      endDate,
      category: params.category || 'other',
      createdByAction: !!params.sourceEntryId,
      sourceEntryId: params.sourceEntryId || null,
      isDone: false,
    });

    await event.save();

    console.log(`[CalendarService] ✓ Event created: "${event.title}" at ${event.startDate.toISOString()}`);

    return { success: true, event };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CalendarService] ✗ Failed to create event: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// ─── Get Events ──────────────────────────────────────────────────────────────

/**
 * Pobiera nadchodzące wydarzenia dla użytkownika
 */
export async function getUpcomingEvents(
  userId: string | Types.ObjectId,
  limit = 10
): Promise<ICalendarEvent[]> {
  return CalendarEvent.getUpcoming(userId, limit);
}

/**
 * Pobiera wydarzenia na dziś
 */
export async function getTodayEvents(
  userId: string | Types.ObjectId
): Promise<ICalendarEvent[]> {
  return CalendarEvent.getToday(userId);
}

/**
 * Pobiera zaległe wydarzenia (przeszłe i nieukończone)
 */
export async function getOverdueEvents(
  userId: string | Types.ObjectId
): Promise<ICalendarEvent[]> {
  return CalendarEvent.getOverdue(userId);
}

/**
 * Pobiera wydarzenia w zakresie dat
 */
export async function getEventsInRange(
  userId: string | Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<ICalendarEvent[]> {
  return CalendarEvent.getInRange(userId, startDate, endDate);
}

// ─── Update Event ────────────────────────────────────────────────────────────

/**
 * Oznacza wydarzenie jako ukończone
 */
export async function markEventAsDone(
  eventId: string | Types.ObjectId
): Promise<EventResult> {
  try {
    const event = await CalendarEvent.findById(eventId);
    
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    await event.markAsDone();

    console.log(`[CalendarService] ✓ Event marked as done: "${event.title}"`);

    return { success: true, event };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CalendarService] ✗ Failed to mark event as done: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Przesuwa wydarzenie na nową datę
 */
export async function rescheduleEvent(
  eventId: string | Types.ObjectId,
  newStartDate: Date,
  newEndDate?: Date
): Promise<EventResult> {
  try {
    const event = await CalendarEvent.findById(eventId);
    
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    await event.reschedule(newStartDate, newEndDate);

    console.log(`[CalendarService] ✓ Event rescheduled: "${event.title}" to ${newStartDate.toISOString()}`);

    return { success: true, event };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CalendarService] ✗ Failed to reschedule event: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Usuwa wydarzenie
 */
export async function deleteEvent(
  eventId: string | Types.ObjectId
): Promise<EventResult> {
  try {
    const event = await CalendarEvent.findByIdAndDelete(eventId);
    
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    console.log(`[CalendarService] ✓ Event deleted: "${event.title}"`);

    return { success: true, event };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CalendarService] ✗ Failed to delete event: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// ─── Statistics ──────────────────────────────────────────────────────────────

/**
 * Pobiera statystyki kalendarza dla użytkownika
 */
export async function getCalendarStats(userId: string | Types.ObjectId): Promise<{
  totalEvents: number;
  upcomingEvents: number;
  overdueEvents: number;
  completedToday: number;
  eventsByCategory: Record<EventCategory, number>;
}> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    totalEvents,
    upcomingEvents,
    overdueEvents,
    completedToday,
    eventsByCategory,
  ] = await Promise.all([
    // Total events
    CalendarEvent.countDocuments({ userId }),
    
    // Upcoming events
    CalendarEvent.countDocuments({
      userId,
      isDone: false,
      startDate: { $gte: now },
    }),
    
    // Overdue events
    CalendarEvent.countDocuments({
      userId,
      isDone: false,
      startDate: { $lt: now },
    }),
    
    // Completed today
    CalendarEvent.countDocuments({
      userId,
      isDone: true,
      updatedAt: { $gte: todayStart, $lt: todayEnd },
    }),
    
    // By category
    CalendarEvent.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  // Convert category aggregation to object
  const categoryStats: Record<EventCategory, number> = {
    work: 0,
    health: 0,
    personal: 0,
    meeting: 0,
    reminder: 0,
    other: 0,
  };

  eventsByCategory.forEach((item) => {
    categoryStats[item._id as EventCategory] = item.count;
  });

  return {
    totalEvents,
    upcomingEvents,
    overdueEvents,
    completedToday,
    eventsByCategory: categoryStats,
  };
}
