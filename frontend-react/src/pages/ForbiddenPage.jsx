import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ForbiddenPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', padding: '48px 32px', maxWidth: 480 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,71,87,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '2.2rem', color: 'var(--danger)',
          border: '2px solid rgba(255,71,87,0.25)',
        }}>
          <i className="fas fa-ban" />
        </div>

        <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--danger)', lineHeight: 1, marginBottom: 8 }}>403</div>
        <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Access Forbidden</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 6 }}>
          You do not have permission to view this page.
        </p>
        {user?.role && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 28 }}>
            Your current role is <strong style={{ color: 'var(--text)' }}>{user.role}</strong>.
            Contact an administrator if you believe this is an error.
          </p>
        )}

        <button className="btn-primary-custom" onClick={() => navigate('/')}>
          <i className="fas fa-house" /> Go to Dashboard
        </button>
      </div>
    </div>
  );
}
