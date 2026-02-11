import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User.js';

dotenv.config();

/**
 * Creates a default admin user for development/testing.
 * WARNING: Change the password in production!
 */
async function createAdminUser() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/brain-app';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    // NOTE: This is a default password for development. Change it in production!
    const admin = new User({
      email: 'admin@example.com',
      password: 'changeme123',
      name: 'Administrator',
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('   Email: admin@example.com');
    console.log('   Password: changeme123');
    console.log('   ⚠️  Remember to change the password in production!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
