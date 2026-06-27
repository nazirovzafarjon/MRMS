import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';

const doctorSchema = new Schema(
  {
    _id:            { type: String, default: () => randomUUID() },
    name:           { type: String, required: true },
    specialization: { type: String, required: true },
    email:          { type: String, required: true },
    phone:          { type: String, default: '' },
    department:     { type: String, required: true },
    status:         { type: String, default: 'active' },
    joinDate:       { type: String },
    patients:       { type: Number, default: 0 },
    username:       { type: String, default: null },
    createdBy:      { type: String },
    createdAt:      { type: String },
    updatedBy:      { type: String, default: null },
    updatedAt:      { type: String, default: null },
  },
  { versionKey: false }
);

export default model('Doctor', doctorSchema);
