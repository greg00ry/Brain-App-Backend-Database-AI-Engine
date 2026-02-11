import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVaultEntry extends Document {
  _id: Types.ObjectId;
  userId: string;
  rawText: string;
  summary: string | null;
  tags: string[];
  strength: number;
  category: string | null;
  isAnalyzed: boolean;
  isConsolidated: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vaultEntrySchema = new Schema<IVaultEntry>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    strength: {
      type: Number,
      min: 0,
      max: 10,
      default: 5, // Start at middle strength
    },
    category: {
      type: String,
      default: null,
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
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
vaultEntrySchema.index({ userId: 1, isAnalyzed: 1 });
vaultEntrySchema.index({ userId: 1, strength: 1 });
vaultEntrySchema.index({ userId: 1, lastActivityAt: -1 });
vaultEntrySchema.index({ isConsolidated: 1, strength: 1 });

export const VaultEntry = mongoose.model<IVaultEntry>('VaultEntry', vaultEntrySchema);
