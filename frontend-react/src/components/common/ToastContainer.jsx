import { useToast } from '../../contexts/ToastContext';

const ICONS = {
  success: 'fa-check-circle',
  error:   'fa-times-circle',
  info:    'fa-info-circle',
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div id="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-msg ${t.type}`}
          onClick={() => dismiss(t.id)}
          style={{ cursor: 'pointer' }}
        >
          <i className={`fas ${ICONS[t.type] || ICONS.info}`} />
          {t.message}
        </div>
      ))}
    </div>
  );
}
