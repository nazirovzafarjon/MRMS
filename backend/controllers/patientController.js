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

export const getAllPatients = async (req, res) => {
  try {
    const { search, doctorId } = req.query;
    let result = [...db.patients];

    if (req.user.role === 'doctor' && req.user.doctorId) {
      result = result.filter(p => p.doctorId === req.user.doctorId);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.condition || '').toLowerCase().includes(q) ||
        (p.assignedDoctor || '').toLowerCase().includes(q)
      );
    }

    if (doctorId) {
      result = result.filter(p => p.doctorId === doctorId);
    }

    return success(res, result, 'Patients retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve patients.', 500);
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = db.patients.find(p => p.id === req.params.id);
    if (!patient) return error(res, 'Patient not found.', 404);

    if (req.user.role === 'doctor' && req.user.doctorId && patient.doctorId !== req.user.doctorId) {
      return error(res, 'You can only view your own patients.', 403);
    }

    const doctor   = db.doctors.find(d => d.id === patient.doctorId) || null;
    const diseases = db.diseases.filter(d => d.patientId === patient.id);

    return success(res, { ...patient, doctor, diseases }, 'Patient profile retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve patient.', 500);
  }
};

export const createPatient = async (req, res) => {
  try {
    const { name, dob, gender, blood, email, phone, address, condition, assignedDoctor, doctorId, status, admitDate } = req.body;

    if (!name?.trim() || !gender?.trim()) {
      return error(res, 'Name and gender are required.', 400);
    }

    const doctor = doctorId ? db.doctors.find(d => d.id === doctorId) : null;

    const newPatient = {
      id:             uuidv4(),
      name:           name.trim(),
      dob:            dob || '',
      gender:         gender.trim(),
      blood:          (blood || '').trim(),
      email:          (email || '').trim(),
      phone:          (phone || '').trim(),
      address:        (address || '').trim(),
      condition:      (condition || '').trim(),
      assignedDoctor: doctor ? doctor.name : (assignedDoctor || '').trim(),
      doctorId:       doctorId || null,
      status:         status || 'stable',
      admitDate:      admitDate || new Date().toISOString().split('T')[0],
      createdBy:      req.user.username,
      createdAt:      new Date().toISOString(),
      updatedBy:      null,
      updatedAt:      null,
    };

    db.patients.push(newPatient);

    addActivity({
      icon:        'fa-user-plus',
      color:       '#00C875',
      text:        `Patient ${newPatient.name} registered`,
      detail:      `Condition: ${newPatient.condition || 'General care'} · ${newPatient.status}`,
      performedBy: req.user.username,
    });

    return success(res, newPatient, 'Patient registered successfully', 201);
  } catch (err) {
    return error(res, 'Failed to register patient.', 500);
  }
};

export const updatePatient = async (req, res) => {
  try {
    const idx = db.patients.findIndex(p => p.id === req.params.id);
    if (idx === -1) return error(res, 'Patient not found.', 404);

    const existing = db.patients[idx];

    if (req.user.role === 'doctor' && req.user.doctorId && existing.doctorId !== req.user.doctorId) {
      return error(res, 'You can only update your own patients.', 403);
    }

    const { name, dob, gender, blood, email, phone, address, condition, assignedDoctor, doctorId, status, admitDate } = req.body;
    const doctor = doctorId ? db.doctors.find(d => d.id === doctorId) : null;

    db.patients[idx] = {
      ...existing,
      name:           name?.trim()           || existing.name,
      dob:            dob                    || existing.dob,
      gender:         gender?.trim()         || existing.gender,
      blood:          blood?.trim()          ?? existing.blood,
      email:          email?.trim()          ?? existing.email,
      phone:          phone?.trim()          ?? existing.phone,
      address:        address?.trim()        ?? existing.address,
      condition:      condition?.trim()      ?? existing.condition,
      assignedDoctor: doctor ? doctor.name : (assignedDoctor?.trim() ?? existing.assignedDoctor),
      doctorId:       doctorId !== undefined ? (doctorId || null) : existing.doctorId,
      status:         status                 || existing.status,
      admitDate:      admitDate              || existing.admitDate,
      updatedBy:      req.user.username,
      updatedAt:      new Date().toISOString(),
    };

    addActivity({
      icon:        'fa-user-pen',
      color:       '#2C7BE5',
      text:        `Patient ${db.patients[idx].name} record updated`,
      detail:      `Status: ${db.patients[idx].status} · ${db.patients[idx].assignedDoctor || 'Unassigned'}`,
      performedBy: req.user.username,
    });

    return success(res, db.patients[idx], 'Patient record updated successfully');
  } catch (err) {
    return error(res, 'Failed to update patient.', 500);
  }
};

export const deletePatient = async (req, res) => {
  try {
    const idx = db.patients.findIndex(p => p.id === req.params.id);
    if (idx === -1) return error(res, 'Patient not found.', 404);

    const [removed] = db.patients.splice(idx, 1);

    addActivity({
      icon:        'fa-user-minus',
      color:       '#E63757',
      text:        `Patient ${removed.name} record deleted`,
      detail:      `Was assigned to ${removed.assignedDoctor || 'Unassigned'}`,
      performedBy: req.user.username,
    });

    return success(res, null, 'Patient deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete patient.', 500);
  }
};
