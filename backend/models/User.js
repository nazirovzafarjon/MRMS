import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';

const userSchema = new Schema(
  {
    _id:      { type: String, default: () => randomUUID() },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, required: true, enum: ['administrator', 'clinician', 'receptionist', 'doctor'] },
    doctorId: { type: String, default: null },
  },
  { versionKey: false }
);

export default model('User', userSchema);
