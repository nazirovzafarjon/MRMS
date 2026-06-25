import { Router } from 'express';
import { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor } from '../controllers/doctorController.js';

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

router.get('/',       allowRoles(ADMIN, CLINICIAN, RECEPTIONIST, DOCTOR), getAllDoctors);
router.get('/:id',    allowRoles(ADMIN, CLINICIAN, RECEPTIONIST, DOCTOR), getDoctorById);
router.post('/',      allowRoles(ADMIN),                                   createDoctor);
router.put('/:id',    allowRoles(ADMIN),                                   updateDoctor);
router.delete('/:id', allowRoles(ADMIN),                                   deleteDoctor);

export default router;
