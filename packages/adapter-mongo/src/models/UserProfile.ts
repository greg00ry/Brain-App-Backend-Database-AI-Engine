import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  profile: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export interface IUserProfileDoc extends mongoose.Document {
  userId: string;
  profile: string;
  updatedAt: Date;
}

export const UserProfile = mongoose.model<IUserProfileDoc>("UserProfile", userProfileSchema);
