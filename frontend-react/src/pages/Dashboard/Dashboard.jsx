import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ROLES } from '../../utils/permissions';
import StatCard from './StatCard';
import RecentActivity from './RecentActivity';
import PatientStatusPanel from './PatientStatusPanel';

const QUICK_LINKS = {
  [ROLES.ADMIN]: [
    { to: '/doctors',   color: 'blue',   icon: 'fa-user-doctor',      title: 'Manage Doctors',   sub: 'Add, Edit, Delete →' },
    { to: '/patients',  color: 'green',  icon: 'fa-user-plus',        title: 'Manage Patients',  sub: 'Add, Edit, Delete →' },
    { to: '/diagnoses', color: 'orange', icon: 'fa-file-circle-plus', title: 'Manage Diagnoses', sub: 'Add, Edit, Delete →' },
  ],
  [ROLES.CLINICIAN]: [
    { to: '/patients',  color: 'green',  icon: 'fa-hospital-user', title: 'Patient Records', sub: 'View & Edit →' },
    { to: '/diagnoses', color: 'orange', icon: 'fa-file-medical',  title: 'Diagnoses',       sub: 'View & Edit →' },
  ],
  [ROLES.RECEPTIONIST]: [
    { to: '/doctors',  color: 'blue',  icon: 'fa-user-doctor', title: 'Doctor Schedules', sub: 'View →' },
    { to: '/patients', color: 'green', icon: 'fa-user-plus',   title: 'Register Patient', sub: 'Create new →' },
  ],
  [ROLES.DOCTOR]: [
    { to: '/patients',  color: 'green',  icon: 'fa-hospital-user', title: 'My Patients', sub: 'View & Edit →' },
    { to: '/diagnoses', color: 'orange', icon: 'fa-file-medical',  title: 'Diagnoses',   sub: 'View & Edit →' },
  ],
};

export default function Dashboard() {
  const api           = useApi();
  const { user }      = useAuth();
  const { role }      = usePermissions();
  const { showToast } = useToast();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();

    async function load() {
      setLoading(true);
      const res = await api.get('/dashboard/stats', ctrl.signal);
      if (!res) return;
      if (!res.success) {
        showToast('Failed to load dashboard data', 'error');
        setLoading(false);
        return;
      }
      setStats(res.data);
      setLoading(false);
    }

    load();
    return () => ctrl.abort();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const isAdmin        = role === ROLES.ADMIN;
  const isClinician    = role === ROLES.CLINICIAN;
  const isReceptionist = role === ROLES.RECEPTIONIST;
  const quickLinks     = QUICK_LINKS[role] || QUICK_LINKS[ROLES.DOCTOR];
  const colSize        = Math.floor(12 / quickLinks.length);

  return (
    <>
      {/* Welcome bar */}
      <div className="welcome-bar mb-24">
        <h4>{greeting}, {user?.username ?? 'User'} 👋</h4>
        <p>Here&apos;s what&apos;s happening at CareTrack Clinic today — {today}</p>
      </div>

      {/* Stat cards — Admin sees all four */}
      {isAdmin && (
        <div className="row g-3 mb-24">
          <div className="col-sm-6 col-xl-3">
            <StatCard color="blue"   icon="fa-user-doctor"          label="Total Doctors"     value={loading ? undefined : stats?.totalDoctors} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard color="green"  icon="fa-hospital-user"        label="Total Patients"    value={loading ? undefined : stats?.totalPatients} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard color="orange" icon="fa-file-medical"         label="Total Diagnoses"   value={loading ? undefined : stats?.totalDiseases} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard color="red"    icon="fa-triangle-exclamation" label="Critical Patients" value={loading ? undefined : stats?.criticalPatients} />
          </div>
        </div>
      )}

      {/* Clinician: patient + diagnosis focus */}
      {isClinician && (
        <div className="row g-3 mb-24">
          <div className="col-sm-6 col-xl-3">
            <StatCard color="green"  icon="fa-hospital-user"        label="Total Patients"   value={loading ? undefined : stats?.totalPatients} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard color="red"    icon="fa-triangle-exclamation" label="Critical"         value={loading ? undefined : stats?.criticalPatients} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard color="orange" icon="fa-file-medical"         label="Diagnoses"        value={loading ? undefined : stats?.totalDiseases} />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard color="blue"   icon="fa-circle-check"         label="Active Diagnoses" value={loading ? undefined : stats?.activeDiseases} />
          </div>
        </div>
      )}

      {/* Receptionist: overview only */}
      {isReceptionist && (
        <div className="row g-3 mb-24">
          <div className="col-sm-6">
            <StatCard color="blue"  icon="fa-user-doctor"   label="Total Doctors"  value={loading ? undefined : stats?.totalDoctors} />
          </div>
          <div className="col-sm-6">
            <StatCard color="green" icon="fa-hospital-user" label="Total Patients" value={loading ? undefined : stats?.totalPatients} />
          </div>
        </div>
      )}

      {/* Middle row — activity + status panel for Admin and Clinician */}
      {(isAdmin || isClinician) && (
        <div className="row g-3 mb-24">
          <div className="col-lg-6">
            <RecentActivity activity={stats?.recentActivity} loading={loading} />
          </div>
          <div className="col-lg-6">
            <PatientStatusPanel stats={stats} loading={loading} />
          </div>
        </div>
      )}

      {/* Receptionist: activity feed only */}
      {isReceptionist && (
        <div className="row g-3 mb-24">
          <div className="col-12">
            <RecentActivity activity={stats?.recentActivity} loading={loading} />
          </div>
        </div>
      )}

      {/* Quick Access */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">
                <i className="fas fa-bolt me-2 text-primary-custom" />Quick Access
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {quickLinks.map(item => (
                  <div className={`col-sm-${colSize}`} key={item.to + item.title}>
                    <Link to={item.to} style={{ textDecoration: 'none' }}>
                      <div className={`stat-card ${item.color}`} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon"><i className={`fas ${item.icon}`} /></div>
                        <div className="stat-info">
                          <div className="stat-label">Go to</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, margin: '2px 0' }}>{item.title}</div>
                          <div className="stat-trend">{item.sub}</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
