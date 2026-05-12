import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RiMenuLine, RiSunLine, RiMoonLine, RiSearchLine, RiNotification3Line } from 'react-icons/ri';
import { useTheme } from '../theme/ThemeProvider';

const TITLES = {
  '/dashboard':   { title: 'Dashboard',   sub: 'Welcome back' },
  '/courses':     { title: 'Courses',     sub: 'Browse and enroll' },
  '/quiz':        { title: 'Quizzes',     sub: 'Test your knowledge' },
  '/interview':   { title: 'Interviews',  sub: 'Video assessments' },
  '/leaderboard': { title: 'Leaderboard', sub: 'Top performers' },
  '/reports':     { title: 'Reports',     sub: 'Insights and exports' },
  '/settings':    { title: 'Settings',    sub: 'Manage your account' },
};

function getPageInfo(pathname) {
  const keys = Object.keys(TITLES).sort((a, b) => b.length - a.length);
  for (const k of keys) if (pathname === k || pathname.startsWith(k + '/')) return TITLES[k];
  return { title: 'Calibehr', sub: '' };
}

export default function Topbar({ onMenuClick }) {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const { title, sub } = getPageInfo(location.pathname);

  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || ''));
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <header className="tb">
        <div className="tb-left">
          <button className="tb-menu" onClick={onMenuClick} aria-label="Open menu">
            <RiMenuLine size={18}/>
          </button>
          <div className="tb-titles">
            <h1 className="tb-title">{title}</h1>
            {sub && <p className="tb-sub">{sub}</p>}
          </div>
        </div>

        <div className="tb-right">
          {/* <button className="tb-search-btn" aria-label="Search (coming soon)" disabled>
            <RiSearchLine size={14}/>
            <span className="tb-search-text">Search</span>
            <kbd className="tb-kbd">{isMac ? '⌘' : 'Ctrl'}<span>K</span></kbd>
          </button> */}

          <button
            className="tb-icon-btn"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <RiSunLine size={16}/> : <RiMoonLine size={16}/>}
          </button>

          <button className="tb-icon-btn" aria-label="Notifications" disabled>
            <RiNotification3Line size={16}/>
          </button>
        </div>
      </header>
    </>
  );
}

const CSS = `
.tb {
  height: var(--topbar-h);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--s-6);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
}

.tb-left {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  min-width: 0;
}

.tb-menu {
  display: none;
  background: none;
  border: none;
  color: var(--text-2);
  padding: 7px;
  border-radius: var(--r-sm);
  align-items: center;
  transition: all var(--duration-fast) var(--ease);
}
.tb-menu:hover { background: var(--surface-2); color: var(--text); }

.tb-titles { min-width: 0; }
.tb-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.025em;
  color: var(--text);
  margin: 0;
  line-height: 1.05;
}
.tb-sub {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin: 1px 0 0;
  font-weight: 500;
  letter-spacing: -0.005em;
}

.tb-right {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.tb-search-btn {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 6px 10px 6px 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-3);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 500;
  transition: all var(--duration-fast) var(--ease);
  min-width: 220px;
}
.tb-search-btn:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-2);
  border-color: var(--border-strong);
}
.tb-search-btn:disabled { cursor: not-allowed; opacity: 0.7; }
.tb-search-text { flex: 1; text-align: left; }

.tb-kbd {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 2px 5px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  font-weight: 500;
}
.tb-kbd span { margin-left: 1px; }

.tb-icon-btn {
  width: 34px; height: 34px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-2);
  transition: all var(--duration-fast) var(--ease);
}
.tb-icon-btn:hover:not(:disabled) {
  background: var(--surface-2);
  color: var(--text);
  border-color: var(--border-strong);
}
.tb-icon-btn:disabled { cursor: not-allowed; opacity: 0.5; }

@media (max-width: 1024px) {
  .tb-menu { display: flex; }
  .tb { padding: 0 var(--s-4); }
  .tb-search-btn { display: none; }
}

@media (max-width: 640px) {
  .tb-titles .tb-sub { display: none; }
  .tb-title { font-size: 20px; }
}
`;
