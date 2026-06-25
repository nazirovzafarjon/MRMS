import { useEffect, useReducer } from 'react';
import Modal from '../../components/common/Modal';

export default function RejectModal({ show, request, onClose, onReject }) {
  const [adminResponse, setAdminResponse] = useReducer((_, a) => a, '');
  const [saving,        setSaving]        = useReducer((_, a) => a, false);

  useEffect(() => { if (show) setAdminResponse(''); }, [show]);

  async function handleReject() {
    setSaving(true);
    await onReject(request.id, adminResponse, setSaving);
  }

  const title = (
    <><i className="fas fa-times-circle me-2" style={{ color: 'var(--danger)' }} />Reject Disease Request</>
  );
  const footer = (
    <>
      <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
      <button className="btn btn-danger" onClick={handleReject} disabled={saving}>
        {saving
          ? <><i className="fas fa-spinner fa-spin me-1" />Rejecting…</>
          : <><i className="fas fa-xmark me-1" />Reject</>
        }
      </button>
    </>
  );

  return (
    <Modal show={show} onClose={onClose} title={title} footer={footer}>
      {request && (
        <>
          <p style={{ fontSize: '0.88rem', marginBottom: 16 }}>
            Rejecting request for: <strong>{request.requestedDiseaseName}</strong>
          </p>
          <div>
            <label className="form-label">Reason / Response (optional)</label>
            <textarea
              className="form-control"
              value={adminResponse}
              onChange={e => setAdminResponse(e.target.value)}
              rows={3}
              placeholder="Explain why this request is being rejected…"
            />
          </div>
        </>
      )}
    </Modal>
  );
}
