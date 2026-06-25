import { useEffect, useReducer } from 'react';
import Modal from '../../components/common/Modal';

const EMPTY = { adminResponse: '', icdCode: '', category: '', description: '' };

export default function ApproveModal({ show, request, onClose, onApprove }) {
  const [form,   dispatch] = useReducer((s, a) => a.type === 'SET'
    ? { ...s, [a.field]: a.value }
    : a.type === 'RESET' ? { ...EMPTY, ...a.payload } : s, EMPTY);
  const [saving, setSaving] = useReducer((_, a) => a, false);

  useEffect(() => {
    if (show && request) {
      dispatch({ type: 'RESET', payload: {
        icdCode:     request.suggestedIcdCode  || '',
        category:    request.suggestedCategory || '',
        description: '',
        adminResponse: '',
      }});
    }
  }, [show, request]);

  const set = (field) => (e) => dispatch({ type: 'SET', field, value: e.target.value });

  async function handleApprove() {
    setSaving(true);
    await onApprove(request.id, {
      adminResponse: form.adminResponse,
      icdCode:       form.icdCode,
      category:      form.category,
      description:   form.description,
      addToCatalog:  true,
    }, setSaving);
  }

  const title = (
    <><i className="fas fa-check-circle me-2" style={{ color: 'var(--success)' }} />Approve Disease Request</>
  );
  const footer = (
    <>
      <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
      <button className="btn btn-success" onClick={handleApprove} disabled={saving}>
        {saving
          ? <><i className="fas fa-spinner fa-spin me-1" />Approving…</>
          : <><i className="fas fa-check me-1" />Approve</>
        }
      </button>
    </>
  );

  return (
    <Modal show={show} onClose={onClose} title={title} footer={footer}>
      {request && (
        <>
          <p style={{ fontSize: '0.88rem', marginBottom: 18 }}>
            Approving disease: <strong>{request.requestedDiseaseName}</strong>.<br />
            It will be added to the catalog.
          </p>
          <div className="row g-3">
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
              <textarea className="form-control" value={form.description} onChange={set('description')} rows={2} />
            </div>
            <div className="col-12">
              <label className="form-label">Admin Response (optional)</label>
              <textarea className="form-control" value={form.adminResponse} onChange={set('adminResponse')} rows={2} placeholder="Notes for the requester…" />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
