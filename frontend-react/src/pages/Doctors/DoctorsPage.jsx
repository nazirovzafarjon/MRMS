import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useCountUp } from '../../hooks/useCountUp';
import { matchSearch } from '../../utils/formatters';
import Avatar from '../../components/common/Avatar';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import DoctorModal from './DoctorModal';

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

export default function DoctorsPage() {
  const api           = useApi();
  const { can, role } = usePermissions();
  const { showToast } = useToast();

  const [doctors,      setDoctors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal,        setModal]        = useState({ open: false, mode: 'add', doctor: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const searchRef = useRef(search);
  searchRef.current = search;

  const loadDoctors = useCallback(async (signal) => {
    const param = searchRef.current ? `?search=${encodeURIComponent(searchRef.current)}` : '';
    const res = await api.get(`/doctors${param}`, signal);
    if (!res) return;
    if (res.success) setDoctors(res.data);
    else showToast(res.message || 'Failed to load doctors', 'error');
  }, [api]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    loadDoctors(ctrl.signal).finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const debounceTimer = useRef(null);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const ctrl = new AbortController();
      loadDoctors(ctrl.signal);
    }, 300);
  };

  const filtered = useMemo(() => doctors.filter(d => {
    const matchSt = statusFilter === 'all' || d.status === statusFilter;
    const matchQ  = matchSearch(d, ['name', 'specialization', 'email', 'department'], search);
    return matchSt && matchQ;
  }), [doctors, statusFilter, search]);

  const totalPatients = useMemo(() => doctors.reduce((s, d) => s + (d.patients || 0), 0), [doctors]);
  const active        = useMemo(() => doctors.filter(d => d.status === 'active').length, [doctors]);

  async function handleSave(form, setSaving, setApiError) {
    const payload = {
      name:           form.name,
      specialization: form.specialization,
      email:          form.email,
      phone:          form.phone          || null,
      department:     form.department,
      status:         form.status         || 'active',
      joinDate:       form.joinDate       || null,
      patients:       parseInt(form.patients) || 0,
    };
    if (!modal.doctor && form.username.trim()) {
      payload.username = form.username.trim();
      payload.password = form.password.trim();
    }

    const res = modal.mode === 'edit'
      ? await api.put(`/doctors/${modal.doctor.id}`, payload)
      : await api.post('/doctors', payload);

    setSaving(false);
    if (!res?.success) { setApiError(res?.message || 'Failed to save doctor.'); return; }

    setModal({ open: false, mode: 'add', doctor: null });
    showToast(modal.mode === 'edit' ? 'Doctor updated successfully' : 'Doctor added successfully');
    const ctrl = new AbortController();
    loadDoctors(ctrl.signal);
  }

  async function handleDelete() {
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    const res = await api.del(`/doctors/${id}`);
    if (res?.success) {
      showToast(`${name} removed`);
      setDoctors(prev => prev.filter(d => d.id !== id));
    } else {
      showToast(res?.message || 'Delete failed', 'error');
    }
  }

  const canCreate = can('doctors', 'create');
  const canEdit   = can('doctors', 'edit');
  const canDelete = can('doctors', 'delete');

  return (
    <>
      <div className="row g-3 mb-24">
        <div className="col-sm-6 col-xl-4">
          <StatCard color="blue"   icon="fa-user-doctor" label="Total Doctors"  value={doctors.length} />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatCard color="green"  icon="fa-circle-check" label="Active Doctors" value={active} />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatCard color="orange" icon="fa-hospital-user" label="Total Patients" value={totalPatients} />
        </div>
      </div>

      {role !== 'Admin' && (
        <div className="alert-custom info mb-24">
          <i className="fas fa-info-circle" />
          You are viewing as <strong>{role}</strong>. Some actions may be restricted.
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Doctors</h1>
          <p className="page-subtitle">Manage medical staff, specializations, and patient assignments</p>
        </div>
        {canCreate && (
          <button
            className="btn-primary-custom"
            onClick={() => setModal({ open: true, mode: 'add', doctor: null })}
          >
            <i className="fas fa-user-plus" /> Add Doctor
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search" />
              <input placeholder="Search doctors…" value={search} onChange={handleSearchChange} />
            </div>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Doctor</th><th>Specialization</th><th>Department</th>
                <th>Phone</th><th>Patients</th><th>Status</th><th>Login</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <i className="fas fa-spinner fa-spin me-2" />Loading…
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <EmptyState icon="fa-user-doctor" message="No doctors found." colSpan={9} />
              )}
              {!loading && filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="td-id">#{d.id.slice(0, 8)}</span></td>
                  <td>
                    <div className="avatar-cell">
                      <Avatar name={d.name} />
                      <div>
                        <div className="cell-name">{d.name}</div>
                        <div className="cell-meta">{d.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{d.specialization}</td>
                  <td>{d.department}</td>
                  <td>{d.phone || '—'}</td>
                  <td><span className="fw-600">{d.patients ?? 0}</span></td>
                  <td><StatusBadge value={d.status} /></td>
                  <td>
                    {d.username
                      ? <span className="status-badge badge-stable" title={`Login: ${d.username}`}><i className="fas fa-key me-1" />Has Login</span>
                      : <span className="status-badge badge-inactive">No Login</span>
                    }
                  </td>
                  <td>
                    <div className="action-group">
                      {canEdit && (
                        <button
                          className="btn-action edit"
                          title="Edit"
                          onClick={() => setModal({ open: true, mode: 'edit', doctor: d })}
                        >
                          <i className="fas fa-pen" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn-action delete"
                          title="Delete"
                          onClick={() => setDeleteTarget({ id: d.id, name: d.name })}
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-row">
          <span>Showing {filtered.length} of {doctors.length} doctors</span>
        </div>
      </div>

      <DoctorModal
        show={modal.open}
        mode={modal.mode}
        doctor={modal.doctor}
        onClose={() => setModal({ open: false, mode: 'add', doctor: null })}
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
