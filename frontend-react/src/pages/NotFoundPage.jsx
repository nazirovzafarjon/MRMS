import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(67,97,238,0.06) 0%, transparent 60%)',
    }}>
      <div style={{ textAlign: 'center', padding: '48px 32px', maxWidth: 480 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(67,97,238,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '2.2rem', color: 'var(--primary)',
          border: '2px solid rgba(67,97,238,0.25)',
        }}>
          <i className="fas fa-map-location-dot" />
        </div>

        <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1, marginBottom: 8 }}>404</div>
        <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Page Not Found</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>

        <button
          className="btn-primary-custom"
          onClick={() => navigate(user ? '/' : '/login')}
        >
          <i className={`fas ${user ? 'fa-house' : 'fa-right-to-bracket'}`} />
          {user ? 'Go to Dashboard' : 'Go to Login'}
        </button>
      </div>
    </div>
  );
}
