import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { useCountUp } from '../../hooks/useCountUp';
import { fmtDate, fmtDateTime, matchSearch } from '../../utils/formatters';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import DiseaseModal from './DiseaseModal';
import ApproveModal from './ApproveModal';
import RejectModal from './RejectModal';

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

export default function DiseasesPage() {
  const api           = useApi();
  const { can }       = usePermissions();
  const { showToast } = useToast();

  const [diseases,     setDiseases]     = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('catalog');
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [modal,        setModal]        = useState({ open: false, mode: 'add', disease: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [approveReq,   setApproveReq]   = useState(null);
  const [rejectReq,    setRejectReq]    = useState(null);

  const searchRef = useRef(search);
  searchRef.current = search;
  const catRef = useRef(catFilter);
  catRef.current = catFilter;

  const loadDiseases = useCallback(async (signal) => {
    const params = new URLSearchParams();
    if (searchRef.current)        params.set('search',   searchRef.current);
    if (catRef.current !== 'all') params.set('category', catRef.current);
    const q = params.toString();
    const res = await api.get(`/disease-catalog${q ? `?${q}` : ''}`, signal);
    if (!res) return;
    if (res.success) setDiseases(res.data);
    else showToast(res.message || 'Failed to load disease catalog', 'error');
  }, [api]);

  const loadRequests = useCallback(async (signal) => {
    const res = await api.get('/disease-requests', signal);
    if (res?.success) setRequests(res.data);
  }, [api]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      loadDiseases(ctrl.signal),
      loadRequests(ctrl.signal),
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
      loadDiseases(ctrl.signal);
    }, 300);
  };

  const handleCatFilter = (e) => {
    setCatFilter(e.target.value);
    const ctrl = new AbortController();
    loadDiseases(ctrl.signal);
  };

  const pendingCount = useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);

  async function handleSaveDisease(form, setSaving, setApiError) {
    const payload = {
      name:        form.name,
      icdCode:     form.icdCode     || null,
      category:    form.category    || null,
      description: form.description || null,
    };
    const res = modal.mode === 'edit'
      ? await api.put(`/disease-catalog/${modal.disease.id}`, payload)
      : await api.post('/disease-catalog', payload);

    setSaving(false);
    if (!res?.success) { setApiError(res?.message || 'Failed to save.'); return; }

    setModal({ open: false, mode: 'add', disease: null });
    showToast(modal.mode === 'edit' ? 'Disease updated' : 'Disease added to catalog');
    const ctrl = new AbortController();
    loadDiseases(ctrl.signal);
  }

  async function handleDelete() {
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    const res = await api.del(`/disease-catalog/${id}`);
    if (res?.success) {
      showToast(`"${name}" removed from catalog`);
      setDiseases(prev => prev.filter(d => d.id !== id));
    } else {
      showToast(res?.message || 'Delete failed', 'error');
    }
  }

  async function handleApprove(id, payload, setSaving) {
    const res = await api.put(`/disease-requests/${id}/approve`, payload);
    setSaving(false);
    if (!res?.success) { showToast(res?.message || 'Failed to approve.', 'error'); return; }
    setApproveReq(null);
    showToast('Disease request approved and added to catalog');
    const ctrl = new AbortController();
    await Promise.all([loadDiseases(ctrl.signal), loadRequests(ctrl.signal)]);
  }

  async function handleReject(id, adminResponse, setSaving) {
    const res = await api.put(`/disease-requests/${id}/reject`, { adminResponse });
    setSaving(false);
    if (!res?.success) { showToast(res?.message || 'Failed to reject.', 'error'); return; }
    setRejectReq(null);
    showToast('Disease request rejected', 'info');
    const ctrl = new AbortController();
    loadRequests(ctrl.signal);
  }

  const canCreate = can('diseases', 'create');
  const canEdit   = can('diseases', 'edit');
  const canDelete = can('diseases', 'delete');

  return (
    <>
      <div className="row g-3 mb-24">
        <div className="col-sm-6">
          <StatCard color="blue"   icon="fa-virus"  label="Total Diseases"    value={diseases.length} />
        </div>
        <div className="col-sm-6">
          <StatCard color="orange" icon="fa-clock"  label="Pending Requests"  value={pendingCount} />
        </div>
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Disease Catalog</h1>
          <p className="page-subtitle">Manage the ICD disease catalog and review disease addition requests</p>
        </div>
        {canCreate && activeTab === 'catalog' && (
          <button
            className="btn-primary-custom"
            onClick={() => setModal({ open: true, mode: 'add', disease: null })}
          >
            <i className="fas fa-plus" /> Add Disease
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn${activeTab === 'catalog' ? ' active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <i className="fas fa-book-medical me-2" />Catalog
        </button>
        <button
          className={`tab-btn${activeTab === 'requests' ? ' active' : ''}`}
          onClick={() => { setActiveTab('requests'); loadRequests(); }}
        >
          <i className="fas fa-inbox me-2" />Requests
          {pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}
        </button>
      </div>

      {/* Catalog panel */}
      {activeTab === 'catalog' && (
        <div className="card" id="catalog-panel">
          <div className="card-header">
            <div className="table-controls">
              <div className="search-box">
                <i className="fas fa-search" />
                <input placeholder="Search diseases…" value={search} onChange={handleSearchChange} />
              </div>
              <select className="filter-select" value={catFilter} onChange={handleCatFilter}>
                <option value="all">All Categories</option>
                {['General Practice','Cardiology','Neurology','Dermatology','Orthopaedics','Diagnostic – Blood Test','Diagnostic – Imaging','Diagnostic – ECG','Emergency','Referral'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>ICD Code</th><th>Category</th>
                  <th>Description</th><th>Audit</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <i className="fas fa-spinner fa-spin me-2" />Loading…
                  </td></tr>
                )}
                {!loading && diseases.length === 0 && (
                  <EmptyState icon="fa-virus-slash" message="No diseases found in catalog." colSpan={7} />
                )}
                {!loading && diseases.map(d => {
                  const auditLine = d.updatedBy
                    ? `Updated by ${d.updatedBy} · ${fmtDateTime(d.updatedAt)}`
                    : `Added by ${d.createdBy || '—'} · ${fmtDateTime(d.createdAt)}`;
                  return (
                    <tr key={d.id}>
                      <td><span className="td-id">#{d.id.slice(0, 8)}</span></td>
                      <td><div className="cell-name">{d.name}</div></td>
                      <td><span className="td-id">{d.icdCode || '—'}</span></td>
                      <td>{d.category || '—'}</td>
                      <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: '0.8rem' }} title={d.description}>
                        {d.description || '—'}
                      </td>
                      <td>
                        <div className="cell-name" style={{ fontSize: '0.82rem' }}>{d.createdBy || '—'}</div>
                        <div className="cell-meta" style={{ fontSize: '0.75rem' }}>{auditLine}</div>
                      </td>
                      <td>
                        <div className="action-group">
                          {canEdit && (
                            <button
                              className="btn-action edit"
                              title="Edit"
                              onClick={() => setModal({ open: true, mode: 'edit', disease: d })}
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pagination-row">
            <span>Showing {diseases.length} diseases</span>
          </div>
        </div>
      )}

      {/* Requests panel */}
      {activeTab === 'requests' && (
        <div className="card" id="requests-panel">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Disease</th><th>Requested By</th><th>Status</th>
                  <th>Admin Response</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <EmptyState icon="fa-inbox" message="No disease requests yet." colSpan={7} />
                )}
                {requests.map(r => {
                  const processedBy = r.approvedBy
                    ? `Approved by ${r.approvedBy} · ${fmtDateTime(r.updatedAt)}`
                    : r.rejectedBy
                      ? `Rejected by ${r.rejectedBy} · ${fmtDateTime(r.updatedAt)}`
                      : '—';
                  return (
                    <tr key={r.id}>
                      <td><span className="td-id">#{r.id.slice(0, 8)}</span></td>
                      <td>
                        <div className="cell-name">{r.requestedDiseaseName}</div>
                        <div className="cell-meta">ICD: {r.suggestedIcdCode || '—'} · {r.suggestedCategory || '—'}</div>
                      </td>
                      <td>{r.doctorName || r.requestedByDoctor}</td>
                      <td>
                        <StatusBadge value={r.status} />
                        {r.status !== 'pending' && (
                          <div className="cell-meta" style={{ marginTop: 3 }}>{processedBy}</div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.adminResponse || '—'}</td>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td>
                        <div className="action-group">
                          {r.status === 'pending' ? (
                            <>
                              <button
                                className="btn-action edit"
                                title="Approve"
                                style={{ color: 'var(--success)' }}
                                onClick={() => setApproveReq(r)}
                              >
                                <i className="fas fa-check" />
                              </button>
                              <button
                                className="btn-action delete"
                                title="Reject"
                                onClick={() => setRejectReq(r)}
                              >
                                <i className="fas fa-xmark" />
                              </button>
                            </>
                          ) : (
                            <span className="permission-notice">Processed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <DiseaseModal
        show={modal.open}
        mode={modal.mode}
        disease={modal.disease}
        onClose={() => setModal({ open: false, mode: 'add', disease: null })}
        onSave={handleSaveDisease}
      />
      <ConfirmDeleteModal
        show={!!deleteTarget}
        name={deleteTarget?.name}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <ApproveModal
        show={!!approveReq}
        request={approveReq}
        onClose={() => setApproveReq(null)}
        onApprove={handleApprove}
      />
      <RejectModal
        show={!!rejectReq}
        request={rejectReq}
        onClose={() => setRejectReq(null)}
        onReject={handleReject}
      />
    </>
  );
}
