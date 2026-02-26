import mongoose, { Document, Schema, Types } from 'mongoose';

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT HISTORY MODEL - Conversation Memory
// ═══════════════════════════════════════════════════════════════════════════════

export type MessageRole = 'user' | 'assistant' | 'system';

export interface IChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId: string; // Identyfikator sesji (np. UUID)
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addMessage(role: MessageRole, content: string): IChatMessage;
  trimHistory(keepLast?: number): void;
  getRecentMessages(limit?: number): IChatMessage[];
}


const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // Nie tworzymy osobnego _id dla sub-dokumentu
);

const chatHistorySchema = new Schema<IChatHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index dla szybkiego wyszukiwania
chatHistorySchema.index({ userId: 1, sessionId: 1 });
chatHistorySchema.index({ userId: 1, updatedAt: -1 });

// ─── Methods ─────────────────────────────────────────────────────────────────

/**
 * Dodaje wiadomość do historii
 */
chatHistorySchema.methods.addMessage = function (
  role: MessageRole,
  content: string
): IChatMessage {
  const message: IChatMessage = {
    role,
    content,
    timestamp: new Date(),
  };
  
  this.messages.push(message);
  return message;
};

/**
 * Pobiera ostatnie N wiadomości
 */
chatHistorySchema.methods.getRecentMessages = function (limit = 10): IChatMessage[] {
  return this.messages.slice(-limit);
};

/**
 * Czyści starą historię (pozostaw tylko ostatnie N)
 */
chatHistorySchema.methods.trimHistory = function (keepLast = 50): void {
  if (this.messages.length > keepLast) {
    this.messages = this.messages.slice(-keepLast);
  }
};

// ─── Static Methods ──────────────────────────────────────────────────────────

/**
 * Znajduje lub tworzy sesję dla użytkownika
 */
chatHistorySchema.statics.findOrCreateSession = async function (
  userId: string | Types.ObjectId,
  sessionId?: string
): Promise<IChatHistory> {
  // Jeśli nie podano sessionId, użyj aktywnej sesji lub utwórz nową
  if (!sessionId) {
    // Znajdź ostatnią aktywną sesję (ostatnio aktualizowaną)
    let session = await this.findOne({ userId })
      .sort({ updatedAt: -1 })
      .limit(1);

    if (!session) {
      // Utwórz nową sesję
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      session = await this.create({
        userId,
        sessionId: newSessionId,
        messages: [],
      });
    }

    return session;
  }

  // Znajdź lub utwórz sesję o podanym ID
  let session = await this.findOne({ userId, sessionId });

  if (!session) {
    session = await this.create({
      userId,
      sessionId,
      messages: [],
    });
  }

  return session;
};

// Add interface for statics
export interface ChatHistoryModel extends mongoose.Model<IChatHistory> {
  findOrCreateSession: (
    userId: string | Types.ObjectId,
    sessionId?: string
  ) => Promise<IChatHistory>;
}

export const ChatHistory = mongoose.model<IChatHistory, ChatHistoryModel>('ChatHistory', chatHistorySchema);
