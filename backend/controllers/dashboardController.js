import db from '../db/db.js';

const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'An error occurred', statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

export const getStats = async (req, res) => {
  try {
    const { role, doctorId } = req.user;

    // Scope data to the requesting doctor, or expose all records for other roles
    const isDoctor = role === 'doctor' && doctorId;

    const allPatients  = db.patients        ?? [];
    const allDiseases  = db.diseases        ?? [];
    const allDoctors   = db.doctors         ?? [];
    const allRequests  = db.diseaseRequests ?? [];
    const allActivity  = db.activityLog     ?? [];

    const scopedPatients = isDoctor
      ? allPatients.filter(p => p.doctorId === doctorId)
      : allPatients;

    const scopedPatientIds = new Set(scopedPatients.map(p => p.id));

    const scopedDiseases = isDoctor
      ? allDiseases.filter(d => scopedPatientIds.has(d.patientId))
      : allDiseases;

    const scopedActivity = isDoctor
      ? allActivity.filter(a => a.performedBy === req.user.username)
      : allActivity;

    // Count patients by status using a single pass
    const patientsByStatus = scopedPatients.reduce((acc, p) => {
      if (p.status) acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});

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

      pendingDiseaseRequests: role === 'administrator'
        ? allRequests.filter(r => r.status === 'pending').length
        : 0,

      recentActivity: scopedActivity.slice(0, 10),
    };

    return success(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (err) {
    console.error('[dashboardController] getStats error:', err);
    return error(res, 'Failed to retrieve dashboard statistics.', 500);
  }
};
