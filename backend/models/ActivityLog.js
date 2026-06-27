import { Schema, model } from 'mongoose';
import { randomUUID } from 'crypto';

const activityLogSchema = new Schema(
  {
    _id:         { type: String, default: () => randomUUID() },
    icon:        { type: String },
    color:       { type: String },
    text:        { type: String },
    detail:      { type: String },
    performedBy: { type: String, default: 'system' },
    timestamp:   { type: String },
  },
  { versionKey: false }
);

activityLogSchema.index({ performedBy: 1, timestamp: -1 });

export default model('ActivityLog', activityLogSchema);
