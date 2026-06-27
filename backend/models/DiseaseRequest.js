import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';

const diseaseRequestSchema = new Schema(
  {
    _id:                  { type: String, default: () => randomUUID() },
    requestedDiseaseName: { type: String, required: true },
    requestedByDoctor:    { type: String, required: true },
    doctorName:           { type: String },
    diagnosisId:          { type: String, default: null },
    suggestedIcdCode:     { type: String },
    suggestedCategory:    { type: String },
    status:               { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
    adminResponse:        { type: String, default: '' },
    approvedBy:           { type: String },
    rejectedBy:           { type: String },
    createdAt:            { type: String },
    updatedAt:            { type: String, default: null },
  },
  { versionKey: false }
);

diseaseRequestSchema.index({ status: 1, createdAt: -1 });

export default model('DiseaseRequest', diseaseRequestSchema);
