import Modal from './Modal';

export default function ConfirmDeleteModal({ show, name, onConfirm, onClose }) {
  return (
    <Modal
      show={show}
      onClose={onClose}
      title={<><i className="fas fa-triangle-exclamation me-2" style={{ color: 'var(--danger)' }} />Confirm Delete</>}
      size="sm"
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger"
            onClick={() => { onConfirm(); onClose(); }}
          >
            <i className="fas fa-trash me-1" />Delete
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
        Are you sure you want to delete <strong>{name}</strong>?
        This action cannot be undone.
      </p>
    </Modal>
  );
}
