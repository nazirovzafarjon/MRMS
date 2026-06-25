import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../utils/permissions';

const PAGE_TITLES = {
  '/':           'Dashboard Overview',
  '/doctors':    'Doctors Management',
  '/patients':   'Patients Management',
  '/diagnoses':  'Diagnoses',
  '/diseases':   'Disease Catalog',
  '/forbidden':  'Access Forbidden',
};

const ROLE_CONFIG = {
  [ROLES.ADMIN]:        { cls: 'role-admin',        icon: 'fa-shield-halved', label: 'Admin' },
  [ROLES.CLINICIAN]:    { cls: 'role-clinician',    icon: 'fa-stethoscope',   label: 'Clinician' },
  [ROLES.RECEPTIONIST]: { cls: 'role-receptionist', icon: 'fa-user-tie',      label: 'Receptionist' },
  [ROLES.DOCTOR]:       { cls: 'role-doctor',       icon: 'fa-user-doctor',   label: 'Doctor' },
};

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const topbarRef = useRef(null);

  const role = user?.role || ROLES.ADMIN;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG[ROLES.ADMIN];

  const title = (() => {
    if (location.pathname.startsWith('/patients/')) return 'Patient Profile';
    return PAGE_TITLES[location.pathname] || 'MRMS';
  })();

  // Scroll shadow — replaces the legacy window scroll listener in ui.js
  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const handler = () => {
      el.style.boxShadow = window.scrollY > 8 ? '0 1px 8px rgba(0,0,0,0.06)' : 'none';
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header id="topbar" ref={topbarRef}>
      <button className="topbar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <i className="fas fa-bars" />
      </button>

      <span className="topbar-title">{title}</span>

      <div className="topbar-right">
        <div className="topbar-divider" />

        <div className={`role-badge ${config.cls}`}>
          <i className={`fas ${config.icon}`} />
          {config.label}
        </div>

        <button className="topbar-icon-btn" title="Notifications">
          <i className="fas fa-bell" />
          <span className="notif-dot" />
        </button>

        <button className="btn-logout" onClick={logout}>
          <i className="fas fa-right-from-bracket" />
          <span className="d-none d-sm-inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
