import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Modal from '../../components/common/Modal';
import { useApi } from '../../hooks/useApi';

const EMPTY = {
  patientId: '', doctorId: '', name: '', code: '',
  category: '', severity: '', date: '', status: '', notes: '',
};

function validate(form) {
  const errors = {};
  if (!form.name.trim())     errors.name     = 'Diagnosis name is required';
  if (!form.category.trim()) errors.category = 'Category is required';
  if (!form.severity.trim()) errors.severity = 'Severity is required';
  return errors;
}

export default function DiagnosisModal({ show, mode, diagnosis, patients, doctors, diseaseCatalog, onClose, onSave }) {
  const api = useApi();
  const [form,     dispatch]    = useReducer((s, a) => a.type === 'SET'
    ? { ...s, [a.field]: a.value }
    : a.type === 'RESET' ? { ...EMPTY, ...a.payload } : s, EMPTY);
  const [errors,   setErrors]   = useReducer((s, a) => ({ ...s, ...a }), {});
  const [saving,   setSaving]   = useReducer((_, a) => a, false);
  const [apiError, setApiError] = useReducer((_, a) => a, '');

  // Disease autocomplete state
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [catalog,         setCatalog]         = useState(diseaseCatalog || []);
  const debounceRef = useRef(null);
  const nameInputRef = useRef(null);

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (diseaseCatalog) setCatalog(diseaseCatalog);
  }, [diseaseCatalog]);

  useEffect(() => {
    if (show) {
      dispatch({ type: 'RESET', payload: isEdit && diagnosis ? {
        patientId: diagnosis.patientId  ?? '',
        doctorId:  diagnosis.doctorId   ?? '',
        name:      diagnosis.name       ?? '',
        code:      diagnosis.code       ?? '',
        category:  diagnosis.category   ?? '',
        severity:  diagnosis.severity   ?? '',
        date:      diagnosis.date       ?? '',
        status:    diagnosis.status     ?? '',
        notes:     diagnosis.notes      ?? '',
      } : {} });
      setErrors({});
      setApiError('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [show, mode, diagnosis]);

  const set = (field) => (e) => {
    dispatch({ type: 'SET', field, value: e.target.value });
    if (errors[field]) setErrors({ [field]: '' });
  };

  const handleNameInput = useCallback((e) => {
    const value = e.target.value;
    dispatch({ type: 'SET', field: 'name', value });
    if (errors.name) setErrors({ name: '' });

    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setShowSuggestions(false); return; }

    debounceRef.current = setTimeout(async () => {
      const res = await api.get(`/disease-catalog?search=${encodeURIComponent(value.trim())}`);
      if (res?.success) {
        const matches = res.data.filter(d => d.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
        setSuggestions(matches);
        setShowSuggestions(true);
        setCatalog(prev => {
          const ids = new Set(prev.map(d => d.id));
          return [...prev, ...res.data.filter(d => !ids.has(d.id))];
        });
      }
    }, 250);
  }, [api, errors.name]);

  function selectDisease(disease) {
    dispatch({ type: 'SET', field: 'name',     value: disease.name });
    dispatch({ type: 'SET', field: 'code',     value: disease.icdCode  || '' });
    dispatch({ type: 'SET', field: 'category', value: disease.category || '' });
    setShowSuggestions(false);
    if (errors.name) setErrors({ name: '' });
  }

  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');

    const selPatient = patients.find(p => p.id === form.patientId);
    const selDoctor  = doctors.find(d => d.id === form.doctorId);
    const inCatalog  = catalog.some(d => d.name.toLowerCase() === form.name.toLowerCase());
    const isNewDiseaseRequest = !isEdit && !inCatalog && !!form.name.trim();

    const payload = {
      patient:              selPatient?.name || '',
      patientId:            form.patientId   || null,
      doctor:               selDoctor?.name  || '',
      code:                 form.code,
      name:                 form.name,
      category:             form.category,
      severity:             form.severity,
      date:                 form.date        || null,
      status:               form.status      || null,
      notes:                form.notes       || '',
      isNewDiseaseRequest,
      requestedDiseaseName: isNewDiseaseRequest ? form.name : '',
    };

    await onSave(payload, isNewDiseaseRequest, setSaving, setApiError);
  }

  const title = (
    <><i className={`fas ${isEdit ? 'fa-pen' : 'fa-file-circle-plus'} me-2 text-primary-custom`} />
    {isEdit ? 'Edit Diagnosis' : 'Add New Diagnosis'}</>
  );

  const footer = (
    <>
      <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving
          ? <><i className="fas fa-spinner fa-spin me-1" />Saving…</>
          : <><i className="fas fa-floppy-disk me-1" />Save Diagnosis</>
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
          <label className="form-label">Patient</label>
          <select className="form-select" value={form.patientId} onChange={set('patientId')}>
            <option value="">— Select patient —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.id.slice(0, 6)})</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Doctor</label>
          <select className="form-select" value={form.doctorId} onChange={set('doctorId')}>
            <option value="">— Select doctor —</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
          </select>
        </div>

        {/* Disease name with autocomplete */}
        <div className="col-md-8">
          <label className="form-label">Diagnosis Name *</label>
          <div className="disease-search-wrap">
            <input
              ref={nameInputRef}
              className={`form-control${errors.name ? ' is-invalid' : ''}`}
              value={form.name}
              onChange={handleNameInput}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Type to search catalog…"
              autoComplete="off"
            />
            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            {showSuggestions && (
              <div id="dx-disease-suggestions" style={{ display: 'block' }}>
                {suggestions.length === 0 ? (
                  <div className="disease-suggestion-item text-muted" style={{ cursor: 'default', fontStyle: 'italic', fontSize: '0.82rem' }}>
                    <i className="fas fa-search me-2" />Not in catalog — submit as a new disease request
                  </div>
                ) : suggestions.map(d => (
                  <div
                    key={d.id}
                    className="disease-suggestion-item"
                    onMouseDown={() => selectDisease(d)}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ICD: {d.icdCode || '—'} · {d.category}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label">ICD Code</label>
          <input className="form-control" value={form.code} onChange={set('code')} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Category *</label>
          <select className={`form-select${errors.category ? ' is-invalid' : ''}`} value={form.category} onChange={set('category')}>
            <option value="">— Select Category —</option>
            <option value="General Practice">General Practice</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Orthopaedics">Orthopaedics</option>
            <option value="Diagnostic – Blood Test">Diagnostic – Blood Test</option>
            <option value="Diagnostic – Imaging">Diagnostic – Imaging</option>
            <option value="Diagnostic – ECG">Diagnostic – ECG</option>
            <option value="Emergency">Emergency</option>
            <option value="Referral">Referral</option>
          </select>
          {errors.category && <div className="invalid-feedback">{errors.category}</div>}
        </div>
        <div className="col-md-4">
          <label className="form-label">Severity *</label>
          <select className={`form-select${errors.severity ? ' is-invalid' : ''}`} value={form.severity} onChange={set('severity')}>
            <option value="">— Select —</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          {errors.severity && <div className="invalid-feedback">{errors.severity}</div>}
        </div>
        <div className="col-md-4">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="">— Select —</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Date</label>
          <input type="date" className="form-control" value={form.date} onChange={set('date')} />
        </div>
        <div className="col-12">
          <label className="form-label">Notes</label>
          <textarea className="form-control" value={form.notes} onChange={set('notes')} rows={3} />
        </div>
      </div>
    </Modal>
  );
}
