import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import dotenv from 'dotenv';

dotenv.config();

const categories = [
  {
    name: 'Work',
    description: 'Professional tasks, projects, meetings, deadlines, career development',
    icon: '💼',
    color: '#3B82F6',
    keywords: ['work', 'job', 'project', 'meeting', 'deadline', 'career', 'office', 'boss', 'colleague', 'client'],
    order: 1,
  },
  {
    name: 'Personal',
    description: 'Personal life, self-reflection, diary entries, daily experiences',
    icon: '👤',
    color: '#8B5CF6',
    keywords: ['personal', 'myself', 'life', 'diary', 'day', 'experience', 'feeling', 'thought'],
    order: 2,
  },
  {
    name: 'Health',
    description: 'Physical and mental health, exercise, diet, medical, wellness',
    icon: '❤️',
    color: '#EF4444',
    keywords: ['health', 'exercise', 'gym', 'diet', 'sleep', 'doctor', 'medical', 'wellness', 'mental', 'stress'],
    order: 3,
  },
  {
    name: 'Finance',
    description: 'Money, investments, budgeting, expenses, savings, financial planning',
    icon: '💰',
    color: '#10B981',
    keywords: ['money', 'finance', 'investment', 'budget', 'expense', 'savings', 'bank', 'pay', 'cost', 'income'],
    order: 4,
  },
  {
    name: 'Learning',
    description: 'Education, courses, books, skills development, knowledge acquisition',
    icon: '📚',
    color: '#F59E0B',
    keywords: ['learn', 'study', 'course', 'book', 'skill', 'education', 'knowledge', 'training', 'read'],
    order: 5,
  },
  {
    name: 'Relationships',
    description: 'Family, friends, romantic relationships, social connections',
    icon: '👥',
    color: '#EC4899',
    keywords: ['family', 'friend', 'relationship', 'partner', 'love', 'social', 'people', 'connection'],
    order: 6,
  },
  {
    name: 'Goals',
    description: 'Objectives, ambitions, plans, milestones, achievements',
    icon: '🎯',
    color: '#6366F1',
    keywords: ['goal', 'objective', 'plan', 'milestone', 'achievement', 'target', 'ambition', 'dream'],
    order: 7,
  },
  {
    name: 'Ideas',
    description: 'Creative thoughts, innovations, brainstorming, concepts',
    icon: '💡',
    color: '#FBBF24',
    keywords: ['idea', 'creative', 'innovation', 'concept', 'brainstorm', 'inspiration', 'imagine'],
    order: 8,
  },
  {
    name: 'Travel',
    description: 'Trips, vacations, places, adventures, exploration',
    icon: '✈️',
    color: '#0EA5E9',
    keywords: ['travel', 'trip', 'vacation', 'place', 'adventure', 'explore', 'visit', 'destination'],
    order: 9,
  },
  {
    name: 'Projects',
    description: 'Side projects, hobbies, creative work, building things',
    icon: '🔧',
    color: '#64748B',
    keywords: ['project', 'build', 'create', 'hobby', 'side', 'develop', 'make', 'design'],
    order: 10,
  },
  {
    name: 'Uncategorized',
    description: 'Entries that do not fit into other categories',
    icon: '📋',
    color: '#9CA3AF',
    keywords: [],
    order: 99,
  },
];

async function seedCategories() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/brain-app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert new categories
    const result = await Category.insertMany(categories);
    console.log(`✅ Seeded ${result.length} categories:`);
    
    result.forEach((cat) => {
      console.log(`   ${cat.icon} ${cat.name} - ${cat.description.substring(0, 50)}...`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Categories seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
