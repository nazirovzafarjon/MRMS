import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { fmtDate, fmtDateTime, getInitials, avatarColor } from '../../utils/formatters';
import Avatar from '../../components/common/Avatar';
import StatusBadge, { SeverityBadge, ConditionBadge } from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import PatientModal from '../Patients/PatientModal';
import DiagnosisModal from '../Diagnoses/DiagnosisModal';

function InfoItem({ label, children, fullWidth }) {
  return (
    <div className="info-item" style={fullWidth ? { gridColumn: '1/-1' } : {}}>
      <label>{label}</label>
      <span>{children || '—'}</span>
    </div>
  );
}

function DoctorCard({ doctor }) {
  if (!doctor) {
    return (
      <div className="empty-state" style={{ padding: '30px 20px' }}>
        <i className="fas fa-user-doctor" />
        <p>No doctor assigned</p>
      </div>
    );
  }
  const initials = getInitials(doctor.name);
  const color    = avatarColor(doctor.name);
  return (
    <div>
      <div className="avatar-cell mb-3">
        <div className={`table-avatar avatar-${color}`} style={{ width: 52, height: 52, borderRadius: 12, fontSize: '1rem' }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{doctor.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{doctor.specialization}</div>
        </div>
      </div>
      <div className="row g-2" style={{ fontSize: '0.83rem' }}>
        {[
          { label: 'Department', value: doctor.department },
          { label: 'Phone',      value: doctor.phone },
          { label: 'Email',      value: doctor.email },
          { label: 'Status',     value: <StatusBadge value={doctor.status} /> },
        ].map(({ label, value }) => (
          <div className="col-6" key={label}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>{value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PatientProfile() {
  const { id }        = useParams();
  const api           = useApi();
  const navigate      = useNavigate();
  const { can }       = usePermissions();
  const { showToast } = useToast();

  const [patient,       setPatient]       = useState(null);
  const [doctor,        setDoctor]        = useState(null);
  const [diagnoses,     setDiagnoses]     = useState([]);
  const [doctors,       setDoctors]       = useState([]);
  const [catalog,       setCatalog]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);

  // Patient edit / delete state
  const [editPatient,   setEditPatient]   = useState(false);
  const [deletePatient, setDeletePatient] = useState(false);

  // Diagnosis modal / delete state
  const [dxModal,  setDxModal]  = useState({ open: false, mode: 'add', diagnosis: null });
  const [dxDelete, setDxDelete] = useState(null);

  const canEditPatient   = can('patients', 'edit');
  const canDeletePatient = can('patients', 'delete');
  const canViewDx        = can('diagnoses', 'view');
  const canCreateDx      = can('diagnoses', 'create');
  const canEditDx        = can('diagnoses', 'edit');
  const canDeleteDx      = can('diagnoses', 'delete');

  async function loadDiagnoses(signal) {
    if (!canViewDx) return;
    const res = await api.get(`/diseases?patientId=${id}`, signal);
    if (res?.success) setDiagnoses(res.data);
  }

  useEffect(() => {
    if (!id) { navigate('/patients', { replace: true }); return; }
    const ctrl = new AbortController();
    setLoading(true);

    async function load() {
      const patRes = await api.get(`/patients/${id}`, ctrl.signal);
      if (!patRes) return;
      if (!patRes.success) { setNotFound(true); setLoading(false); return; }

      const p = patRes.data;
      setPatient(p);
      document.title = `${p.name} — MRMS CareTrack`;

      const promises = [
        loadDiagnoses(ctrl.signal),
        api.get('/doctors', ctrl.signal).then(r => { if (r?.success) setDoctors(r.data); }),
        api.get('/disease-catalog', ctrl.signal).then(r => { if (r?.success) setCatalog(r.data); }),
      ];

      if (p.doctorId) {
        promises.push(
          api.get(`/doctors/${p.doctorId}`, ctrl.signal).then(r => { if (r?.success) setDoctor(r.data); })
        );
      }

      await Promise.all(promises);
      setLoading(false);
    }

    load();
    return () => { ctrl.abort(); document.title = 'CareTrack MRMS'; };
  }, [id]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePatientSave(form, setSaving, setApiError) {
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
    const res = await api.put(`/patients/${id}`, payload);
    setSaving(false);
    if (!res?.success) { setApiError(res?.message || 'Failed to update patient.'); return; }
    setPatient(prev => ({ ...prev, ...payload }));
    setEditPatient(false);
    showToast('Patient record updated');
  }

  async function handlePatientDelete() {
    const res = await api.del(`/patients/${id}`);
    if (res?.success) {
      showToast(`${patient.name}'s record deleted`);
      navigate('/patients', { replace: true });
    } else {
      showToast(res?.message || 'Delete failed', 'error');
    }
  }

  async function handleDxSave(payload, isNewDiseaseRequest, setSaving, setApiError) {
    const res = dxModal.mode === 'edit'
      ? await api.put(`/diseases/${dxModal.diagnosis.id}`, payload)
      : await api.post('/diseases', payload);

    setSaving(false);
    if (!res?.success) { setApiError(res?.message || 'Failed to save diagnosis.'); return; }

    setDxModal({ open: false, mode: 'add', diagnosis: null });
    showToast(dxModal.mode === 'edit' ? 'Diagnosis updated' : 'Diagnosis added');
    loadDiagnoses();
  }

  async function handleDxDelete() {
    const { id: dxId, name } = dxDelete;
    setDxDelete(null);
    const res = await api.del(`/diseases/${dxId}`);
    if (res?.success) {
      showToast(`"${name}" removed`);
      setDiagnoses(prev => prev.filter(d => d.id !== dxId));
    } else {
      showToast(res?.message || 'Delete failed', 'error');
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }} />
        <p style={{ marginTop: 12 }}>Loading patient profile…</p>
      </div>
    );
  }

  if (notFound || !patient) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: 16, display: 'block' }} />
        <h5 style={{ color: 'var(--text)' }}>Patient not found</h5>
        <Link to="/patients" className="btn btn-light mt-3">Back to Patients</Link>
      </div>
    );
  }

  const age = patient.dob
    ? new Date().getFullYear() - new Date(patient.dob).getFullYear()
    : null;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{patient.name}</h1>
          <p className="page-subtitle">Full medical record, assigned doctor, and diagnoses</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {canEditPatient && (
            <button
              className="btn-primary-custom"
              style={{ background: 'var(--glass)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onClick={() => setEditPatient(true)}
            >
              <i className="fas fa-pen" /> Edit Patient
            </button>
          )}
          {canDeletePatient && (
            <button
              className="btn-primary-custom"
              style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: 'var(--danger)' }}
              onClick={() => setDeletePatient(true)}
            >
              <i className="fas fa-trash" /> Delete
            </button>
          )}
          <Link to="/patients">
            <button className="btn-primary-custom">
              <i className="fas fa-arrow-left" /> Back to Patients
            </button>
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {/* Patient Details */}
        <div className="col-lg-6">
          <div className="card profile-card h-100">
            <div className="profile-header">
              <div className="d-flex align-items-center gap-3">
                <div className="profile-avatar">{getInitials(patient.name)}</div>
                <div>
                  <div className="profile-name">{patient.name}</div>
                  <div className="profile-meta">
                    {patient.gender || '—'} · {age ? `${age} yrs` : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="info-grid">
              <InfoItem label="Date of Birth">{fmtDate(patient.dob)}</InfoItem>
              <InfoItem label="Blood Type">{patient.blood}</InfoItem>
              <InfoItem label="Phone">{patient.phone}</InfoItem>
              <InfoItem label="Email">{patient.email}</InfoItem>
              <InfoItem label="Admission Date">{fmtDate(patient.admitDate)}</InfoItem>
              <InfoItem label="Status"><StatusBadge value={patient.status} /></InfoItem>
              <InfoItem label="Address" fullWidth>{patient.address}</InfoItem>
              <InfoItem label="Medical Condition" fullWidth><ConditionBadge value={patient.condition} /></InfoItem>
            </div>
          </div>
        </div>

        {/* Assigned Doctor */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="card-title">
                <i className="fas fa-user-doctor me-2 text-primary-custom" />Assigned Doctor
              </h6>
            </div>
            <div className="card-body">
              <DoctorCard doctor={doctor} />
            </div>
          </div>
        </div>
      </div>

      {/* Diagnoses Table */}
      {canViewDx ? (
        <div className="card">
          <div className="card-header">
            <h6 className="card-title">
              <i className="fas fa-file-medical me-2 text-primary-custom" />Diagnoses &amp; Diseases
            </h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="text-muted-custom" style={{ fontSize: '0.78rem' }}>
                {diagnoses.length} {diagnoses.length === 1 ? 'record' : 'records'}
              </span>
              {canCreateDx && (
                <button
                  className="btn-primary-custom"
                  style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                  onClick={() => setDxModal({ open: true, mode: 'add', diagnosis: null })}
                >
                  <i className="fas fa-plus" /> Add Diagnosis
                </button>
              )}
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ICD Code</th><th>Diagnosis</th><th>Category</th>
                  <th>Severity</th><th>Date</th><th>Status</th><th>Notes</th>
                  {(canEditDx || canDeleteDx) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {diagnoses.length === 0
                  ? <EmptyState icon="fa-file-medical" message="No diagnoses recorded." colSpan={(canEditDx || canDeleteDx) ? 8 : 7} />
                  : diagnoses.map(dx => (
                    <tr key={dx.id}>
                      <td><span className="td-id">{dx.code || '—'}</span></td>
                      <td><div className="cell-name">{dx.name}</div></td>
                      <td>{dx.category || '—'}</td>
                      <td><SeverityBadge value={dx.severity} /></td>
                      <td>{fmtDate(dx.date)}</td>
                      <td><StatusBadge value={dx.status} /></td>
                      <td className="notes-cell" title={dx.notes || ''}>
                        {(dx.notes || '').slice(0, 60)}{(dx.notes || '').length > 60 ? '…' : ''}
                      </td>
                      {(canEditDx || canDeleteDx) && (
                        <td>
                          <div className="action-group">
                            {canEditDx && (
                              <button
                                className="btn-action edit"
                                title="Edit"
                                onClick={() => setDxModal({ open: true, mode: 'edit', diagnosis: dx })}
                              >
                                <i className="fas fa-pen" />
                              </button>
                            )}
                            {canDeleteDx && (
                              <button
                                className="btn-action delete"
                                title="Delete"
                                onClick={() => setDxDelete({ id: dx.id, name: dx.name })}
                              >
                                <i className="fas fa-trash" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="alert-custom info">
          <i className="fas fa-info-circle" />
          Your role does not have access to diagnosis records.
        </div>
      )}

      {/* Patient edit modal */}
      <PatientModal
        show={editPatient}
        mode="edit"
        patient={patient}
        doctors={doctors}
        onClose={() => setEditPatient(false)}
        onSave={handlePatientSave}
      />

      {/* Patient delete confirmation */}
      <ConfirmDeleteModal
        show={deletePatient}
        name={patient.name}
        onConfirm={handlePatientDelete}
        onClose={() => setDeletePatient(false)}
      />

      {/* Diagnosis add/edit modal */}
      <DiagnosisModal
        show={dxModal.open}
        mode={dxModal.mode}
        diagnosis={dxModal.diagnosis}
        patients={patient ? [patient] : []}
        doctors={doctors}
        diseaseCatalog={catalog}
        onClose={() => setDxModal({ open: false, mode: 'add', diagnosis: null })}
        onSave={handleDxSave}
      />

      {/* Diagnosis delete confirmation */}
      <ConfirmDeleteModal
        show={!!dxDelete}
        name={dxDelete?.name}
        onConfirm={handleDxDelete}
        onClose={() => setDxDelete(null)}
      />
    </>
  );
}
