import mongoose from "mongoose";

const vaultEntrySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },

  rawText: {
    type: String,
    required: true,
  },

  analysis: {
    summary: { type: String },
    tags: [{ type: String }],
    strength: { type: Number, min: 0, max: 10, default: 5 },
    category: { type: String },
    isProcessed: { type: Boolean, default: false },
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

  embedding: {
    type: [Number],
    default: undefined,
  },

  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

vaultEntrySchema.index({ userId: 1, createdAt: -1 });

vaultEntrySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

vaultEntrySchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export const VaultEntry = mongoose.model<IVaultEntry>('VaultEntry', vaultEntrySchema);

export interface IVaultEntry extends mongoose.Document {
  userId: string;
  rawText: string;
  analysis?: {
    summary: string;
    tags: string[];
    strength: number;
    category: string;
    isProcessed: boolean;
  };
  embedding?: number[];
  isAnalyzed: boolean;
  isConsolidated: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
