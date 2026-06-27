import Doctor         from '../models/Doctor.js';
import Patient         from '../models/Patient.js';
import Disease          from '../models/Disease.js';
import DiseaseRequest   from '../models/DiseaseRequest.js';
import ActivityLog      from '../models/ActivityLog.js';
import { toApiList }    from '../utils/serialize.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

export const getStats = async (req, res) => {
  try {
    const { role, doctorId } = req.user;

    // Scope data to the requesting doctor, or expose all records for other roles
    const isDoctor = role === 'doctor' && doctorId;

    const patientFilter = isDoctor ? { doctorId } : {};

    const [allDoctors, scopedPatients] = await Promise.all([
      Doctor.find().lean(),
      Patient.find(patientFilter).lean(),
    ]);

    const scopedPatientIds = new Set(scopedPatients.map(p => p._id));

    const diseaseFilter = isDoctor
      ? { patientId: { $in: [...scopedPatientIds] } }
      : {};

    const scopedDiseases = await Disease.find(diseaseFilter).lean();

    const activityFilter = isDoctor ? { performedBy: req.user.username } : {};
    const recentActivity = await ActivityLog.find(activityFilter)
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Count patients by status using a single pass
    const patientsByStatus = scopedPatients.reduce((acc, p) => {
      if (p.status) acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});

    const pendingDiseaseRequests = role === 'administrator'
      ? await DiseaseRequest.countDocuments({ status: 'pending' })
      : 0;

    const stats = {
      totalDoctors:     allDoctors.length,
      activeDoctors:    allDoctors.filter(d => d.status === 'active').length,

      totalPatients:    scopedPatients.length,
      criticalPatients: patientsByStatus.critical  ?? 0,
      patientsByStatus,

      totalDiseases:    scopedDiseases.length,
      activeDiseases:   scopedDiseases.filter(d => d.status === 'active').length,
      resolvedDiseases: scopedDiseases.filter(d => d.status === 'resolved').length,
      severeDiseases:   scopedDiseases.filter(d => d.severity === 'severe').length,

      pendingDiseaseRequests,

      recentActivity: toApiList(recentActivity),
    };

    return success(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (err) {
    console.error('[dashboardController] getStats error:', err);
    return error(res, 'Failed to retrieve dashboard statistics.', 500);
  }
};
