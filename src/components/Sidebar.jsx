import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  RiDashboardFill, RiBookOpenFill, RiAwardFill, RiVideoFill,
  RiTrophyFill, RiBarChartFill, RiSettings4Fill, RiLogoutBoxRLine,
  RiCloseLine, RiFolder3Fill, RiStackFill,
} from 'react-icons/ri';
import { getNavItems } from '../utils/navItems';
import { getPrimaryRoleName } from '../utils/permissions';
import API from '../api/axios';

/* Per-item gradient identity */
const PALETTE = {
  /* Main section */
  dashboard:        { icon: RiDashboardFill, c1: '#6366F1', c2: '#8B5CF6', glow: 'rgba(99,102,241,0.45)'  },
  courses:          { icon: RiBookOpenFill,  c1: '#06B6D4', c2: '#0EA5E9', glow: 'rgba(14,165,233,0.45)'  },
  quiz:             { icon: RiAwardFill,     c1: '#10B981', c2: '#059669', glow: 'rgba(16,185,129,0.50)'  },
  interview:        { icon: RiVideoFill,     c1: '#EC4899', c2: '#F43F5E', glow: 'rgba(244,63,94,0.45)'   },
  leaderboard:      { icon: RiTrophyFill,    c1: '#FBBF24', c2: '#F59E0B', glow: 'rgba(245,158,11,0.45)'  },
  reports:          { icon: RiBarChartFill,  c1: '#A78BFA', c2: '#8B5CF6', glow: 'rgba(139,92,246,0.45)'  },
  settings:         { icon: RiSettings4Fill, c1: '#94A3B8', c2: '#64748B', glow: 'rgba(100,116,139,0.45)' },
  /* Admin section — own color identities */
  'admin-categories': { icon: RiFolder3Fill, c1: '#F59E0B', c2: '#EF4444', glow: 'rgba(245,158,11,0.45)'  },
  'admin-courses':    { icon: RiStackFill,   c1: '#14B8A6', c2: '#0D9488', glow: 'rgba(20,184,166,0.45)'  },
};

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const firstName = user?.emp_first_name || user?.firstName || 'User';
  const lastName  = user?.emp_last_name  || user?.lastName  || '';
  const empCode   = user?.emp_code || '';

  /* Role name comes from DB-cached role data (roles_master),
     so naye DB roles automatically yahan dikhenge. */
  const roleName = getPrimaryRoleName();

  /* Support both new shape { main, admin } and old flat array */
  const raw = getNavItems();
  const mainList  = Array.isArray(raw) ? raw : (raw.main  || []);
  const adminList = Array.isArray(raw) ? []  : (raw.admin || []);

  const withActive = (items) => items.map(item => ({
    ...item,
    active: location.pathname === item.path || location.pathname.startsWith(item.path + '/'),
  }));
  const navMain  = withActive(mainList);
  const navAdmin = withActive(adminList);

  /* Animated active pill — works across both sections */
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [pill, setPill] = useState({ top: 0, height: 0, opacity: 0 });

  useEffect(() => {
    const allItems = [...navMain, ...navAdmin];
    const active = allItems.find(i => i.active);
    if (!active || !itemRefs.current[active.key] || !navRef.current) {
      setPill(p => ({ ...p, opacity: 0 }));
      return;
    }
    const el = itemRefs.current[active.key];
    const navEl = navRef.current;
    const r = el.getBoundingClientRect();
    const nr = navEl.getBoundingClientRect();
    setPill({ top: r.top - nr.top + navEl.scrollTop, height: r.height, opacity: 1 });
  }, [location.pathname, navMain.length, navAdmin.length]);

  const handleNav = (path) => { onClose?.(); navigate(path); };

  const logout = () => {
    API.post('/auth/logout').catch(() => {});
    localStorage.clear();
    navigate('/login');
  };

  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';

  /* Single nav item — same exact markup as original premium design */
  const renderItem = (item) => {
    const palette = PALETTE[item.key] || PALETTE.dashboard;
    const Icon = palette.icon;
    return (
      <button
        key={item.key}
        ref={el => { itemRefs.current[item.key] = el; }}
        className={`sb-item ${item.active ? 'sb-item--active' : ''}`}
        onClick={() => handleNav(item.path)}
        aria-current={item.active ? 'page' : undefined}
        style={{ '--c1': palette.c1, '--c2': palette.c2, '--glow': palette.glow }}
      >
        <span className="sb-icon" aria-hidden="true">
          <span className="sb-icon-bg"/>
          <Icon size={15}/>
        </span>
        <span className="sb-label">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <style>{CSS}</style>
			{open && (
  <div
    className="sb-overlay"
    onClick={onClose}
    aria-hidden="true"
  />
)}
      <aside className={`sb ${open ? 'sb--open' : ''}`} aria-label="Sidebar navigation">

        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div className="sb-brand-text">
            <div className="sb-brand-name">Calibehr</div>
            <div className="sb-brand-sub">Learning</div>
          </div>
          <button className="sb-close" onClick={onClose} aria-label="Close sidebar">
            <RiCloseLine size={18}/>
          </button>
        </div>

        {/* Nav — both sections inside one nav so pill animation works across both */}
        <nav className="sb-nav" ref={navRef} aria-label="Primary">
          <div
            className="sb-pill"
            style={{ top: `${pill.top}px`, height: `${pill.height}px`, opacity: pill.opacity }}
            aria-hidden="true"
          />

          {navMain.map(renderItem)}

          {navAdmin.length > 0 && (
            <>
              <div className="sb-divider" aria-hidden="true">
                <span className="sb-divider-line"/>
                <span className="sb-divider-label">ADMIN</span>
                <span className="sb-divider-line"/>
              </div>
              {navAdmin.map(renderItem)}
            </>
          )}
        </nav>

        {/* User */}
        <div className="sb-foot">
          <div className="sb-user">
            <div className="sb-av-wrap">
              <div className="sb-av-ring" aria-hidden="true"/>
              <div className="sb-av">
                {user?.photo ? <img src={user.photo} alt=""/> : <span>{initials}</span>}
              </div>
              <div className="sb-av-status" aria-hidden="true"/>
            </div>
            <div className="sb-user-text">
              <div className="sb-user-name">{firstName} {lastName}</div>
              <div className="sb-user-meta">{roleName} · {empCode}</div>
            </div>
          </div>
          <button className="sb-logout" onClick={logout} aria-label="Sign out">
            <RiLogoutBoxRLine size={14}/>
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

const CSS = `
.sb {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: var(--sidebar-w);
  background: var(--sb-bg);
  border-right: 1px solid var(--sb-border);
  display: flex;
  flex-direction: column;
  z-index: 200;
  transition: transform var(--duration) var(--ease);
  overflow: hidden;
}

/* ── Brand ── */
.sb-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--sb-border);
}
.sb-mark {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow:
    0 4px 14px rgba(16, 185, 129, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.20);
}
.sb-brand-text { flex: 1; min-width: 0; }
.sb-brand-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.025em;
  color: #fff;
  line-height: 1;
}
.sb-brand-sub {
  font-size: 9px;
  color: #34d399;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-top: 4px;
  font-weight: 700;
}
.sb-close {
  display: none;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 6px;
  border-radius: 6px;
}
.sb-close:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }

/* ── Nav ── */
.sb-nav {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 1px;
  position: relative;
}

/* Animated active pill */
.sb-pill {
  position: absolute;
  left: 10px;
  right: 10px;
  background: var(--sb-surface);
  border-radius: 9px;
  pointer-events: none;
  transition:
    top var(--duration-slow) cubic-bezier(0.34, 1.4, 0.64, 1),
    height var(--duration-slow) cubic-bezier(0.34, 1.4, 0.64, 1),
    opacity var(--duration) var(--ease);
  box-shadow:
    inset 0 0 0 1px rgba(16, 185, 129, 0.28),
    0 4px 14px rgba(16, 185, 129, 0.18);
  z-index: 0;
}

.sb-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--sb-text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  border-radius: 9px;
  letter-spacing: -0.005em;
  cursor: pointer;
  z-index: 1;
  transition: color var(--duration-fast) var(--ease);
}
.sb-item:hover { color: rgba(255, 255, 255, 0.92); }
.sb-item--active {
  color: var(--sb-text-active);
  font-weight: 600;
}

/* Icon — Stripe-style colored squircle */
.sb-icon {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--c1);
  background: color-mix(in srgb, var(--c1) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c1) 26%, transparent);
  transition: all var(--duration) var(--ease);
}
.sb-icon-bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, var(--c1) 0%, var(--c2) 100%);
  opacity: 0;
  transition: opacity var(--duration) var(--ease);
}
.sb-icon > svg { position: relative; z-index: 1; }

.sb-item:hover .sb-icon {
  transform: scale(1.06);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--c1) 40%, transparent),
    0 4px 10px var(--glow);
}
.sb-item--active .sb-icon {
  color: #fff;
  box-shadow:
    0 4px 12px var(--glow),
    0 1px 2px rgba(0, 0, 0, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.20);
}
.sb-item--active .sb-icon-bg { opacity: 1; }

.sb-label { position: relative; z-index: 1; flex: 1; min-width: 0; }

/* ── ADMIN section divider ── */
.sb-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 4px 8px;
  position: relative;
  z-index: 1;
}
.sb-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
}
.sb-divider-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
}

/* ── Foot ── */
.sb-foot {
  padding: 10px;
  border-top: 1px solid var(--sb-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sb-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px;
  background: var(--sb-surface);
  border-radius: 9px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition: background var(--duration-fast) var(--ease);
}
.sb-user:hover { background: var(--sb-surface-hover); }

.sb-av-wrap { position: relative; width: 32px; height: 32px; flex-shrink: 0; }
.sb-av-ring {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #06b6d4, #6366F1);
  z-index: 0;
}
.sb-av {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #0a1628;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
  overflow: hidden;
  letter-spacing: -0.01em;
  z-index: 1;
}
.sb-av img { width: 100%; height: 100%; object-fit: cover; }
.sb-av-status {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid #0a1628;
  z-index: 2;
  animation: sbPulse 2.4s ease-in-out infinite;
}
@keyframes sbPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
}

.sb-user-text { flex: 1; min-width: 0; }
.sb-user-name {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.sb-user-meta {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.50);
  margin-top: 1px;
  font-weight: 500;
}

.sb-logout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.62);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.005em;
  transition: all var(--duration-fast) var(--ease);
}
.sb-logout:hover {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.45);
  color: #FCA5A5;
}

@media (max-width: 1024px) {
  .sb {
    transform: translateX(-100%);
    box-shadow: var(--shadow-xl);
  }
  .sb--open { transform: translateX(0); }
  .sb-close { display: flex; }
}
	.sb-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 199;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

@media (max-width: 1024px) {
  .sb-overlay { display: block; }
}
`;

/* Backward compat for old pages */
export const SIDEBAR_CSS = '';
