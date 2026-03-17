import mongoose from "mongoose";

/**
 * Rozszerzone Entry Schema z Action Tools
 * 
 * Dodaj to do swojego istniejącego Entry.model.ts
 */

const vaultEntrySchema = new mongoose.Schema({
  // ─── Istniejące pola (nie zmieniaj) ────────────────────────────────────────
  
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  rawText: { 
    type: String, 
    required: true 
  },
  
  analysis: {
    summary: { type: String},
    tags: [{ type: String }],
    strength: { type: Number, min: 0, max: 10, default: 5 },
    category: { type: String },
    isProcessed: { type: Boolean, default: false }
  },

  // ─── NOWE POLE: Action Tools ───────────────────────────────────────────────
  // Dodaj to poniżej istniejących pól
  
  actionTools: {
    // Search action (Tavily)
    search: {
      completed: { type: Boolean, default: false },
      facts: [{ type: String }],
      searchResults: { type: String },
      sources: [{ type: String }],
      timestamp: { type: Date },
      error: { type: String }
    },
    
    // Email action (Nodemailer)
    email: {
      completed: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      messageId: { type: String },
      recipient: { type: String },
      timestamp: { type: Date },
      error: { type: String }
    },
    calendar: {
        status: { 
          type: String, 
          enum: ['pending', 'processing', 'completed', 'failed'],
          default: 'pending' 
        },
        completed: { type: Boolean, default: false },
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'CalendarEvent' },
        eventTitle: { type: String },
        eventDate: { type: Date },
        timestamp: { type: Date },
        error: { type: String },
      },
       uiHint: {
        type: String,
        enum: ['pulse', 'calendar_entry', 'mail_sent', 'search_complete', 'thinking', 'error', 'success'],
        default: 'pulse',
      },
  },

  isAnalyzed: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    isConsolidated: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

  // ─── Timestamps ────────────────────────────────────────────────────────────
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index dla szybszego wyszukiwania wpisów z action tools
vaultEntrySchema.index({ userId: 1, "actionTools.search.completed": 1 });
vaultEntrySchema.index({ userId: 1, "actionTools.email.completed": 1 });
vaultEntrySchema.index({ userId: 1, createdAt: -1 });

// Middleware: aktualizuj updatedAt przy każdej modyfikacji
vaultEntrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

vaultEntrySchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Export model
export const VaultEntry = mongoose.model<IVaultEntry>('VaultEntry', vaultEntrySchema);

// ═══════════════════════════════════════════════════════════════════════════════
// TypeScript Types (opcjonalnie dla TypeScript)
// ═══════════════════════════════════════════════════════════════════════════════

export type UIHintType = 
  | 'pulse'           // Domyślna animacja
  | 'calendar_entry'  // Gdy utworzono event
  | 'mail_sent'       // Gdy wysłano mail
  | 'search_complete' // Gdy research zakończony
  | 'thinking'        // AI myśli
  | 'error'           // Błąd
  | 'success';        // Sukces

export interface IVaultEntry extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  rawText: string;
  analysis?: {
    summary: string;
    tags: string[];
    strength: number;
    category: string;
    isProcessed: boolean;
  };
  actionTools?: {
    search?: {
      completed: boolean;
      facts?: string[];
      searchResults?: string;
      sources?: string[];
      timestamp?: Date;
      error?: string;
    };
    email?: {
      completed: boolean;
      sent?: boolean;
      messageId?: string;
      recipient?: string;
      timestamp?: Date;
      error?: string;
    };
    calendar?: {
          status: 'pending' | 'processing' | 'completed' | 'failed';
          completed: boolean;
          eventId?: mongoose.Types.ObjectId;
          eventTitle?: string;
          eventDate?: Date;
          timestamp?: Date;
          error?: string;
        };
        uiHint?: UIHintType;
  };
  isAnalyzed: boolean;
  isConsolidated: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
