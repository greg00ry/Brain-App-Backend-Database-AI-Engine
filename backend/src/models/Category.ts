import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description: string;
  icon: string;
  color: string;
  keywords: string[];
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: '📁',
    },
    color: {
      type: String,
      default: '#6B7280',
    },
    keywords: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);

// Helper to get categories for AI prompt
export async function getCategoriesForAI(): Promise<{ name: string; description: string; keywords: string[] }[]> {
  const categories = await Category.find({ isActive: true }).sort({ order: 1 });
  return categories.map((cat: ICategory) => ({
    name: cat.name,
    description: cat.description,
    keywords: cat.keywords,
  }));
}
