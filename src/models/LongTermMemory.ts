import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILongTermMemory extends Document {
  userId: string;
  summary: string | null;
  tags: string[];
  strength: number;
  categoryId: Types.ObjectId | null;
  categoryName: string | null;
  sourceEntryIds: Types.ObjectId[];
  topic: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const longTermMemorySchema = new Schema<ILongTermMemory>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
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
      default: 10,
      min: 1,
      max: 10,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    categoryName: {
      type: String,
      default: null,
    },
    sourceEntryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'VaultEntry',
      default: [],
    },
    topic: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
longTermMemorySchema.index({ userId: 1, categoryId: 1 });
longTermMemorySchema.index({ userId: 1, topic: 1 });

export const LongTermMemory = mongoose.model<ILongTermMemory>('LongTermMemory', longTermMemorySchema);
