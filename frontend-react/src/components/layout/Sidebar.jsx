import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/formatters';
import { ROLES } from '../../utils/permissions';

const NAV_ITEMS = [
  { to: '/',          icon: 'fa-gauge-high',    label: 'Dashboard', end: true },
  { to: '/doctors',   icon: 'fa-user-doctor',   label: 'Doctors' },
  { to: '/patients',  icon: 'fa-hospital-user', label: 'Patients' },
  { to: '/diagnoses', icon: 'fa-file-medical',  label: 'Diagnoses', roles: [ROLES.ADMIN] },
  { to: '/diseases',  icon: 'fa-virus',         label: 'Disease Catalog', roles: [ROLES.ADMIN] },
];

const ROLE_BADGE = {
  [ROLES.ADMIN]:        { cls: 'role-admin',        icon: 'fa-shield-halved' },
  [ROLES.CLINICIAN]:    { cls: 'role-clinician',    icon: 'fa-stethoscope' },
  [ROLES.RECEPTIONIST]: { cls: 'role-receptionist', icon: 'fa-user-tie' },
  [ROLES.DOCTOR]:       { cls: 'role-doctor',       icon: 'fa-user-doctor' },
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const role = user?.role || ROLES.ADMIN;
  const badge = ROLE_BADGE[role] || ROLE_BADGE[ROLES.ADMIN];

  return (
    <aside id="sidebar" className={open ? 'open' : ''}>
      <div className="sidebar-brand">
        <div className="brand-icon"><i className="fas fa-heart-pulse" /></div>
        <div className="brand-text">
          <span className="brand-name">CareTrack</span>
          <span className="brand-sub">MRMS Platform</span>
        </div>
      </div>

      <span className="sidebar-section-label">Main Menu</span>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          if (item.roles && !item.roles.includes(role)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <i className={`fas ${item.icon}`} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">{getInitials(user?.username)}</div>
        <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{user?.username || 'User'}</div>
          <span className={`role-badge ${badge.cls}`} style={{ fontSize: '0.6rem', padding: '2px 8px', marginTop: 3 }}>
            <i className={`fas ${badge.icon}`} />
            {role}
          </span>
        </div>
        <button
          className="btn-logout"
          style={{ padding: '6px 10px', flexShrink: 0 }}
          onClick={logout}
          title="Sign out"
        >
          <i className="fas fa-right-from-bracket" />
        </button>
      </div>
    </aside>
  );
}
