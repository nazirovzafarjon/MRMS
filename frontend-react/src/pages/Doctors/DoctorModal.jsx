import { useEffect, useReducer } from 'react';
import Modal from '../../components/common/Modal';

const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
  'Oncology', 'Radiology', 'Emergency Medicine',
  'Dermatology', 'General Medicine', 'Surgery',
];

const EMPTY = {
  name: '', specialization: '', email: '', phone: '',
  department: '', status: 'active', joinDate: '', patients: '',
  username: '', password: '',
};

function validate(form, isEdit) {
  const errors = {};
  if (!form.name.trim())           errors.name           = 'Full name is required';
  if (!form.specialization.trim()) errors.specialization = 'Specialization is required';
  if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Valid email is required';
  if (!form.department)            errors.department     = 'Department is required';
  if (!isEdit && form.username.trim() && !form.password.trim()) {
    errors.password = 'Password is required when providing a username.';
  }
  return errors;
}

// Defined at module scope so its identity is stable across renders.
// Defining it inside a component causes React to see a new type on every
// render, unmounting and remounting the input and stealing focus.
function Field({ label, id, type = 'text', required, value, error, onChange, ...props }) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>{label}{required ? ' *' : ''}</label>
      <input
        id={id}
        type={type}
        className={`form-control${error ? ' is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}

export default function DoctorModal({ show, mode, doctor, onClose, onSave }) {
  const [form,     dispatch]    = useReducer((s, a) => a.type === 'SET'
    ? { ...s, [a.field]: a.value }
    : a.type === 'RESET' ? { ...EMPTY, ...a.payload } : s, EMPTY);
  const [errors,   setErrors]   = useReducer((s, a) => ({ ...s, ...a }), {});
  const [saving,   setSaving]   = useReducer((_, a) => a, false);
  const [apiError, setApiError] = useReducer((_, a) => a, '');

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (show) {
      dispatch({ type: 'RESET', payload: isEdit && doctor ? {
        name:           doctor.name           ?? '',
        specialization: doctor.specialization ?? '',
        email:          doctor.email          ?? '',
        phone:          doctor.phone          ?? '',
        department:     doctor.department     ?? '',
        status:         doctor.status         ?? 'active',
        joinDate:       doctor.joinDate       ?? '',
        patients:       doctor.patients?.toString() ?? '',
      } : {} });
      setErrors({});
      setApiError('');
    }
  }, [show, mode, doctor]);

  const set = (field) => (e) => {
    dispatch({ type: 'SET', field, value: e.target.value });
    if (errors[field]) setErrors({ [field]: '' });
  };

  async function handleSave() {
    const errs = validate(form, isEdit);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');
    await onSave(form, setSaving, setApiError);
  }

  const title = (
    <><i className={`fas ${isEdit ? 'fa-pen' : 'fa-user-plus'} me-2 text-primary-custom`} />
    {isEdit ? 'Edit Doctor' : 'Add New Doctor'}</>
  );

  const footer = (
    <>
      <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving
          ? <><i className="fas fa-spinner fa-spin me-1" />Saving…</>
          : <><i className="fas fa-floppy-disk me-1" />Save Doctor</>
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
          <Field label="Full Name" id="name" required
            value={form.name} error={errors.name} onChange={set('name')} />
        </div>
        <div className="col-md-6">
          <Field label="Specialization" id="specialization" required
            value={form.specialization} error={errors.specialization} onChange={set('specialization')} />
        </div>
        <div className="col-md-6">
          <Field label="Email" id="email" type="email" required
            value={form.email} error={errors.email} onChange={set('email')} />
        </div>
        <div className="col-md-6">
          <Field label="Phone" id="phone"
            value={form.phone} error={errors.phone} onChange={set('phone')} />
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="department">Department *</label>
          <select
            id="department"
            className={`form-select${errors.department ? ' is-invalid' : ''}`}
            value={form.department}
            onChange={set('department')}
          >
            <option value="">— Select Department —</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.department && <div className="invalid-feedback">{errors.department}</div>}
        </div>

        <div className="col-md-3">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="col-md-3">
          <Field label="Join Date" id="joinDate" type="date"
            value={form.joinDate} error={errors.joinDate} onChange={set('joinDate')} />
        </div>
        <div className="col-md-4">
          <Field label="Patients Count" id="patients" type="number"
            value={form.patients} error={errors.patients} onChange={set('patients')} />
        </div>

        {!isEdit && (
          <>
            <div className="col-12">
              <hr /><p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <i className="fas fa-key me-1" />Login credentials (optional)
              </p>
            </div>
            <div className="col-md-6">
              <Field label="Username" id="username" autoComplete="off"
                value={form.username} error={errors.username} onChange={set('username')} />
            </div>
            <div className="col-md-6">
              <Field label="Password" id="password" type="password" autoComplete="new-password"
                value={form.password} error={errors.password} onChange={set('password')} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
