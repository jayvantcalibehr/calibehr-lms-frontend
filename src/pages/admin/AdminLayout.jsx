import { useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  FiGrid, FiFolder, FiBook, FiUsers, FiHelpCircle,
  FiVideo, FiBarChart2, FiLogOut, FiArrowLeft,
} from 'react-icons/fi';
import API from '../../api/axios';

/* ─────────────────────────────────────────────────────────────
   Admin route guard
   Uses the central permissions system (utils/permissions.js).
───────────────────────────────────────────────────────────── */
import { isAdmin as checkIsAdmin, getLandingPath } from '../../utils/permissions';

export function useIsAdmin() {
  return checkIsAdmin();
}

export function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (!checkIsAdmin()) return <Navigate to={getLandingPath()} replace />;
  return children;
}

/* ─── Main admin layout (sidebar + top bar + content slot) ─── */
const NAV = [
  { path: '/admin',             label: 'Dashboard',  icon: <FiGrid size={16}/>       },
  { path: '/admin/categories',  label: 'Categories', icon: <FiFolder size={16}/>    },
  { path: '/admin/courses',     label: 'Courses',    icon: <FiBook size={16}/>      },
  { path: '/admin/learners',    label: 'Learners',   icon: <FiUsers size={16}/>     },
  { path: '/admin/quizzes',     label: 'Quizzes',    icon: <FiHelpCircle size={16}/>},
  { path: '/admin/interviews',  label: 'Interviews', icon: <FiVideo size={16}/>     },
  { path: '/admin/reports',     label: 'Reports',    icon: <FiBarChart2 size={16}/> },
];

