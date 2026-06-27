import { randomUUID } from 'crypto';
import ActivityLog from '../models/ActivityLog.js';

const MAX_ACTIVITY_ENTRIES = 100;

// Mirrors the original in-memory behaviour: db.activityLog.unshift(entry); keep only the latest 100.
export const addActivity = async ({ icon, color, text, detail, performedBy = 'system' }) => {
  await ActivityLog.create({
    _id: randomUUID(),
    icon,
    color,
    text,
    detail,
    performedBy,
    timestamp: new Date().toISOString(),
  });

  const excess = await ActivityLog.countDocuments() - MAX_ACTIVITY_ENTRIES;
  if (excess > 0) {
    const stale = await ActivityLog.find().sort({ timestamp: 1 }).limit(excess).select('_id').lean();
    await ActivityLog.deleteMany({ _id: { $in: stale.map(s => s._id) } });
  }
};
