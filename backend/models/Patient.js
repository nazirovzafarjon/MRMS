import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';

const patientSchema = new Schema(
  {
    _id:            { type: String, default: () => randomUUID() },
    name:           { type: String, required: true },
    dob:            { type: String, default: '' },
    gender:         { type: String, required: true },
    blood:          { type: String, default: '' },
    email:          { type: String, default: '' },
    phone:          { type: String, default: '' },
    address:        { type: String, default: '' },
    condition:      { type: String, default: '' },
    assignedDoctor: { type: String, default: '' },
    doctorId:       { type: String, default: null, index: true },
    status:         { type: String, default: 'stable' },
    admitDate:      { type: String },
    createdBy:      { type: String },
    createdAt:      { type: String },
    updatedBy:      { type: String, default: null },
    updatedAt:      { type: String, default: null },
  },
  { versionKey: false }
);

export default model('Patient', patientSchema);
