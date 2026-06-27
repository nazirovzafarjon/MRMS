import Disease        from '../models/Disease.js';
import Patient         from '../models/Patient.js';
import DiseaseRequest  from '../models/DiseaseRequest.js';
import { addActivity } from '../utils/activity.js';
import { toApi, toApiList } from '../utils/serialize.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

export const getAllDiseases = async (req, res) => {
  try {
    const { search, severity, patientId, category } = req.query;

    const filter = {};

    if (req.user.role === 'doctor' && req.user.doctorId) {
      const myPatients = await Patient.find({ doctorId: req.user.doctorId }).select('_id').lean();
      filter.patientId = { $in: myPatients.map(p => p._id) };
    }

    if (severity)  filter.severity  = severity;
    if (category)  filter.category = category;
    if (patientId) filter.patientId = patientId;

    let result = await Disease.find(filter).lean();

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.code || '').toLowerCase().includes(q) ||
        (d.patient || '').toLowerCase().includes(q)
      );
    }

    return success(res, toApiList(result), 'Diagnoses retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve diagnoses.', 500);
  }
};

export const getDiseaseById = async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id).lean();
    if (!disease) return error(res, 'Diagnosis record not found.', 404);

    return success(res, toApi(disease), 'Diagnosis retrieved successfully');
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

    const newDiagnosis = await Disease.create({
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
    });

    if (isNewDiseaseRequest && requestedDiseaseName?.trim()) {
      await DiseaseRequest.create({
        requestedDiseaseName:  requestedDiseaseName.trim(),
        requestedByDoctor:     req.user.username,
        doctorName:            doctor || req.user.username,
        diagnosisId:           newDiagnosis._id,
        suggestedIcdCode:      (code || '').trim(),
        suggestedCategory:     category.trim(),
        status:                'pending',
        adminResponse:         '',
        createdAt:             new Date().toISOString(),
        updatedAt:             null,
      });

      newDiagnosis.diseaseRequestPending = true;
      await newDiagnosis.save();
    }

    const severityColor = { severe: '#E63757', moderate: '#F6C343', mild: '#2C7BE5' };

    await addActivity({
      icon:        'fa-file-medical',
      color:       severityColor[severity] || '#2C7BE5',
      text:        `Diagnosis "${newDiagnosis.name}" added`,
      detail:      `Patient: ${newDiagnosis.patient || 'Unknown'} · ${newDiagnosis.doctor || 'Unassigned'}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(newDiagnosis.toObject()), 'Diagnosis created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create diagnosis.', 500);
  }
};

export const updateDisease = async (req, res) => {
  try {
    const existing = await Disease.findById(req.params.id).lean();
    if (!existing) return error(res, 'Diagnosis record not found.', 404);

    const { patient, patientId, doctor, code, name, category, severity, date, notes, status } = req.body;

    const updated = await Disease.findByIdAndUpdate(
      req.params.id,
      {
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
      },
      { returnDocument: 'after' }
    ).lean();

    await addActivity({
      icon:        'fa-file-pen',
      color:       '#F6C343',
      text:        `Diagnosis "${updated.name}" updated`,
      detail:      `Patient: ${updated.patient || 'Unknown'} · ${updated.status}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(updated), 'Diagnosis updated successfully');
  } catch (err) {
    return error(res, 'Failed to update diagnosis.', 500);
  }
};

export const deleteDisease = async (req, res) => {
  try {
    const removed = await Disease.findByIdAndDelete(req.params.id).lean();
    if (!removed) return error(res, 'Diagnosis record not found.', 404);

    await addActivity({
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