export default function AdminLayout({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { document.title = `Admin · ${title || 'Calibehr LMS'}`; }, [title]);

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userRaw = localStorage.getItem('user');
  const user    = userRaw ? JSON.parse(userRaw) : {};

  return (
    <div className="adm-shell">
      <style>{styles}</style>

      {/* ── Sidebar ── */}
      <aside className="adm-side">
        <div className="adm-brand">
          <div className="adm-brand-logo">🛡️</div>
          <div>
            <div className="adm-brand-name">Calibehr</div>
            <div className="adm-brand-role">Admin Console</div>
          </div>
        </div>

        <div className="adm-user">
          <div className="adm-user-avatar">{(user.firstName || user.name || 'A').charAt(0).toUpperCase()}</div>
          <div style={{ overflow:'hidden' }}>
            <div className="adm-user-name">{user.firstName || user.name || 'Admin'}</div>
            <div className="adm-user-code">{user.emp_code || ''}</div>
          </div>
        </div>

        <div className="adm-nav">
          <div className="adm-nav-label">MANAGE</div>
          {NAV.map(n => {
            const active = n.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(n.path);
            return (
              <button key={n.path}
                      className={'adm-nav-btn' + (active ? ' active' : '')}
                      onClick={() => navigate(n.path)}>
                {n.icon}<span>{n.label}</span>
              </button>
            );
          })}
        </div>

        <div className="adm-nav" style={{ marginTop:'auto' }}>
          <button className="adm-nav-btn" onClick={() => navigate('/dashboard')}>
            <FiArrowLeft size={16}/><span>Back to User View</span>
          </button>
          <button className="adm-nav-btn adm-logout" onClick={logout}>
            <FiLogOut size={16}/><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="adm-main">
        <div className="adm-topbar">
          <h1 className="adm-title">{title || 'Admin'}</h1>
        </div>
        <div className="adm-content">
          {children}
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Styles — scoped with `.adm-` prefix, no global bleed
───────────────────────────────────────────────────────────── */
const styles = `
.adm-shell {
  display:flex; min-height:100vh; background:#f4f5f9; font-family:'Inter',sans-serif;
}

/* Sidebar */
.adm-side {
  width:240px; background:#0f172a; color:#fff; display:flex; flex-direction:column;
  padding:18px 0; position:sticky; top:0; height:100vh;
}
.adm-brand { display:flex; gap:10px; align-items:center; padding:0 18px 16px; border-bottom:1px solid #1e293b; }
.adm-brand-logo { width:36px; height:36px; display:grid; place-items:center; background:#6366f1; border-radius:8px; font-size:18px; }
.adm-brand-name { font-size:14px; font-weight:700; }
.adm-brand-role { font-size:10px; letter-spacing:1px; color:#a78bfa; text-transform:uppercase; margin-top:2px; }

.adm-user { display:flex; gap:10px; align-items:center; padding:14px 18px; background:#1e293b; margin:14px 14px 6px; border-radius:8px; }
.adm-user-avatar { width:36px; height:36px; border-radius:50%; background:#00bc78; display:grid; place-items:center; font-weight:700; font-size:14px; color:#fff; }
.adm-user-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.adm-user-code { font-size:11px; color:#94a3b8; }

.adm-nav { padding:10px 12px; display:flex; flex-direction:column; gap:2px; }
.adm-nav-label { font-size:10px; color:#64748b; letter-spacing:1px; padding:8px 10px 4px; }
.adm-nav-btn {
  display:flex; align-items:center; gap:12px; background:transparent; border:none; color:#cbd5e1;
  padding:9px 12px; border-radius:6px; font-size:13px; cursor:pointer; text-align:left; width:100%;
  transition:background 0.12s;
}
.adm-nav-btn:hover { background:#1e293b; color:#fff; }
.adm-nav-btn.active { background:#6366f1; color:#fff; font-weight:600; }
.adm-logout { color:#fca5a5; }
.adm-logout:hover { background:#7f1d1d; color:#fff; }

/* Main */
.adm-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.adm-topbar {
  background:#fff; padding:14px 28px; border-bottom:1px solid #e5e7eb;
  display:flex; align-items:center; justify-content:space-between;
}
.adm-title { font-size:18px; font-weight:700; color:#0a1628; margin:0; }
.adm-content { padding:24px 28px; flex:1; overflow:auto; }

/* Cards, buttons, forms (shared) */
.adm-card {
  background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:20px;
}
.adm-btn {
  display:inline-flex; align-items:center; gap:6px; padding:8px 14px; font-size:13px;
  font-weight:600; border-radius:6px; border:none; cursor:pointer; transition:all 0.15s;
}
.adm-btn-primary { background:#6366f1; color:#fff; }
.adm-btn-primary:hover { background:#4f46e5; }
.adm-btn-danger { background:#fff; color:#dc2626; border:1px solid #fecaca; }
.adm-btn-danger:hover { background:#fef2f2; }
.adm-btn-ghost { background:transparent; color:#6b7280; }
.adm-btn-ghost:hover { background:#f3f4f6; }
.adm-btn:disabled { opacity:0.55; cursor:not-allowed; }

.adm-stat-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px; margin-bottom:20px; }
.adm-stat-card { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px; }
.adm-stat-val { font-size:28px; font-weight:700; color:#0a1628; margin-bottom:4px; }
.adm-stat-label { font-size:12px; color:#6b7280; }

.adm-table { width:100%; border-collapse:collapse; background:#fff; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; }
.adm-table th { background:#f9fafb; padding:10px 14px; text-align:left; font-size:12px; color:#6b7280; font-weight:600; border-bottom:1px solid #e5e7eb; }
.adm-table td { padding:12px 14px; font-size:13px; color:#0a1628; border-bottom:1px solid #f3f4f6; }
.adm-table tr:last-child td { border-bottom:none; }
.adm-table tr:hover td { background:#f9fafb; }

.adm-input, .adm-select, .adm-textarea {
  width:100%; padding:9px 12px; font-size:13px; border:1px solid #d1d5db;
  border-radius:6px; background:#fff; color:#0a1628; font-family:inherit;
  outline:none; transition:border-color 0.15s;
}
.adm-input:focus, .adm-select:focus, .adm-textarea:focus { border-color:#6366f1; }
.adm-textarea { min-height:80px; resize:vertical; }
.adm-label { display:block; font-size:12px; font-weight:600; color:#374151; margin:12px 0 5px; }

.adm-empty { text-align:center; padding:40px 20px; color:#9ca3af; font-size:13px; }
.adm-empty-big { font-size:48px; margin-bottom:10px; }
`;
