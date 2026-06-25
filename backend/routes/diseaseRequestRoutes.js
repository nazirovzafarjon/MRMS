import { Router } from 'express';
import {
  getAllRequests,
  submitDiseaseRequest,
  approveRequest,
  rejectRequest,
} from '../controllers/diseaseRequestController.js';

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

const ADMIN     = 'administrator';
const CLINICIAN = 'clinician';
const DOCTOR    = 'doctor';

router.get('/',            allowRoles(ADMIN),                   getAllRequests);
router.post('/',           allowRoles(ADMIN, CLINICIAN, DOCTOR), submitDiseaseRequest);
router.put('/:id/approve', allowRoles(ADMIN),                   approveRequest);
router.put('/:id/reject',  allowRoles(ADMIN),                   rejectRequest);

export default router;
