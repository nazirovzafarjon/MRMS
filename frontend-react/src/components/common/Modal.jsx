import { useEffect } from 'react';

export default function Modal({ show, onClose, title, children, footer, size = '' }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        onClick={onClose}
      >
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable${size ? ` modal-${size}` : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
