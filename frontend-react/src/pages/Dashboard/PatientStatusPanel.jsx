const STATUS_ROWS = [
  { label: 'Stable',     key: 'stable',     color: 'var(--primary)' },
  { label: 'Monitoring', key: 'monitoring',  color: '#F6C343' },
  { label: 'Critical',   key: 'critical',    color: 'var(--danger)' },
  { label: 'Recovered',  key: 'recovered',   color: 'var(--success)' },
];

export default function PatientStatusPanel({ stats, loading }) {
  if (loading) {
    return (
      <div className="card h-100">
        <div className="card-header">
          <h6 className="card-title"><i className="fas fa-chart-pie me-2 text-primary-custom" />Patient Status</h6>
        </div>
        <div className="card-body">
          <p className="text-muted-custom" style={{ fontSize: '0.85rem' }}>Loading…</p>
        </div>
      </div>
    );
  }

  const byStatus      = stats?.patientsByStatus ?? {};
  const totalPatients = Math.max(stats?.totalPatients || 0, 1);
  const totalDoctors  = Math.max(stats?.totalDoctors  || 0, 1);
  const totalDiseases = Math.max(stats?.totalDiseases || 0, 1);

  const activeDoctorsPct = Math.round(((stats?.activeDoctors    ?? 0) / totalDoctors)  * 100);
  const activeDiagPct    = Math.round(((stats?.activeDiseases   ?? 0) / totalDiseases) * 100);
  const resolvedPct      = Math.round(((stats?.resolvedDiseases ?? 0) / totalDiseases) * 100);

  return (
    <div className="card h-100">
      <div className="card-header">
        <h6 className="card-title"><i className="fas fa-chart-pie me-2 text-primary-custom" />Patient Status</h6>
      </div>
      <div className="card-body">
        {STATUS_ROWS.map(({ label, key, color }) => {
          const count = byStatus[key] ?? 0;
          const pct   = Math.round((count / totalPatients) * 100);
          return (
            <div className="mb-3" key={key}>
              <div className="d-flex justify-content-between mb-1">
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {count === 1 ? '1 patient' : `${count} patients`}
                </span>
              </div>
              <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}

        <hr />
        <div className="row text-center">
          <div className="col-4">
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{activeDoctorsPct}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active Doctors</div>
          </div>
          <div className="col-4">
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{activeDiagPct}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active Diagnoses</div>
          </div>
          <div className="col-4">
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)' }}>{resolvedPct}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Resolved Cases</div>
          </div>
        </div>
      </div>
    </div>
  );
}
