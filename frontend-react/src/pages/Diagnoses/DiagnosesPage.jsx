import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useCountUp } from '../../hooks/useCountUp';
import { fmtDate, fmtDateTime, matchSearch } from '../../utils/formatters';
import StatusBadge, { SeverityBadge } from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import AccessDenied from '../../components/common/AccessDenied';
import DiagnosisModal from './DiagnosisModal';

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

function RequestBadge({ dx }) {
  if (dx.diseaseRequestPending) {
    return <span className="status-badge badge-monitoring ms-1" title="Awaiting admin approval"><i className="fas fa-clock me-1" />Pending</span>;
  }
  if (dx.diseaseRequestStatus === 'approved') {
    return <span className="status-badge badge-active ms-1"><i className="fas fa-check-circle me-1" />Approved</span>;
  }
  if (dx.diseaseRequestStatus === 'rejected') {
    return <span className="status-badge badge-critical ms-1"><i className="fas fa-times-circle me-1" />Rejected</span>;
  }
  return null;
}

export default function DiagnosesPage() {
  const api           = useApi();
  const { can, role } = usePermissions();
  const { showToast } = useToast();

  const [diagnoses,    setDiagnoses]    = useState([]);
  const [patients,     setPatients]     = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [catalog,      setCatalog]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal,        setModal]        = useState({ open: false, mode: 'add', diagnosis: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const searchRef = useRef(search);
  searchRef.current = search;
  const catRef = useRef(catFilter);
  catRef.current = catFilter;

  const loadDiagnoses = useCallback(async (signal) => {
    const params = new URLSearchParams();
    if (searchRef.current)      params.set('search', searchRef.current);
    if (catRef.current !== 'all') params.set('category', catRef.current);
    const q = params.toString();
    const res = await api.get(`/diseases${q ? `?${q}` : ''}`, signal);
    if (!res) return;
    if (res.success) setDiagnoses(res.data);
    else showToast(res.message || 'Failed to load diagnoses', 'error');
  }, [api]);

  useEffect(() => {
    if (!can('diagnoses', 'view')) return;
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      loadDiagnoses(ctrl.signal),
      api.get('/patients', ctrl.signal).then(r => r?.success && setPatients(r.data)),
      api.get('/doctors',  ctrl.signal).then(r => r?.success && setDoctors(r.data)),
      api.get('/disease-catalog', ctrl.signal).then(r => r?.success && setCatalog(r.data)),
    ]).finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const debounceTimer = useRef(null);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const ctrl = new AbortController();
      loadDiagnoses(ctrl.signal);
    }, 300);
  };

  const handleCatFilter = (e) => {
    setCatFilter(e.target.value);
    const ctrl = new AbortController();
    loadDiagnoses(ctrl.signal);
  };

  const filtered = useMemo(() => diagnoses.filter(dx => {
    const matchSt = statusFilter === 'all' || dx.status === statusFilter;
    const matchQ  = matchSearch(dx, ['name', 'code', 'patient', 'doctor', 'category'], search);
    return matchSt && matchQ;
  }), [diagnoses, statusFilter, search]);

  const active   = useMemo(() => diagnoses.filter(d => d.status === 'active').length,   [diagnoses]);
  const resolved = useMemo(() => diagnoses.filter(d => d.status === 'resolved').length, [diagnoses]);
  const severe   = useMemo(() => diagnoses.filter(d => d.severity === 'severe').length, [diagnoses]);

  async function handleSave(payload, isNewDiseaseRequest, setSaving, setApiError) {
    const res = modal.mode === 'edit'
      ? await api.put(`/diseases/${modal.diagnosis.id}`, payload)
      : await api.post('/diseases', payload);

    setSaving(false);
    if (!res?.success) { setApiError(res?.message || 'Failed to save diagnosis.'); return; }

    setModal({ open: false, mode: 'add', diagnosis: null });
    const msg = modal.mode === 'edit' ? 'Diagnosis updated'
      : isNewDiseaseRequest ? 'Diagnosis added. Disease request sent to admin for approval.'
      : 'Diagnosis added successfully';
    showToast(msg);
    const ctrl = new AbortController();
    loadDiagnoses(ctrl.signal);
  }

  async function handleDelete() {
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    const res = await api.del(`/diseases/${id}`);
    if (res?.success) {
      showToast(`"${name}" removed`);
      setDiagnoses(prev => prev.filter(d => d.id !== id));
    } else {
      showToast(res?.message || 'Delete failed', 'error');
    }
  }

  if (!can('diagnoses', 'view')) {
    return <AccessDenied message="Receptionist role does not have access to diagnoses." />;
  }

  const canCreate = can('diagnoses', 'create');
  const canEdit   = can('diagnoses', 'edit');
  const canDelete = can('diagnoses', 'delete');

  return (
    <>
      <div className="row g-3 mb-24">
        <div className="col-sm-6 col-xl-3">
          <StatCard color="blue"   icon="fa-file-medical"     label="Total Diagnoses" value={diagnoses.length} />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard color="green"  icon="fa-circle-check"     label="Active"          value={active} />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard color="orange" icon="fa-check-double"     label="Resolved"        value={resolved} />
        </div>
        <div className="col-sm-6 col-xl-3">
          <StatCard color="red"    icon="fa-triangle-exclamation" label="Severe"       value={severe} />
        </div>
      </div>

      {role !== 'Admin' && role !== 'Doctor' && (
        <div className="alert-custom info mb-24">
          <i className="fas fa-info-circle" />
          Viewing as <strong>{role}</strong>. Some actions may be restricted.
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Diagnoses</h1>
          <p className="page-subtitle">Manage patient diagnoses and disease tracking</p>
        </div>
        {canCreate && (
          <button
            className="btn-primary-custom"
            onClick={() => setModal({ open: true, mode: 'add', diagnosis: null })}
          >
            <i className="fas fa-file-circle-plus" /> Add Diagnosis
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="table-controls">
            <div className="search-box">
              <i className="fas fa-search" />
              <input placeholder="Search diagnoses…" value={search} onChange={handleSearchChange} />
            </div>
            <select className="filter-select" value={catFilter} onChange={handleCatFilter}>
              <option value="all">All Categories</option>
              {['General Practice','Cardiology','Neurology','Dermatology','Orthopaedics','Diagnostic – Blood Test','Diagnostic – Imaging','Diagnostic – ECG','Emergency','Referral'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Diagnosis</th><th>Category</th><th>Patient</th>
                <th>Doctor</th><th>Date</th><th>Severity</th><th>Status</th>
                <th>Notes</th><th>Audit</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="11" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <i className="fas fa-spinner fa-spin me-2" />Loading…
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <EmptyState icon="fa-file-medical" message="No diagnoses found." colSpan={11} />
              )}
              {!loading && filtered.map(dx => {
                const notes    = dx.notes || '';
                const auditLine = dx.updatedBy
                  ? `Updated by ${dx.updatedBy} · ${fmtDateTime(dx.updatedAt)}`
                  : `Created by ${dx.createdBy || '—'} · ${fmtDateTime(dx.createdAt)}`;
                return (
                  <tr key={dx.id}>
                    <td><span className="td-id">#{dx.id.slice(0, 8)}</span></td>
                    <td>
                      <div className="cell-name">
                        {dx.name}<RequestBadge dx={dx} />
                      </div>
                      <div className="cell-meta">ICD: {dx.code || '—'}</div>
                    </td>
                    <td>{dx.category || '—'}</td>
                    <td><div className="cell-name">{dx.patient || '—'}</div></td>
                    <td>{dx.doctor || '—'}</td>
                    <td>{fmtDate(dx.date)}</td>
                    <td><SeverityBadge value={dx.severity} /></td>
                    <td><StatusBadge value={dx.status} /></td>
                    <td className="notes-cell" title={notes}>
                      {notes.slice(0, 50)}{notes.length > 50 ? '…' : ''}
                    </td>
                    <td>
                      <div className="cell-name" style={{ fontSize: '0.82rem' }}>{dx.updatedBy || dx.createdBy || '—'}</div>
                      <div className="cell-meta" style={{ fontSize: '0.75rem' }}>{auditLine}</div>
                    </td>
                    <td>
                      <div className="action-group">
                        {canEdit && (
                          <button
                            className="btn-action edit"
                            title="Edit"
                            onClick={() => setModal({ open: true, mode: 'edit', diagnosis: dx })}
                          >
                            <i className="fas fa-pen" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn-action delete"
                            title="Delete"
                            onClick={() => setDeleteTarget({ id: dx.id, name: dx.name })}
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
          <span>Showing {filtered.length} of {diagnoses.length} diagnoses</span>
        </div>
      </div>

      <DiagnosisModal
        show={modal.open}
        mode={modal.mode}
        diagnosis={modal.diagnosis}
        patients={patients}
        doctors={doctors}
        diseaseCatalog={catalog}
        onClose={() => setModal({ open: false, mode: 'add', diagnosis: null })}
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
