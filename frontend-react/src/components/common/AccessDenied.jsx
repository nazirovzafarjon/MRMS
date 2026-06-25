export default function AccessDenied({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,71,87,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '1.8rem', color: 'var(--danger)',
        }}>
          <i className="fas fa-ban" />
        </div>
        <h5 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Access Denied</h5>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {message || 'You do not have permission to access this resource.'}
        </p>
      </div>
    </div>
  );
}
