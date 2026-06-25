import { useEffect, useReducer } from 'react';
import Modal from '../../components/common/Modal';

const EMPTY = {
  name: '', dob: '', gender: '', blood: '', email: '',
  phone: '', address: '', condition: '', doctorId: '', status: '', admitDate: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':  return { ...state, [action.field]: action.value };
    case 'RESET':      return { ...EMPTY, ...action.payload };
    default:           return state;
  }
}

function validate(form) {
  const errors = {};
  if (!form.name.trim())      errors.name      = 'Full name is required';
  if (!form.gender.trim())    errors.gender    = 'Gender is required';
  if (!form.condition.trim()) errors.condition = 'Medical condition is required';
  return errors;
}

export default function PatientModal({ show, mode, patient, doctors, onClose, onSave }) {
  const [form,   dispatch] = useReducer(reducer, EMPTY);
  const [errors, setErrors] = useReducer((s, a) => ({ ...s, ...a }), {});
  const [saving, setSaving] = useReducer((_, a) => a, false);
  const [apiError, setApiError] = useReducer((_, a) => a, '');

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (show) {
      dispatch({ type: 'RESET', payload: isEdit && patient ? {
        name:      patient.name      ?? '',
        dob:       patient.dob       ?? '',
        gender:    patient.gender    ?? '',
        blood:     patient.blood     ?? '',
        email:     patient.email     ?? '',
        phone:     patient.phone     ?? '',
        address:   patient.address   ?? '',
        condition: patient.condition ?? '',
        doctorId:  patient.doctorId  ?? '',
        status:    patient.status    ?? '',
        admitDate: patient.admitDate ?? '',
      } : {} });
      setErrors({});
      setApiError('');
    }
  }, [show, mode, patient]);

  const set = (field) => (e) => {
    dispatch({ type: 'SET_FIELD', field, value: e.target.value });
    if (errors[field]) setErrors({ [field]: '' });
  };

  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');
    await onSave(form, setSaving, setApiError);
  }

  const title = (
    <><i className={`fas ${isEdit ? 'fa-pen' : 'fa-user-plus'} me-2 text-primary-custom`} />
    {isEdit ? 'Edit Patient' : 'Add New Patient'}</>
  );

  const footer = (
    <>
      <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving
          ? <><i className="fas fa-spinner fa-spin me-1" />Saving…</>
          : <><i className="fas fa-floppy-disk me-1" />Save Patient</>
        }
      </button>
    </>
  );

  return (
    <Modal show={show} onClose={onClose} title={title} footer={footer} size="lg">
      {apiError && (
        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.82rem' }}>{apiError}</div>
      )}
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Full Name *</label>
          <input className={`form-control${errors.name ? ' is-invalid' : ''}`} value={form.name} onChange={set('name')} />
          {errors.name && <div className="invalid-feedback">{errors.name}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">Date of Birth</label>
          <input type="date" className="form-control" value={form.dob} onChange={set('dob')} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Gender *</label>
          <select className={`form-select${errors.gender ? ' is-invalid' : ''}`} value={form.gender} onChange={set('gender')}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
        </div>
        <div className="col-md-4">
          <label className="form-label">Blood Type</label>
          <select className="form-select" value={form.blood} onChange={set('blood')}>
            <option value="">— Select —</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="">— Select —</option>
            {['stable','monitoring','critical','recovered','inactive'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" value={form.email} onChange={set('email')} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Phone</label>
          <input className="form-control" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="col-12">
          <label className="form-label">Address</label>
          <input className="form-control" value={form.address} onChange={set('address')} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Medical Condition *</label>
          <select className={`form-select${errors.condition ? ' is-invalid' : ''}`} value={form.condition} onChange={set('condition')}>
            <option value="">— Select Condition —</option>
            <option value="Under Monitoring">Under Monitoring</option>
            <option value="Critical">Critical</option>
            <option value="Recovered">Recovered</option>
          </select>
          {errors.condition && <div className="invalid-feedback">{errors.condition}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">Assigned Doctor</label>
          <select className="form-select" value={form.doctorId} onChange={set('doctorId')}>
            <option value="">— Select doctor —</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Admission Date</label>
          <input type="date" className="form-control" value={form.admitDate} onChange={set('admitDate')} />
        </div>
      </div>
    </Modal>
  );
}
