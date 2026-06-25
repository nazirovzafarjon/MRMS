import { randomUUID as uuidv4 } from 'crypto';
import bcrypt from 'bcryptjs';
import db     from '../db/db.js';

const SALT_ROUNDS = 10;

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

const addActivity = ({ icon, color, text, detail, performedBy = 'system' }) => {
  db.activityLog.unshift({ id: uuidv4(), icon, color, text, detail, performedBy, timestamp: new Date().toISOString() });
  if (db.activityLog.length > 100) db.activityLog.length = 100;
};

export const getAllDoctors = async (req, res) => {
  try {
    const { search } = req.query;
    let result = [...db.doctors];

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q)
      );
    }

    return success(res, result, 'Doctors retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve doctors.', 500);
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = db.doctors.find(d => d.id === req.params.id);
    if (!doctor) return error(res, 'Doctor not found.', 404);

    return success(res, doctor, 'Doctor retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve doctor.', 500);
  }
};

export const createDoctor = async (req, res) => {
  try {
    const { name, specialization, email, phone, department, status, joinDate, username, password } = req.body;

    if (!name?.trim() || !specialization?.trim() || !email?.trim() || !department?.trim()) {
      return error(res, 'Name, specialization, email, and department are required.', 400);
    }

    let doctorUsername = null;
    if (username?.trim()) {
      if (!password?.trim()) {
        return error(res, 'Password is required when a username is provided.', 400);
      }

      const usernameAlreadyTaken = db.users.some(u => u.username === username.trim());
      if (usernameAlreadyTaken) {
        return error(res, `Username "${username.trim()}" is already taken. Please choose a different one.`, 400);
      }

      doctorUsername = username.trim();
    }

    const newDoctorId = uuidv4();

    const newDoctor = {
      id:             newDoctorId,
      name:           name.trim(),
      specialization: specialization.trim(),
      email:          email.trim(),
      phone:          (phone || '').trim(),
      department:     department.trim(),
      status:         status || 'active',
      joinDate:       joinDate || new Date().toISOString().split('T')[0],
      patients:       0,
      username:       doctorUsername,
      createdBy:      req.user.username,
      createdAt:      new Date().toISOString(),
      updatedBy:      null,
      updatedAt:      null,
    };

    db.doctors.push(newDoctor);

    if (doctorUsername) {
      const hashedPassword = await bcrypt.hash(password.trim(), SALT_ROUNDS);
      db.users.push({
        id:       uuidv4(),
        username: doctorUsername,
        password: hashedPassword,
        role:     'doctor',
        doctorId: newDoctorId,
      });
    }

    addActivity({
      icon:        'fa-user-doctor',
      color:       '#6741d9',
      text:        `Dr. profile created: ${newDoctor.name}`,
      detail:      `${newDoctor.specialization} · ${newDoctor.department}`,
      performedBy: req.user.username,
    });

    return success(res, newDoctor, 'Doctor created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create doctor.', 500);
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const idx = db.doctors.findIndex(d => d.id === req.params.id);
    if (idx === -1) return error(res, 'Doctor not found.', 404);

    const { name, specialization, email, phone, department, status, joinDate, patients } = req.body;
    const existing = db.doctors[idx];

    db.doctors[idx] = {
      ...existing,
      name:           name?.trim()           || existing.name,
      specialization: specialization?.trim() || existing.specialization,
      email:          email?.trim()          || existing.email,
      phone:          phone?.trim()          ?? existing.phone,
      department:     department?.trim()     || existing.department,
      status:         status                 || existing.status,
      joinDate:       joinDate               || existing.joinDate,
      patients:       patients !== undefined ? parseInt(patients) : existing.patients,
      updatedBy:      req.user.username,
      updatedAt:      new Date().toISOString(),
    };

    addActivity({
      icon:        'fa-user-pen',
      color:       '#2C7BE5',
      text:        `${db.doctors[idx].name} profile updated`,
      detail:      `${db.doctors[idx].specialization} · status: ${db.doctors[idx].status}`,
      performedBy: req.user.username,
    });

    return success(res, db.doctors[idx], 'Doctor updated successfully');
  } catch (err) {
    return error(res, 'Failed to update doctor.', 500);
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const idx = db.doctors.findIndex(d => d.id === req.params.id);
    if (idx === -1) return error(res, 'Doctor not found.', 404);

    const [removed] = db.doctors.splice(idx, 1);

    const userIdx = db.users.findIndex(u => u.doctorId === removed.id);
    if (userIdx !== -1) {
      db.users.splice(userIdx, 1);
    }

    addActivity({
      icon:        'fa-user-minus',
      color:       '#E63757',
      text:        `${removed.name} removed from the system`,
      detail:      `${removed.specialization} · ${removed.department}`,
      performedBy: req.user.username,
    });

    return success(res, null, 'Doctor deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete doctor.', 500);
  }
};
