import express from 'express';
import cors    from 'cors';
import jwt     from 'jsonwebtoken';

import authRoutes           from './routes/authRoutes.js';
import doctorRoutes         from './routes/doctorRoutes.js';
import patientRoutes        from './routes/patientRoutes.js';
import diseaseRoutes        from './routes/diseaseRoutes.js';
import diseaseCatalogRoutes from './routes/diseaseCatalogRoutes.js';
import diseaseRequestRoutes from './routes/diseaseRequestRoutes.js';
import dashboardRoutes      from './routes/dashboardRoutes.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5500',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Protect every /api route — the only public endpoint is POST /api/auth/login
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/auth/login') return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
  }

  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
});

app.use('/api/auth',             authRoutes);
app.use('/api/doctors',          doctorRoutes);
app.use('/api/patients',         patientRoutes);
app.use('/api/diseases',         diseaseRoutes);
app.use('/api/disease-catalog',  diseaseCatalogRoutes);
app.use('/api/disease-requests', diseaseRequestRoutes);
app.use('/api/dashboard',        dashboardRoutes);

app.use((req, res) => {
  res.status(404).json(
    { success: false,
      message: `Route ${req.method} ${req.path} not found.` }
  );
});

export default app;
