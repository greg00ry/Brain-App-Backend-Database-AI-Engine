import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  messages: [
    {
      role: { type: String, enum: ["user", "assistant"], required: true },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IChatHistory extends mongoose.Document {
  userId: string;
  messages: IChatMessage[];
  updatedAt: Date;
}

export const ChatHistory = mongoose.model<IChatHistory>("ChatHistory", chatHistorySchema);
