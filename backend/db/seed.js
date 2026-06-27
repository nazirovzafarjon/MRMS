import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const SALT_ROUNDS = 10;

// Recreates the three demo accounts that used to be hard-seeded into the in-memory
// store on every boot. Only runs once per database, since data now persists.
export const seedInitialData = async () => {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return;

  await User.insertMany([
    { _id: randomUUID(), username: 'admin',        password: bcrypt.hashSync('admin123',  SALT_ROUNDS), role: 'administrator', doctorId: null },
    { _id: randomUUID(), username: 'clinician',    password: bcrypt.hashSync('clinic123', SALT_ROUNDS), role: 'clinician',     doctorId: null },
    { _id: randomUUID(), username: 'receptionist', password: bcrypt.hashSync('recept123', SALT_ROUNDS), role: 'receptionist',  doctorId: null },
  ]);

  console.log('[MongoDB] seeded demo users (admin, clinician, receptionist).');
};
