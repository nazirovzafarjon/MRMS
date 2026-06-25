import { useEffect, useReducer } from 'react';
import Modal from '../../components/common/Modal';

const EMPTY = { name: '', icdCode: '', category: '', description: '' };

export default function DiseaseModal({ show, mode, disease, onClose, onSave }) {
  const [form,     dispatch]    = useReducer((s, a) => a.type === 'SET'
    ? { ...s, [a.field]: a.value }
    : a.type === 'RESET' ? { ...EMPTY, ...a.payload } : s, EMPTY);
  const [errors,   setErrors]   = useReducer((s, a) => ({ ...s, ...a }), {});
  const [saving,   setSaving]   = useReducer((_, a) => a, false);
  const [apiError, setApiError] = useReducer((_, a) => a, '');

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (show) {
      dispatch({ type: 'RESET', payload: isEdit && disease ? {
        name:        disease.name        ?? '',
        icdCode:     disease.icdCode     ?? '',
        category:    disease.category    ?? '',
        description: disease.description ?? '',
      } : {} });
      setErrors({});
      setApiError('');
    }
  }, [show, mode, disease]);

  const set = (field) => (e) => {
    dispatch({ type: 'SET', field, value: e.target.value });
    if (errors[field]) setErrors({ [field]: '' });
  };

  async function handleSave() {
    if (!form.name.trim()) { setErrors({ name: 'Disease name is required.' }); return; }
    setSaving(true);
    setApiError('');
    await onSave(form, setSaving, setApiError);
  }

  const title = (
    <><i className={`fas ${isEdit ? 'fa-pen' : 'fa-plus'} me-2 text-primary-custom`} />
    {isEdit ? 'Edit Disease' : 'Add Disease to Catalog'}</>
  );

  const footer = (
    <>
      <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving
          ? <><i className="fas fa-spinner fa-spin me-1" />Saving…</>
          : <><i className="fas fa-floppy-disk me-1" />Save Disease</>
        }
      </button>
    </>
  );

  return (
    <Modal show={show} onClose={onClose} title={title} footer={footer}>
      {apiError && (
        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.82rem' }}>{apiError}</div>
      )}
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label">Disease Name *</label>
          <input
            className={`form-control${errors.name ? ' is-invalid' : ''}`}
            value={form.name}
            onChange={set('name')}
          />
          {errors.name && <div className="invalid-feedback">{errors.name}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">ICD Code</label>
          <input className="form-control" value={form.icdCode} onChange={set('icdCode')} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Category</label>
          <input className="form-control" value={form.category} onChange={set('category')} />
        </div>
        <div className="col-12">
          <label className="form-label">Description</label>
          <textarea className="form-control" value={form.description} onChange={set('description')} rows={3} />
        </div>
      </div>
    </Modal>
  );
}
