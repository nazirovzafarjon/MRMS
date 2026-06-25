import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useCountUp } from '../../hooks/useCountUp';
import { fmtDate, fmtDateTime, getInitials, avatarColor, matchSearch } from '../../utils/formatters';
import Avatar from '../../components/common/Avatar';
import StatusBadge, { ConditionBadge } from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import PatientModal from './PatientModal';

function StatCard({ color, icon, label, value }) {
  const animated = useCountUp(value ?? 0);
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon"><i className={`fas ${icon}`} /></div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value === undefined ? '—' : animated}</div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const api           = useApi();
  const { can, role } = usePermissions();
  const { showToast } = useToast();

  const [patients,      setPatients]      = useState([]);
  const [doctors,       setDoctors]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [genderFilter,  setGenderFilter]  = useState('all');
  const [modal,         setModal]         = useState({ open: false, mode: 'add', patient: null });
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  const searchRef = useRef(search);
  searchRef.current = search;

  const loadPatients = useCallback(async (signal) => {
    const searchParam = searchRef.current ? `?search=${encodeURIComponent(searchRef.current)}` : '';
    const res = await api.get(`/patients${searchParam}`, signal);
    if (!res) return;
    if (res.success) setPatients(res.data);
    else showToast(res.message || 'Failed to load patients', 'error');
  }, [api]);

  const loadDoctors = useCallback(async (signal) => {
    const res = await api.get('/doctors', signal);
    if (res?.success) setDoctors(res.data);
  }, [api]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      loadPatients(ctrl.signal),
      loadDoctors(ctrl.signal),
    ]).finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search fetch
  const debounceTimer = useRef(null);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const ctrl = new AbortController();
      loadPatients(ctrl.signal);
    }, 300);
  };

  const filtered = useMemo(() => patients.filter(p => {
    const matchSt = statusFilter === 'all' || p.condition === statusFilter;
    const matchGn = genderFilter === 'all' || (p.gender || '').toLowerCase() === genderFilter;
    const matchQ  = matchSearch(p, ['name', 'email', 'condition', 'assignedDoctor'], search);
    return matchSt && matchGn && matchQ;
  }), [patients, statusFilter, genderFilter, search]);

  // Stats
  const total      = patients.length;
  const critical   = useMemo(() => patients.filter(p => p.status === 'critical').length,   [patients]);
  const recovered  = useMemo(() => patients.filter(p => p.status === 'recovered').length,  [patients]);
  const monitoring = useMemo(() => patients.filter(p => p.status === 'monitoring').length, [patients]);

  async function handleSave(form, setSaving, setApiError) {
    const payload = {
      name:      form.name,
      dob:       form.dob       || null,
      gender:    form.gender,
      blood:     form.blood     || null,
      email:     form.email     || null,
      phone:     form.phone     || null,
      address:   form.address   || null,
      condition: form.condition || null,
      doctorId:  form.doctorId  || null,
      status:    form.status    || null,
      admitDate: form.admitDate || null,
    };

    const res = modal.mode === 'edit'
      ? await api.put(`/patients/${modal.patient.id}`, payload)
      : await api.post('/patients', payload);

    setSaving(false);
    if (!res?.success) { setApiError(res?.message || 'Failed to save patient.'); return; }

    setModal({ open: false, mode: 'add', patient: null });
    showToast(modal.mode === 'edit' ? 'Patient record updated' : 'Patient registered successfully');
    const ctrl = new AbortController();
    loadPatients(ctrl.signal);
  }

  async function handleDelete() {
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    const res = await api.del(`/patients/${id}`);
    if (res?.success) {
      showToast(`${name}'s record deleted`);
      setPatients(prev => prev.filter(p => p.id !== id));
    } else {
      showToast(res?.message || 'Delete failed', 'error');
    }
  }

  const canCreate = can('patients', 'create');
  const canEdit   = can('patients', 'edit');
  const canDelete = can('patients', 'delete');

  return (
    <>
      {/* Stats */}
      <div className="row g-3 mb-24">
        <div className="col-sm-6 col-xl-3">
          <StatCard color="blue"   icon="fa-hospital-user"       label="Total Patients"   value={total} />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard color="red"    icon="fa-triangle-exclamation" label="Critical"         value={critical} />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard color="green"  icon="fa-circle-check"         label="Recovered"        value={recovered} />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard color="orange" icon="fa-eye"                  label="Under Monitoring" value={monitoring} />
        </div>
      </div>

      {/* Role notice */}
      {role !== 'Admin' && (
        <div className="alert-custom info mb-24">
          <i className="fas fa-info-circle" />
          Viewing as <strong>{role}</strong>. Some actions may be restricted.
        </div>
      )}

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Track patient records, status, and medical assignments</p>
        </div>
        {canCreate && (
          <button
            className="btn-primary-custom"
            onClick={() => setModal({ open: true, mode: 'add', patient: null })}
          >
            <i className="fas fa-user-plus" /> Add Patient
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="card">
        <div className="card-header">
          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search" />
              <input
                type="text"
                placeholder="Search patients…"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Conditions</option>
              <option value="Under Monitoring">Under Monitoring</option>
              <option value="Critical">Critical</option>
              <option value="Recovered">Recovered</option>
            </select>
            <select className="filter-select" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Patient</th><th>Condition</th><th>Doctor</th>
                <th>Phone</th><th>Admitted</th><th>Status</th><th>Audit</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <i className="fas fa-spinner fa-spin me-2" />Loading…
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <EmptyState icon="fa-users" message="No patients found." colSpan={9} />
              )}
              {!loading && filtered.map(p => {
                const birthYear = p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : '—';
                const auditLine = p.updatedBy
                  ? `Updated by ${p.updatedBy} · ${fmtDateTime(p.updatedAt)}`
                  : `Added by ${p.createdBy || '—'} · ${fmtDateTime(p.createdAt)}`;
                return (
                  <tr key={p.id} data-id={p.id}>
                    <td><span className="td-id" title={p.id}>#{p.id.slice(0, 8)}</span></td>
                    <td>
                      <div className="avatar-cell">
                        <Avatar name={p.name} />
                        <div>
                          <div className="cell-name">
                            <Link to={`/patients/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {p.name}
                            </Link>
                          </div>
                          <div className="cell-meta">
                            {p.gender}, {birthYear} yrs · <span className="fw-600">{p.blood || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><ConditionBadge value={p.condition} /></td>
                    <td>{p.assignedDoctor || '—'}</td>
                    <td>{p.phone || '—'}</td>
                    <td>{fmtDate(p.admitDate)}</td>
                    <td><StatusBadge value={p.status} /></td>
                    <td>
                      <div className="cell-name" style={{ fontSize: '0.82rem' }}>{p.createdBy || '—'}</div>
                      <div className="cell-meta" style={{ fontSize: '0.75rem' }}>{auditLine}</div>
                    </td>
                    <td>
                      <div className="action-group">
                        <Link to={`/patients/${p.id}`}>
                          <button className="btn-action view" title="View Profile">
                            <i className="fas fa-eye" />
                          </button>
                        </Link>
                        {canEdit && (
                          <button
                            className="btn-action edit"
                            title="Edit"
                            onClick={() => setModal({ open: true, mode: 'edit', patient: p })}
                          >
                            <i className="fas fa-pen" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn-action delete"
                            title="Delete"
                            onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="permission-notice"><i className="fas fa-eye" /> View only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination-row">
          <span>Showing {filtered.length} of {patients.length} patients</span>
        </div>
      </div>

      {/* Modals */}
      <PatientModal
        show={modal.open}
        mode={modal.mode}
        patient={modal.patient}
        doctors={doctors}
        onClose={() => setModal({ open: false, mode: 'add', patient: null })}
        onSave={handleSave}
      />
      <ConfirmDeleteModal
        show={!!deleteTarget}
        name={deleteTarget?.name}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
