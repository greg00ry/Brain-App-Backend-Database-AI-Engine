import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISynapseDoc extends Document {
  from: Types.ObjectId;
  to: Types.ObjectId;
  weight: number;
  stability: number;
  reason?: string;
  lastFired: Date;
  createdAt: Date;
  updatedAt: Date;
}

const synapseSchema = new Schema<ISynapseDoc>(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'VaultEntry',
      required: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'VaultEntry',
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      default: 0.1,
      min: 0.0,
      max: 1.0,
    },
    stability: {
      type: Number,
      required: true,
      default: 0.5,
      min: 0.0,
      max: 1.0,
    },
    reason: {
      type: String,
      default: null,
    },
    lastFired: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

synapseSchema.index({ from: 1, to: 1 }, { unique: true });
synapseSchema.index({ from: 1, weight: -1 });
synapseSchema.index({ to: 1, weight: -1 });
synapseSchema.index({ lastFired: 1, weight: 1 });

export const Synapse = mongoose.model<ISynapseDoc>('Synapse', synapseSchema);
