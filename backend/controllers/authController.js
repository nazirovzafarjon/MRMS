import { randomUUID as uuidv4 } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import db     from '../db/db.js';

const TOKEN_EXPIRY = '8h';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

const addActivity = ({ icon, color, text, detail, performedBy = 'system' }) => {
  db.activityLog.unshift({ id: uuidv4(), icon, color, text, detail, performedBy, timestamp: new Date().toISOString() });
  if (db.activityLog.length > 100) db.activityLog.length = 100;
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      return error(res, 'Username and password are required.', 400);
    }

    const user = db.users.find(u => u.username === username.trim());
    if (!user) {
      return error(res, 'Invalid username or password.', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return error(res, 'Invalid username or password.', 401);
    }

    const tokenPayload = {
      id:       user.id,
      username: user.username,
      role:     user.role,
      doctorId: user.doctorId || null,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    addActivity({
      icon:        'fa-right-to-bracket',
      color:       '#2C7BE5',
      text:        `${user.username} logged in`,
      detail:      `Role: ${user.role}`,
      performedBy: user.username,
    });

    return success(res, { token, role: user.role, username: user.username, doctorId: user.doctorId || null }, 'Login successful');
  } catch (err) {
    return error(res, 'Login failed. Please try again later.', 500);
  }
};

export const logout = async (req, res) => {
  return success(res, null, 'Logged out successfully. Please delete your token on the client.');
};
