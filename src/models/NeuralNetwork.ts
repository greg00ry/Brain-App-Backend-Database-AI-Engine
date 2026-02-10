import mongoose, { Document, ObjectId, Schema } from 'mongoose';

export interface INeuralNetwork extends Document {
  userId: string;
  connection: [mongoose.Types.ObjectId]
  summary: string | null;
  matchingTags: string[];
  strength: number | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const neuralNetworkSchema = new Schema<INeuralNetwork>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    connection: [{
      type: mongoose.Types.ObjectId,
      required: true,
    }],
    summary: {
      type: String,
      default: null,
    },
    matchingTags: {
      type: [String],
      default: [],
    },
    strength: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    category: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const NeuralNetwork = mongoose.model<INeuralNetwork>('NeuralNetwork', neuralNetworkSchema);
