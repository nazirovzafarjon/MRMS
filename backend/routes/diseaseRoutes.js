import { Router } from 'express';
import { getAllDiseases, getDiseaseById, createDisease, updateDisease, deleteDisease } from '../controllers/diseaseController.js';

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

router.get('/',       allowRoles(ADMIN, CLINICIAN, DOCTOR), getAllDiseases);
router.get('/:id',    allowRoles(ADMIN, CLINICIAN, DOCTOR), getDiseaseById);
router.post('/',      allowRoles(ADMIN, CLINICIAN, DOCTOR), createDisease);
router.put('/:id',    allowRoles(ADMIN, CLINICIAN, DOCTOR), updateDisease);
router.delete('/:id', allowRoles(ADMIN),                    deleteDisease);

export default router;
