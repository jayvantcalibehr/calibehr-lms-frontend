import { Component } from 'react';

/**
 * ErrorBoundary — catches any unhandled JS errors in the React tree.
 * Prevents blank white screen; shows a friendly error UI instead.
 *
 * Usage (already wrapped in main.jsx):
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for debugging — replace with Sentry/logging service if needed
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload() {
    window.location.reload();
  }

  handleGoHome() {
    window.location.href = '/dashboard';
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <>
        <style>{CSS}</style>
        <div className="eb-wrap">
          <div className="eb-card">
            <div className="eb-icon" aria-hidden="true">⚠️</div>
            <h1 className="eb-title">Something went wrong</h1>
            <p className="eb-sub">
              An unexpected error occurred. Reloading the page may resolve the issue.
            </p>

            {/* Show error message in dev mode only */}
            {import.meta.env.DEV && this.state.error && (
              <pre className="eb-detail">
                {this.state.error.message}
              </pre>
            )}

            <div className="eb-actions">
              <button className="eb-btn eb-btn--primary" onClick={this.handleReload}>
                🔄 Reload Page
              </button>
              <button className="eb-btn eb-btn--ghost" onClick={this.handleGoHome}>
                🏠 Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
}

const CSS = `
.eb-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg, #fafaf9);
  padding: 24px;
}
.eb-card {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 16px;
  padding: 48px 40px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}
.eb-icon {
  font-size: 48px;
  margin-bottom: 16px;
  line-height: 1;
}
.eb-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text, #0a1628);
  margin: 0 0 10px;
  letter-spacing: -0.03em;
}
.eb-sub {
  font-size: 14px;
  color: var(--text-2, #6b7280);
  line-height: 1.6;
  margin: 0 0 24px;
}
.eb-detail {
  background: var(--surface-2, #f5f5f4);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-2, #6b7280);
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 24px;
  max-height: 120px;
  overflow-y: auto;
}
.eb-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.eb-btn {
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: opacity 0.15s ease;
}
.eb-btn:hover { opacity: 0.85; }
.eb-btn--primary {
  background: #6366f1;
  color: #ffffff;
}
.eb-btn--ghost {
  background: var(--surface-2, #f5f5f4);
  color: var(--text, #0a1628);
  border: 1px solid var(--border, #e5e7eb);
}
`;
