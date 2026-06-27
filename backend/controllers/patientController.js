import Patient from '../models/Patient.js';
import Doctor  from '../models/Doctor.js';
import Disease from '../models/Disease.js';
import { addActivity } from '../utils/activity.js';
import { toApi, toApiList } from '../utils/serialize.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

export const getAllPatients = async (req, res) => {
  try {
    const { search, doctorId } = req.query;

    const filter = {};
    if (req.user.role === 'doctor' && req.user.doctorId) {
      filter.doctorId = req.user.doctorId;
    }

    let result = await Patient.find(filter).lean();

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

    return success(res, toApiList(result), 'Patients retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve patients.', 500);
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) return error(res, 'Patient not found.', 404);

    if (req.user.role === 'doctor' && req.user.doctorId && patient.doctorId !== req.user.doctorId) {
      return error(res, 'You can only view your own patients.', 403);
    }

    const doctor   = patient.doctorId ? await Doctor.findById(patient.doctorId).lean() : null;
    const diseases = await Disease.find({ patientId: patient._id }).lean();

    return success(
      res,
      { ...toApi(patient), doctor: doctor ? toApi(doctor) : null, diseases: toApiList(diseases) },
      'Patient profile retrieved successfully'
    );
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

    const doctor = doctorId ? await Doctor.findById(doctorId).lean() : null;

    const newPatient = await Patient.create({
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
    });

    await addActivity({
      icon:        'fa-user-plus',
      color:       '#00C875',
      text:        `Patient ${newPatient.name} registered`,
      detail:      `Condition: ${newPatient.condition || 'General care'} · ${newPatient.status}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(newPatient.toObject()), 'Patient registered successfully', 201);
  } catch (err) {
    return error(res, 'Failed to register patient.', 500);
  }
};

export const updatePatient = async (req, res) => {
  try {
    const existing = await Patient.findById(req.params.id).lean();
    if (!existing) return error(res, 'Patient not found.', 404);

    if (req.user.role === 'doctor' && req.user.doctorId && existing.doctorId !== req.user.doctorId) {
      return error(res, 'You can only update your own patients.', 403);
    }

    const { name, dob, gender, blood, email, phone, address, condition, assignedDoctor, doctorId, status, admitDate } = req.body;
    const doctor = doctorId ? await Doctor.findById(doctorId).lean() : null;

    const updated = await Patient.findByIdAndUpdate(
      req.params.id,
      {
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
      },
      { returnDocument: 'after' }
    ).lean();

    await addActivity({
      icon:        'fa-user-pen',
      color:       '#2C7BE5',
      text:        `Patient ${updated.name} record updated`,
      detail:      `Status: ${updated.status} · ${updated.assignedDoctor || 'Unassigned'}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(updated), 'Patient record updated successfully');
  } catch (err) {
    return error(res, 'Failed to update patient.', 500);
  }
};

export const deletePatient = async (req, res) => {
  try {
    const removed = await Patient.findByIdAndDelete(req.params.id).lean();
    if (!removed) return error(res, 'Patient not found.', 404);

    await addActivity({
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
