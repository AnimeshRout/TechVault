/**
 * MongoDB Atlas Connection Module
 * - Connects with retry logic
 * - Handles graceful shutdown on SIGINT/SIGTERM
 * - Logs connection events
 */
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ no longer needs useNewUrlParser, useUnifiedTopology, etc.
    });

    console.log(`\n🟢 MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB Connection Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB Reconnected Successfully.');
    });
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    // Retry after 5 seconds
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

/**
 * Graceful shutdown handler
 * Closes MongoDB connection cleanly on process termination
 */
export const gracefulShutdown = async (signal) => {
  console.log(`\n📛 ${signal} received. Closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed. Server shutting down.');
  process.exit(0);
};

export default connectDB;
