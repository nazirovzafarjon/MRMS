import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env before starting the server.');
  }

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] reconnected.');
  });

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    autoIndex: true,
  });

  console.log(`[MongoDB] connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('[MongoDB] connection closed.');
};

export default mongoose;
