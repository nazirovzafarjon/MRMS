import { Router } from 'express';
import { getStats } from '../controllers/dashboardController.js';

const router = Router();

const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Access denied. Required roles: ${roles.join(', ')}.` });
  }
  next();
};

// GET /api/dashboard/stats
// Returns real-time counts sourced directly from the DB for the requesting role.
router.get(
  '/stats',
  allowRoles('administrator', 'clinician', 'receptionist', 'doctor'),
  getStats,
);

export default router;
