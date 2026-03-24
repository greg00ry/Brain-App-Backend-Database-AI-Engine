import mongoose from "mongoose";

const actionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isBuiltIn: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export interface IAction extends mongoose.Document {
  name: string;
  description: string;
  isActive: boolean;
  isBuiltIn: boolean;
  createdAt: Date;
}

export const Action = mongoose.model<IAction>("Action", actionSchema);
