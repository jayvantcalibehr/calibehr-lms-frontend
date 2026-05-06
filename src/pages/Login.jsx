import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { HiAcademicCap } from 'react-icons/hi2';
import { MdShield } from 'react-icons/md';
import API from '../api/axios';
import { getLandingPath } from '../utils/permissions';
import { fetchRoles } from '../utils/roles';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate(getLandingPath());
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your domain username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/auth/loginLdap', { username, password });
      if (res.data.code === 1) {
        const userData = res.data.data;
        // Normalize field names so all sidebar/settings components work correctly
        userData.emp_first_name  = userData.firstName   || userData.emp_first_name  || '';
        userData.emp_last_name   = userData.lastName    || userData.emp_last_name   || '';
        userData.emp_email       = userData.email       || userData.emp_email       || '';
        userData.emp_photo       = userData.photo       || userData.emp_photo       || '';
        userData.emp_department  = userData.department  || userData.emp_department  || '';
        userData.emp_designation = userData.designation || userData.emp_designation || '';
        userData.emp_code        = userData.empCode     || userData.emp_code        || '';
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user',  JSON.stringify(userData));

        /* Fetch roles_master from DB so getRoleName() works dynamically.
           Non-blocking — landing page renders immediately, role names
           populate as soon as the request resolves. */
        fetchRoles().catch(() => {});

        // Role-aware landing page (getLandingPath reads from localStorage)
        navigate(getLandingPath());
      } else {
        setError(res.data.message || 'Authentication failed. Check your credentials.');
      }
    } catch {
      setError('Unable to connect. Please try again or contact IT support.');
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        html, body, #root {
          width: 100% !important;
          height: 100% !important;
          min-height: 100vh !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          overflow-x: hidden;
        }
        .login-page {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          font-family: 'Segoe UI', -apple-system, sans-serif;
        }
        /* Left panel */
        .login-left {
          width: 45%;
          min-height: 100vh;
          background: linear-gradient(155deg, #0a1628 0%, #0d2240 50%, #0a1628 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 52px;
          position: relative;
          overflow: hidden;
        }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
        .blob1 { width: 400px; height: 400px; background: rgba(0,188,120,0.15); top: -100px; right: -100px; }
        .blob2 { width: 300px; height: 300px; background: rgba(59,130,246,0.12); bottom: -60px; left: -60px; }
        .blob3 { width: 200px; height: 200px; background: rgba(0,188,120,0.1); bottom: 200px; right: 60px; }

        /* Right panel */
        .login-right {
          flex: 1;
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }
        .login-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 20px;
          padding: 44px 40px;
          box-shadow: 0 4px 40px rgba(0,0,0,0.08);
          animation: fadeInUp .4s ease both;
        }
        @keyframes fadeInUp {
          from { opacity:0; transform: translateY(20px); }
          to   { opacity:1; transform: translateY(0); }
        }

        /* Form elements */
        .lms-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 7px;
          letter-spacing: .3px;
        }
        .lms-input-wrap { position: relative; }
        .lms-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          font-size: 16px;
          pointer-events: none;
          display: flex;
        }
        .lms-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          color: #111827;
          background: #fafafa;
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
          font-family: inherit;
        }
        .lms-input:focus {
          border-color: #0d2240;
          box-shadow: 0 0 0 3px rgba(13,34,64,.09);
          background: #fff;
        }
        .lms-input-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color .15s;
        }
        .lms-input-eye:hover { color: #374151; }
        .lms-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #0a1628, #1a3a6e);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: .3px;
          transition: transform .15s, box-shadow .15s, opacity .15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
        }
        .lms-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(10,22,40,.28);
        }
        .lms-btn:active:not(:disabled) { transform: translateY(0); }
        .lms-btn:disabled { opacity: .7; cursor: not-allowed; }

        .lms-err {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px;
          color: #b91c1c;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin { animation: spin .75s linear infinite; display: inline-block; }

        /* Feature list */
        .feat-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .feat-item:last-child { border-bottom: none; }
        .feat-icon-box {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .feat-text { font-size: 13.5px; color: rgba(255,255,255,0.75); font-weight: 500; }

        /* Stats */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 12px;
          margin-top: 32px;
        }
        .stat-box {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 14px 10px;
          text-align: center;
        }
        .stat-val { font-size: 22px; font-weight: 800; color: #00bc78; display: block; }
        .stat-lbl { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 3px; display: block; }

        /* Mobile logo (hidden on desktop) */
        .mobile-logo { display: none; align-items: center; gap: 10px; margin-bottom: 28px; }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .login-left { width: 40%; padding: 40px 36px; }
        }
        @media (max-width: 680px) {
          .login-left { display: none; }
          .login-right { background: #0a1628; padding: 24px 16px; min-height: 100vh; }
          .login-card {
            box-shadow: none;
            background: #fff;
            border-radius: 20px;
            padding: 36px 28px;
            max-width: 400px;
          }
          .mobile-logo { display: flex !important; }
        }
        @media (max-width: 380px) {
          .login-card { padding: 28px 20px; }
        }
      `}</style>

      <div className="login-page">

        {/* ── LEFT ── */}
        <div className="login-left">
          <div className="blob blob1" />
          <div className="blob blob2" />
          <div className="blob blob3" />

          {/* Brand */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(0,188,120,.2)', border: '1px solid rgba(0,188,120,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiAcademicCap size={24} color="#00bc78" />
              </div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: '.3px' }}>Calibehr</div>
                <div style={{ fontSize: 9, color: '#00bc78', letterSpacing: 3, fontWeight: 700 }}>LEARNING PORTAL</div>
              </div>
            </div>

            <h1 style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-1px' }}>
              Learn. Grow.<br />
              <span style={{ color: '#00bc78' }}>Achieve More.</span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.8, margin: '0 0 40px', maxWidth: 300 }}>
              Your complete platform for professional growth — courses, quizzes, interviews and beyond.
            </p>

            {/* Features */}
            <div>
              {[
                ['📚', 'Access 90+ structured courses'],
                ['🧠', 'Smart quizzes & assessments'],
                ['🎥', 'Video interview preparation'],
                ['🏆', 'Leaderboard & achievements'],
              ].map(([icon, text]) => (
                <div key={text} className="feat-item">
                  <div className="feat-icon-box">{icon}</div>
                  <span className="feat-text">{text}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="stat-grid">
              {[['90+', 'Courses'], ['145K', 'Learners'], ['50+', 'Quizzes']].map(([v, l]) => (
                <div key={l} className="stat-box">
                  <span className="stat-val">{v}</span>
                  <span className="stat-lbl">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', zIndex: 1, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 }}>
            © {new Date().getFullYear()} Calibehr HR Solutions
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="login-right">
          <div className="login-card">

            {/* Mobile logo */}
            <div className="mobile-logo">
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiAcademicCap size={20} color="#00bc78" />
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0a1628' }}>Calibehr LMS</span>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0a1628', margin: '0 0 4px', letterSpacing: '-.4px' }}>Welcome back</h2>
            <p style={{ fontSize: 13.5, color: '#9ca3af', margin: '0 0 24px' }}>Sign in with your Active Directory credentials</p>

            {/* AD Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 99, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 28 }}>
              <MdShield size={14} color="#059669" />
              Active Directory / LDAP Login
            </div>

            <form onSubmit={handleLogin}>
              {/* Username */}
              <div style={{ marginBottom: 18 }}>
                <label className="lms-label">Domain Username</label>
                <div className="lms-input-wrap">
                  <span className="lms-input-icon"><FiUser size={15} /></span>
                  <input
                    className="lms-input"
                    placeholder="Enter your Username"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 22 }}>
                <label className="lms-label">Password</label>
                <div className="lms-input-wrap">
                  <span className="lms-input-icon"><FiLock size={15} /></span>
                  <input
                    className="lms-input"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    style={{ paddingRight: 44 }}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="lms-input-eye" onClick={() => setShowPwd(p => !p)} tabIndex={-1}>
                    {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lms-err">
                  <FiAlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              <button className="lms-btn" type="submit" disabled={loading}>
                {loading
                  ? <><span className="spin" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />Authenticating...</>
                  : 'Sign In →'
                }
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#9ca3af' }}>
              Having trouble?{' '}
              <a href="mailto:it@calibehr.com" style={{ color: '#0a1628', fontWeight: 700 }}>Contact IT Support</a>
            </div>

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f3f4f6', textAlign: 'center', fontSize: 11, color: '#d1d5db' }}>
              © {new Date().getFullYear()} Calibehr HR Solutions. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
