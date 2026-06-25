import { Router } from 'express';
import {
  getDiseaseList,
  getDiseaseFromCatalog,
  addDiseaseToCatalog,
  updateDiseaseInCatalog,
  deleteDiseaseFromCatalog,
} from '../controllers/diseaseCatalogController.js';

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

router.get('/',       allowRoles(ADMIN, CLINICIAN, DOCTOR), getDiseaseList);
router.get('/:id',    allowRoles(ADMIN, CLINICIAN, DOCTOR), getDiseaseFromCatalog);
router.post('/',      allowRoles(ADMIN),                    addDiseaseToCatalog);
router.put('/:id',    allowRoles(ADMIN),                    updateDiseaseInCatalog);
router.delete('/:id', allowRoles(ADMIN),                    deleteDiseaseFromCatalog);

export default router;
