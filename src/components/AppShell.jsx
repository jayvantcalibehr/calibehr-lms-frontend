import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * AppShell — single layout for all authenticated pages.
 * Children render inside the main content area.
 *
 * Usage:
 *   <AppShell>
 *     <YourPage />
 *   </AppShell>
 */
export default function AppShell({ children, fullBleed = false }) {
  const [sideOpen, setSideOpen] = useState(false);

  /* Close sidebar on resize to desktop */
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 1024) setSideOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* Lock body scroll when mobile sidebar is open */
  useEffect(() => {
    document.body.style.overflow = sideOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sideOpen]);

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />

        {sideOpen && (
          <div
            className="shell-overlay"
            onClick={() => setSideOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="shell-main">
          <Topbar onMenuClick={() => setSideOpen(true)} />
          <main className={`shell-content ${fullBleed ? 'shell-content--full' : ''}`}>
            <div className={fullBleed ? '' : 'shell-container'}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

const CSS = `
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.shell-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 199;
  animation: shellFade var(--duration) var(--ease);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}
@keyframes shellFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.shell-main {
  flex: 1;
  margin-left: var(--sidebar-w);
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.shell-content {
  flex: 1;
  padding: var(--s-7) var(--s-7);
  animation: shellContentIn var(--duration-slow) var(--ease-out);
}
.shell-content--full { padding: 0; }

.shell-container {
  max-width: var(--content-max);
  margin: 0 auto;
}

@keyframes shellContentIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .shell-main { margin-left: 0; }
  .shell-content { padding: var(--s-5) var(--s-4); }
}

@media (max-width: 640px) {
  .shell-content { padding: var(--s-4) var(--s-3); }
}
`;
