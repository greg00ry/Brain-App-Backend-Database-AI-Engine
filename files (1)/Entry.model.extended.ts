import mongoose from "mongoose";

/**
 * Rozszerzone Entry Schema z Action Tools
 * 
 * Dodaj to do swojego istniejącego Entry.model.ts
 */

const EntrySchema = new mongoose.Schema({
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
    summary: { type: String, required: true },
    tags: [{ type: String }],
    strength: { type: Number, min: 0, max: 10 },
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
    }
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
EntrySchema.index({ userId: 1, "actionTools.search.completed": 1 });
EntrySchema.index({ userId: 1, "actionTools.email.completed": 1 });
EntrySchema.index({ userId: 1, createdAt: -1 });

// Middleware: aktualizuj updatedAt przy każdej modyfikacji
EntrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

EntrySchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Export model
export const Entry = mongoose.model('Entry', EntrySchema);

// ═══════════════════════════════════════════════════════════════════════════════
// TypeScript Types (opcjonalnie dla TypeScript)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IEntry extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  rawText: string;
  analysis: {
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
  };
  createdAt: Date;
  updatedAt: Date;
}
