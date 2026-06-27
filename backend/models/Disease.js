import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';

const diseaseSchema = new Schema(
  {
    _id:                   { type: String, default: () => randomUUID() },
    patient:               { type: String, default: '' },
    patientId:             { type: String, default: null, index: true },
    doctor:                { type: String, default: '' },
    code:                  { type: String, default: '' },
    name:                  { type: String, required: true },
    category:              { type: String, required: true },
    severity:              { type: String, required: true },
    date:                  { type: String },
    notes:                 { type: String, default: '' },
    status:                { type: String, default: 'active' },
    diseaseRequestPending: { type: Boolean },
    diseaseRequestStatus:  { type: String },
    createdBy:             { type: String },
    createdAt:             { type: String },
    updatedBy:             { type: String, default: null },
    updatedAt:             { type: String, default: null },
  },
  { versionKey: false }
);

export default model('Disease', diseaseSchema);
