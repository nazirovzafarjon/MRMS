import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Login failed. Please check your credentials.');
        return;
      }

      login({
        token:    data.data.token,
        role:     data.data.role,
        username: data.data.username,
        doctorId: data.data.doctorId || null,
      });
    } catch {
      setError('Cannot connect to server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-canvas">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>
      <div className="bg-grid" />

      <div className="login-wrap">
        <div className="login-card">

          <div className="login-header">
            <div className="brand-icon-wrap"><i className="fas fa-heart-pulse" /></div>
            <h1>CareTrack MRMS</h1>
            <p>Medical Record Management System — Sign in to continue</p>
          </div>

          <div className="login-body">
            {error && (
              <div className="error-box" style={{ display: 'flex' }}>
                <i className="fas fa-circle-xmark" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="username">Username</label>
                <div className="input-wrap">
                  <i className="fas fa-user input-icon" />
                  <input
                    type="text"
                    id="username"
                    className="form-input"
                    placeholder="Enter your username"
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="input-wrap">
                  <i className="fas fa-lock input-icon" />
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin" /> Signing in…</>
                  : <><i className="fas fa-right-to-bracket" /> Sign In</>
                }
              </button>
            </form>

            <div className="credentials-hint">
              <strong>Demo Accounts:</strong><br />
              <strong>admin</strong> / admin123 &nbsp;·&nbsp;
              <strong>clinician</strong> / clinic123 &nbsp;·&nbsp;
              <strong>receptionist</strong> / recept123
            </div>
          </div>

          <div className="login-footer">
            &copy; 2024 CareTrack Clinic &mdash; MRMS v2.0
          </div>
        </div>
      </div>
    </>
  );
}
