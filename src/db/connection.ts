import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config';

let isConnected = false;

export async function connectToDatabase(): Promise<boolean> {
  if (isConnected) {
    return true;
  }

  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: false
    });

    isConnected = conn.connection.readyState === 1;
    console.log(`🍃 [MongoDB] Successfully connected to database: ${conn.connection.name} (${conn.connection.host})`);
    return true;
  } catch (error: any) {
    console.warn(`⚠️ [MongoDB] Could not connect to MongoDB at ${config.mongodbUri}: ${error.message}`);
    console.warn(`ℹ️ [MongoDB] Operating with local fallback persistence sync enabled.`);
    isConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}
