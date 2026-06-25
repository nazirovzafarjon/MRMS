import { randomUUID as uuidv4 } from 'crypto';
import db from '../db/db.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

const addActivity = ({ icon, color, text, detail, performedBy = 'system' }) => {
  db.activityLog.unshift({ id: uuidv4(), icon, color, text, detail, performedBy, timestamp: new Date().toISOString() });
  if (db.activityLog.length > 100) db.activityLog.length = 100;
};

export const getAllDiseases = async (req, res) => {
  try {
    const { search, severity, patientId, category } = req.query;
    let result = [...db.diseases];

    if (req.user.role === 'doctor' && req.user.doctorId) {
      const myPatientIds = db.patients
        .filter(p => p.doctorId === req.user.doctorId)
        .map(p => p.id);
      result = result.filter(d => myPatientIds.includes(d.patientId));
    }

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.code || '').toLowerCase().includes(q) ||
        (d.patient || '').toLowerCase().includes(q)
      );
    }

    if (severity)  result = result.filter(d => d.severity === severity);
    if (category)  result = result.filter(d => d.category === category);
    if (patientId) result = result.filter(d => d.patientId === patientId);

    return success(res, result, 'Diagnoses retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve diagnoses.', 500);
  }
};

export const getDiseaseById = async (req, res) => {
  try {
    const disease = db.diseases.find(d => d.id === req.params.id);
    if (!disease) return error(res, 'Diagnosis record not found.', 404);

    return success(res, disease, 'Diagnosis retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve diagnosis.', 500);
  }
};

export const createDisease = async (req, res) => {
  try {
    const {
      patient, patientId, doctor, code, name,
      category, severity, date, notes, status,
      isNewDiseaseRequest, requestedDiseaseName
    } = req.body;

    if (!name?.trim() || !category?.trim() || !severity?.trim()) {
      return error(res, 'Diagnosis name, category, and severity are required.', 400);
    }

    const newDiagnosisId = uuidv4();

    const newDiagnosis = {
      id:        newDiagnosisId,
      patient:   (patient || '').trim(),
      patientId: patientId || null,
      doctor:    (doctor || '').trim(),
      code:      (code || '').trim(),
      name:      name.trim(),
      category:  category.trim(),
      severity:  severity.trim(),
      date:      date || new Date().toISOString().split('T')[0],
      notes:     (notes || '').trim(),
      status:    status || 'active',
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
      updatedBy: null,
      updatedAt: null,
    };

    db.diseases.push(newDiagnosis);

    if (isNewDiseaseRequest && requestedDiseaseName?.trim()) {
      db.diseaseRequests.push({
        id:                    uuidv4(),
        requestedDiseaseName:  requestedDiseaseName.trim(),
        requestedByDoctor:     req.user.username,
        doctorName:            doctor || req.user.username,
        diagnosisId:           newDiagnosisId,
        suggestedIcdCode:      (code || '').trim(),
        suggestedCategory:     category.trim(),
        status:                'pending',
        adminResponse:         '',
        createdAt:             new Date().toISOString(),
        updatedAt:             null,
      });

      newDiagnosis.diseaseRequestPending = true;
    }

    const severityColor = { severe: '#E63757', moderate: '#F6C343', mild: '#2C7BE5' };

    addActivity({
      icon:        'fa-file-medical',
      color:       severityColor[severity] || '#2C7BE5',
      text:        `Diagnosis "${newDiagnosis.name}" added`,
      detail:      `Patient: ${newDiagnosis.patient || 'Unknown'} · ${newDiagnosis.doctor || 'Unassigned'}`,
      performedBy: req.user.username,
    });

    return success(res, newDiagnosis, 'Diagnosis created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create diagnosis.', 500);
  }
};

export const updateDisease = async (req, res) => {
  try {
    const idx = db.diseases.findIndex(d => d.id === req.params.id);
    if (idx === -1) return error(res, 'Diagnosis record not found.', 404);

    const { patient, patientId, doctor, code, name, category, severity, date, notes, status } = req.body;
    const existing = db.diseases[idx];

    db.diseases[idx] = {
      ...existing,
      patient:   patient?.trim()   || existing.patient,
      patientId: patientId !== undefined ? (patientId || null) : existing.patientId,
      doctor:    doctor?.trim()    ?? existing.doctor,
      code:      code?.trim()      ?? existing.code,
      name:      name?.trim()      || existing.name,
      category:  category?.trim()  || existing.category,
      severity:  severity?.trim()  || existing.severity,
      date:      date              || existing.date,
      notes:     notes?.trim()     ?? existing.notes,
      status:    status            || existing.status,
      updatedBy: req.user.username,
      updatedAt: new Date().toISOString(),
    };

    addActivity({
      icon:        'fa-file-pen',
      color:       '#F6C343',
      text:        `Diagnosis "${db.diseases[idx].name}" updated`,
      detail:      `Patient: ${db.diseases[idx].patient || 'Unknown'} · ${db.diseases[idx].status}`,
      performedBy: req.user.username,
    });

    return success(res, db.diseases[idx], 'Diagnosis updated successfully');
  } catch (err) {
    return error(res, 'Failed to update diagnosis.', 500);
  }
};

export const deleteDisease = async (req, res) => {
  try {
    const idx = db.diseases.findIndex(d => d.id === req.params.id);
    if (idx === -1) return error(res, 'Diagnosis record not found.', 404);

    const [removed] = db.diseases.splice(idx, 1);

    addActivity({
      icon:        'fa-file-circle-minus',
      color:       '#E63757',
      text:        `Diagnosis "${removed.name}" removed`,
      detail:      `Was for ${removed.patient || 'Unknown patient'}`,
      performedBy: req.user.username,
    });

    return success(res, null, 'Diagnosis deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete diagnosis.', 500);
  }
};
