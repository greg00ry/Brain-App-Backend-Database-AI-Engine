import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR EVENT MODEL - Personal Assistant Calendar (Offline-first)
// ═══════════════════════════════════════════════════════════════════════════════

export type EventCategory = 'work' | 'health' | 'personal' | 'meeting' | 'reminder' | 'other';

export interface ICalendarEvent extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  category: EventCategory;
  isDone: boolean;
  createdByAction: boolean;
  sourceEntryId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  // Deklaracja metod instancji
  markAsDone(): Promise<ICalendarEvent>;
  reschedule(newStartDate: Date, newEndDate?: Date): Promise<ICalendarEvent>;
}

export interface ICalendarEventModel extends Model<ICalendarEvent> {
  getUpcoming(userId: string | Types.ObjectId, limit?: number): Promise<ICalendarEvent[]>;
  getToday(userId: string | Types.ObjectId): Promise<ICalendarEvent[]>;
  getOverdue(userId: string | Types.ObjectId): Promise<ICalendarEvent[]>;
  getInRange(userId: string | Types.ObjectId, start: Date, end: Date): Promise<ICalendarEvent[]>;
}

const calendarEventSchema = new Schema<ICalendarEvent, ICalendarEventModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      enum: ['work', 'health', 'personal', 'meeting', 'reminder', 'other'],
      default: 'other',
      index: true,
    },
    isDone: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Metadata dla trackingu źródła
    createdByAction: {
      type: Boolean,
      default: false,
    },
    sourceEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'VaultEntry',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);



// ─── Indexes dla wydajności ──────────────────────────────────────────────────

// Główne query patterns
calendarEventSchema.index({ userId: 1, startDate: 1 });
calendarEventSchema.index({ userId: 1, isDone: 1, startDate: 1 });
calendarEventSchema.index({ userId: 1, category: 1, startDate: 1 });

// Dla przypominek (events w przyszłości)
calendarEventSchema.index({ userId: 1, startDate: 1, isDone: 1 });

// ─── Virtuals ────────────────────────────────────────────────────────────────

// Check if event is in the past
calendarEventSchema.virtual('isPast').get(function () {
  return this.startDate < new Date();
});

// Check if event is today
calendarEventSchema.virtual('isToday').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.startDate >= today && this.startDate < tomorrow;
});

// Duration in minutes (if endDate exists)
calendarEventSchema.virtual('durationMinutes').get(function () {
  if (!this.endDate) return null;
  return Math.floor((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60));
});

// ─── Methods ─────────────────────────────────────────────────────────────────

// Mark event as done
calendarEventSchema.methods.markAsDone = async function () {
  this.isDone = true;
  return await this.save();
};

// Reschedule event
calendarEventSchema.methods.reschedule = async function (newStartDate: Date, newEndDate?: Date) {
  this.startDate = newStartDate;
  if (newEndDate) {
    this.endDate = newEndDate;
  }
  return await this.save();
};

// ─── Static Methods ──────────────────────────────────────────────────────────

// Get upcoming events for user
calendarEventSchema.statics.getUpcoming = function (userId: string | Types.ObjectId, limit = 10) {
  return this.find({
    userId,
    isDone: false,
    startDate: { $gte: new Date() },
  })
    .sort({ startDate: 1 })
    .limit(limit);
};

// Get events for specific date range
calendarEventSchema.statics.getInRange = function (
  userId: string | Types.ObjectId,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    userId,
    startDate: { $gte: startDate, $lte: endDate },
  }).sort({ startDate: 1 });
};

// Get today's events
calendarEventSchema.statics.getToday = function (userId: string | Types.ObjectId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    userId,
    startDate: { $gte: today, $lt: tomorrow },
  }).sort({ startDate: 1 });
};

// Get overdue events (past and not done)
calendarEventSchema.statics.getOverdue = function (userId: string | Types.ObjectId) {
  return this.find({
    userId,
    isDone: false,
    startDate: { $lt: new Date() },
  }).sort({ startDate: -1 });
};

// ─── Export ──────────────────────────────────────────────────────────────────

export const CalendarEvent = mongoose.model<ICalendarEvent, ICalendarEventModel>('CalendarEvent', calendarEventSchema);
