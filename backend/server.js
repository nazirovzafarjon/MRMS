import 'dotenv/config';
import app from './app.js';
import { connectDB, disconnectDB } from './db/db.js';
import { seedInitialData } from './db/seed.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await seedInitialData();

  const server = app.listen(PORT, () => {
    console.log(`\n  MRMS API running on http://localhost:${PORT}`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Frontend    : ${process.env.FRONTEND_ORIGIN}`);
    console.log('\n  Demo credentials:');
    console.log('    admin        / admin123      (Administrator)');
    console.log('    clinician    / clinic123     (Clinician)');
    console.log('    receptionist / recept123     (Receptionist)');
  });

  const shutdown = async (signal) => {
    console.log(`\n  ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('[Server] failed to start:', err);
  process.exit(1);
});
