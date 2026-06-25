import { Router } from 'express';
import { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient } from '../controllers/patientController.js';

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

const ADMIN        = 'administrator';
const CLINICIAN    = 'clinician';
const RECEPTIONIST = 'receptionist';
const DOCTOR       = 'doctor';

router.get('/',       allowRoles(ADMIN, CLINICIAN, RECEPTIONIST, DOCTOR), getAllPatients);
router.get('/:id',    allowRoles(ADMIN, CLINICIAN, RECEPTIONIST, DOCTOR), getPatientById);
router.post('/',      allowRoles(ADMIN, CLINICIAN, RECEPTIONIST),          createPatient);
router.put('/:id',    allowRoles(ADMIN, CLINICIAN, DOCTOR),                updatePatient);
router.delete('/:id', allowRoles(ADMIN),                                   deletePatient);

export default router;
