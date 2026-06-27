import bcrypt from 'bcryptjs';
import Doctor from '../models/Doctor.js';
import User   from '../models/User.js';
import { addActivity } from '../utils/activity.js';
import { toApi, toApiList } from '../utils/serialize.js';

const SALT_ROUNDS = 10;

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

export const getAllDoctors = async (req, res) => {
  try {
    const { search } = req.query;
    let result = await Doctor.find().lean();

    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q)
      );
    }

    return success(res, toApiList(result), 'Doctors retrieved successfully');
  } catch (err) {
    return error(res, 'Failed to retrieve doctors.', 500);
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) return error(res, 'Doctor not found.', 404);

    return success(res, toApi(doctor), 'Doctor retrieved successfully');
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

      const usernameAlreadyTaken = await User.exists({ username: username.trim() });
      if (usernameAlreadyTaken) {
        return error(res, `Username "${username.trim()}" is already taken. Please choose a different one.`, 400);
      }

      doctorUsername = username.trim();
    }

    const newDoctor = await Doctor.create({
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
    });

    if (doctorUsername) {
      const hashedPassword = await bcrypt.hash(password.trim(), SALT_ROUNDS);
      await User.create({
        username: doctorUsername,
        password: hashedPassword,
        role:     'doctor',
        doctorId: newDoctor._id,
      });
    }

    await addActivity({
      icon:        'fa-user-doctor',
      color:       '#6741d9',
      text:        `Dr. profile created: ${newDoctor.name}`,
      detail:      `${newDoctor.specialization} · ${newDoctor.department}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(newDoctor.toObject()), 'Doctor created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create doctor.', 500);
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const existing = await Doctor.findById(req.params.id).lean();
    if (!existing) return error(res, 'Doctor not found.', 404);

    const { name, specialization, email, phone, department, status, joinDate, patients } = req.body;

    const updated = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
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
      },
      { returnDocument: 'after' }
    ).lean();

    await addActivity({
      icon:        'fa-user-pen',
      color:       '#2C7BE5',
      text:        `${updated.name} profile updated`,
      detail:      `${updated.specialization} · status: ${updated.status}`,
      performedBy: req.user.username,
    });

    return success(res, toApi(updated), 'Doctor updated successfully');
  } catch (err) {
    return error(res, 'Failed to update doctor.', 500);
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const removed = await Doctor.findByIdAndDelete(req.params.id).lean();
    if (!removed) return error(res, 'Doctor not found.', 404);

    await User.deleteOne({ doctorId: removed._id });

    await addActivity({
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
