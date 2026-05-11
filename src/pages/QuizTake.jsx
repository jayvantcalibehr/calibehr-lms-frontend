/**
 * ═════════════════════════════════════════════════════════════════
 *  QuizTake — Public quiz page (NO LOGIN REQUIRED)
 *  ─────────────────────────────────────────────────────────────────
 *  Mirrors old project's /ask/<quizID>?i=<inviteID> pattern.
 *
 *  URL:    /quiz-take/:inviteId
 *  Access: PUBLIC — opened from email invite link
 *  No app sidebar/topbar — fully standalone branded experience
 *
 *  Flow:
 *    1. Page loads → fetch quiz via GET /api/quiz/take/{inviteId}
 *    2. Show landing screen (start button + invite metadata)
 *    3. User clicks Start → questions load with timer
 *    4. User submits → POST /api/quiz/take/{inviteId}/submit
 *    5. Show result screen (passed/failed)
 *    6. Anti-replay: if invite already completed, show that state
 * ═════════════════════════════════════════════════════════════════ */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  RiCheckLine, RiCloseLine, RiTimerLine, RiAwardLine,
  RiAlertLine, RiInformationLine, RiShieldCheckLine, RiSendPlaneFill,
} from 'react-icons/ri';
import axios from 'axios';

/* Public API — no Authorization header attached */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const publicAPI = axios.create({ baseURL: API_BASE });

export default function QuizTake() {
  const { inviteId } = useParams();

  // -- Page state --
  const [stage,  setStage]  = useState('loading');   // loading | ready | running | submitted | error | completed
  const [error,  setError]  = useState(null);

  // -- Quiz data --
  const [quiz,      setQuiz]      = useState(null);
  const [questions, setQuestions] = useState([]);
  const [invite,    setInvite]    = useState(null);
  const [infoQs,    setInfoQs]    = useState([]);   // information questions before quiz
  const [infoAnswers, setInfoAnswers] = useState({});

  // -- Attempt state --
  const [answers,   setAnswers]   = useState({});
  const [timeLeft,  setTimeLeft]  = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -- Result state --
  const [result, setResult] = useState(null);

  // ─── Initial load ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await publicAPI.get(`/quiz/take/${inviteId}`);
        if (cancelled) return;

        const { code, data, message } = res.data;

        if (code === 1 && data?.status === 'ready') {
          setQuiz(data.quiz);
          setQuestions(data.questions || []);
          setInvite(data.invite);
          // fetch info questions
          try {
            const iRes = await publicAPI.get(`/quiz/info-questions`, { params: { quizID: data.quiz.id } });
            if (iRes.data.code === 1 && (iRes.data.data || []).length > 0) {
              setInfoQs(iRes.data.data);
              setStage('info'); // show info questions first
            } else {
              setStage('ready');
            }
          } catch {
            setStage('ready'); // fallback to ready if info fetch fails
          }
        } else if (code === 2) {
          setStage('completed');
          setError(message || 'You have already completed this quiz.');
        } else {
          setStage('error');
          setError(message || 'Quiz could not be loaded.');
        }
      } catch (err) {
        if (cancelled) return;
        setStage('error');
        setError(err.response?.data?.message || 'Unable to load quiz. Please check your link.');
      }
    })();
    return () => { cancelled = true; };
  }, [inviteId]);

  // ─── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'running' || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          submitQuiz(true);            // auto-submit on timeup
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stage, timeLeft]);

  // ─── Anti-cheat: count tab switches ───────────────────────────
  useEffect(() => {
    if (stage !== 'running') return;
    const onVis = () => {
      if (document.hidden) setTabSwitchCount(c => c + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [stage]);

  // ─── Submit ───────────────────────────────────────────────────
  const submitQuiz = useCallback(async (isTimeUp = false) => {
    if (submitting) return;
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const res = await publicAPI.post(`/quiz/take/${inviteId}/submit`, {
        answers,
        time_up:     isTimeUp ? 1 : 2,
        switch_tabs: tabSwitchCount > 3 ? 1 : 0,
      });
      const { code, data, message } = res.data;
      if (code === 1) {
        setResult(data);
        setStage('submitted');
      } else if (code === 2) {
        setStage('completed');
        setError(message || 'Already submitted.');
      } else {
        setStage('error');
        setError(message || 'Submission failed.');
      }
    } catch (err) {
      setStage('error');
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [inviteId, answers, tabSwitchCount, submitting]);

  // ─── Helpers ──────────────────────────────────────────────────
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const answered    = Object.keys(answers).length;
  const totalQs     = questions.length;
  const progressPct = totalQs ? Math.round((answered / totalQs) * 100) : 0;

  const handleStart = () => {
    setTimeLeft((quiz?.time ?? 30) * 60);
    setStage('running');
  };

  const selectAnswer = (qid, oid) => {
    setAnswers(prev => ({ ...prev, [qid]: oid }));
  };

  // ─── Render branches ──────────────────────────────────────────
  if (stage === 'loading') return <PageShell><Spinner label="Loading your quiz…" /></PageShell>;

  // stage === 'info' — information questions before quiz
  if (stage === 'info') return (
    <PageShell>
      <div className="qt-landing">
        <div className="qt-landing-icon"><RiInformationLine size={44}/></div>
        <h1 className="qt-landing-title">Before you begin</h1>
        <p className="qt-landing-desc">Please fill in the following information before starting the quiz.</p>
        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          {infoQs.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                {i + 1}. {q.question_text || q.question}
              </label>
              <input
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e7e5e4', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                value={infoAnswers[q.id] || ''}
                onChange={e => setInfoAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Your answer…"
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#e7e5e4'}
              />
            </div>
          ))}
        </div>
        <button className="qt-start-btn" onClick={() => setStage('ready')}>
          Continue to Quiz
        </button>
      </div>
      <Styles/>
    </PageShell>
  );

  if (stage === 'error') return (
    <PageShell>
      <ResultCard
        icon={<RiAlertLine size={36}/>}
        iconBg="#fee2e2"
        iconColor="#dc2626"
        title="Unable to load quiz"
        message={error}
        sub="Please contact the person who invited you for a fresh link."
      />
    </PageShell>
  );

  if (stage === 'completed') return (
    <PageShell>
      <ResultCard
        icon={<RiShieldCheckLine size={36}/>}
        iconBg="#dcfce7"
        iconColor="#16a34a"
        title="Already submitted"
        message={error || 'You have already completed this quiz.'}
        sub="Each invite link can be used only once."
      />
    </PageShell>
  );

  if (stage === 'submitted') {
    const passed = result?.passed;
    const showMarks = result?.show_marks;
    return (
      <PageShell>
        <ResultCard
          icon={passed ? <RiCheckLine size={36}/> : <RiAwardLine size={36}/>}
          iconBg={passed ? '#dcfce7' : '#fef3c7'}
          iconColor={passed ? '#16a34a' : '#d97706'}
          title={passed ? 'Quiz Passed!' : 'Quiz Submitted'}
          message={
            showMarks
              ? `You scored ${result.percentage}% — ${result.correct} of ${result.total_qs} correct.`
              : 'Thank you for completing the quiz. Your responses have been recorded.'
          }
          sub={showMarks && passed ? 'Great work!' : showMarks ? `Passing score: ${quiz.passing_percentage}%` : null}
        />
      </PageShell>
    );
  }

  // stage === 'ready' — landing page
  if (stage === 'ready') return (
    <PageShell>
      <div className="qt-landing">
        <div className="qt-landing-icon">
          <RiAwardLine size={44}/>
        </div>
        <h1 className="qt-landing-title">{quiz.name}</h1>
        {quiz.description && <p className="qt-landing-desc">{quiz.description}</p>}

        <div className="qt-meta-grid">
          <Meta label="Questions"  value={totalQs} />
          <Meta label="Time"       value={quiz.time > 0 ? `${quiz.time} min` : 'No limit'} />
          <Meta label="Pass score" value={`${quiz.passing_percentage}%`} />
        </div>

        <div className="qt-rules">
          <div className="qt-rules-title">Before you start</div>
          <ul>
            <li>Answer all questions to the best of your ability</li>
            {quiz.time > 0 && <li>Quiz has a time limit of <strong>{quiz.time} minutes</strong></li>}
            <li>Avoid switching tabs — it may be flagged</li>
            <li>You can only submit this quiz <strong>once</strong></li>
          </ul>
        </div>

        <button className="qt-start-btn" onClick={handleStart}>
          Start Quiz
        </button>

        <p className="qt-invite-info">
          Invited as: <strong>{invite?.email}</strong>
        </p>
      </div>
      <Styles />
    </PageShell>
  );

  // stage === 'running' — quiz in progress
  return (
    <PageShell>
      {/* Sticky header with timer + progress */}
      <header className="qt-header">
        <div className="qt-header-inner">
          <div className="qt-header-title">{quiz.name}</div>
          <div className="qt-header-stats">
            {quiz.time > 0 && (
              <div className={`qt-timer ${timeLeft < 60 ? 'qt-timer--danger' : ''}`}>
                <RiTimerLine size={16}/> {fmt(timeLeft)}
              </div>
            )}
            <div className="qt-progress-stat">
              {answered}/{totalQs}
            </div>
          </div>
        </div>
        <div className="qt-progress-bar">
          <div className="qt-progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      {tabSwitchCount > 3 && (
        <div className="qt-warning">
          <RiAlertLine size={16}/>
          You've switched tabs {tabSwitchCount} times — please stay on this page until done.
        </div>
      )}

      <main className="qt-questions">
        {questions.map((q, idx) => (
          <article key={q.id} className="qt-q">
            <div className="qt-q-num">Question {idx + 1} of {totalQs}</div>
            <h3 className="qt-q-text">{q.question}</h3>
            <div className="qt-q-options">
              {q.options.map(opt => (
                <label
                  key={opt.id}
                  className={`qt-opt ${answers[q.id] === opt.id ? 'qt-opt--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt.id}
                    onChange={() => selectAnswer(q.id, opt.id)}
                  />
                  <span className="qt-opt-text">{opt.option}</span>
                </label>
              ))}
            </div>
          </article>
        ))}

        <div className="qt-submit-section">
          <div className="qt-submit-summary">
            {answered === totalQs
              ? '✓ All questions answered'
              : `${totalQs - answered} question${totalQs - answered > 1 ? 's' : ''} unanswered`}
          </div>
          <button
            className="qt-submit-btn"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
          >
            <RiSendPlaneFill size={16}/> Submit Quiz
          </button>
        </div>
      </main>

      {/* Confirm modal */}
      {confirmOpen && (
        <ConfirmModal
          unanswered={totalQs - answered}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => submitQuiz(false)}
          submitting={submitting}
        />
      )}

      <Styles />
    </PageShell>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

function PageShell({ children }) {
  return (
    <div className="qt-page">
      <div className="qt-brand">
        <div className="qt-brand-logo">📝</div>
        <div className="qt-brand-name">Calibehr Learning</div>
      </div>
      {children}
      <Styles />
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div className="qt-spinner-wrap">
      <div className="qt-spinner" />
      <p className="qt-spinner-label">{label}</p>
    </div>
  );
}

function ResultCard({ icon, iconBg, iconColor, title, message, sub }) {
  return (
    <div className="qt-result">
      <div className="qt-result-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <h1 className="qt-result-title">{title}</h1>
      <p className="qt-result-msg">{message}</p>
      {sub && <p className="qt-result-sub">{sub}</p>}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="qt-meta">
      <div className="qt-meta-value">{value}</div>
      <div className="qt-meta-label">{label}</div>
    </div>
  );
}

function ConfirmModal({ unanswered, onCancel, onConfirm, submitting }) {
  return (
    <div className="qt-modal-backdrop" onClick={onCancel}>
      <div className="qt-modal" onClick={e => e.stopPropagation()}>
        <div className="qt-modal-icon"><RiInformationLine size={28}/></div>
        <h3 className="qt-modal-title">Submit your quiz?</h3>
        <p className="qt-modal-msg">
          {unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Once submitted, you cannot change your answers.`
            : 'Once submitted, you cannot change your answers.'}
        </p>
        <div className="qt-modal-actions">
          <button className="qt-modal-btn qt-modal-btn--ghost" onClick={onCancel} disabled={submitting}>
            Review answers
          </button>
          <button className="qt-modal-btn qt-modal-btn--primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Yes, submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Styles (scoped) ═══════════════ */

function Styles() {
  return (
    <style>{`
      .qt-page {
        min-height: 100vh;
        background: linear-gradient(180deg, #fafaf9 0%, #f4f4f3 100%);
        font-family: 'Geist', 'Inter', -apple-system, sans-serif;
        color: #0a0a0b;
        padding: 0;
      }
      .qt-brand {
        display: flex; align-items: center; gap: 10px;
        padding: 20px 32px;
        border-bottom: 1px solid #e7e5e4;
        background: #fff;
        position: sticky; top: 0; z-index: 10;
      }
      .qt-brand-logo { font-size: 22px; }
      .qt-brand-name {
        font-size: 16px; font-weight: 600; letter-spacing: -0.01em;
        color: #10b981;
      }

      /* ── Spinner ── */
      .qt-spinner-wrap {
        max-width: 600px; margin: 80px auto;
        text-align: center; padding: 0 20px;
      }
      .qt-spinner {
        width: 36px; height: 36px;
        border: 3px solid #e7e5e4; border-top-color: #10b981;
        border-radius: 50%;
        margin: 0 auto 16px;
        animation: qt-spin 0.8s linear infinite;
      }
      @keyframes qt-spin { to { transform: rotate(360deg); } }
      .qt-spinner-label { color: #57534e; font-size: 14px; margin: 0; }

      /* ── Landing ── */
      .qt-landing {
        max-width: 640px; margin: 60px auto;
        background: #fff; border-radius: 16px;
        border: 1px solid #e7e5e4;
        padding: 48px 40px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .qt-landing-icon {
        width: 80px; height: 80px;
        margin: 0 auto 24px;
        background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
        color: #fff;
        border-radius: 18px;
        display: grid; place-items: center;
        box-shadow: 0 8px 16px rgba(16, 185, 129, 0.25);
      }
      .qt-landing-title {
        font-size: 28px; font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0 0 8px;
      }
      .qt-landing-desc {
        color: #57534e; font-size: 15px;
        margin: 0 0 32px; line-height: 1.6;
      }
      .qt-meta-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 16px; margin-bottom: 32px;
      }
      .qt-meta {
        background: #fafaf9; border-radius: 10px;
        padding: 16px 12px; border: 1px solid #e7e5e4;
      }
      .qt-meta-value {
        font-size: 22px; font-weight: 700;
        color: #0a0a0b;
      }
      .qt-meta-label {
        font-size: 11px; color: #78716c;
        text-transform: uppercase; letter-spacing: 0.05em;
        margin-top: 4px;
      }
      .qt-rules {
        background: #f0fdf4; border: 1px solid #bbf7d0;
        border-radius: 10px;
        padding: 16px 20px; margin-bottom: 32px;
        text-align: left;
      }
      .qt-rules-title {
        font-size: 13px; font-weight: 600;
        color: #15803d; text-transform: uppercase;
        letter-spacing: 0.04em; margin-bottom: 10px;
      }
      .qt-rules ul {
        margin: 0; padding-left: 20px;
        color: #166534; font-size: 13px; line-height: 1.8;
      }
      .qt-rules ul li::marker { color: #10b981; }
      .qt-start-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #fff; border: none;
        padding: 14px 36px; font-size: 16px; font-weight: 600;
        border-radius: 10px; cursor: pointer;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .qt-start-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
      }
      .qt-invite-info {
        margin-top: 20px; font-size: 12px; color: #78716c;
      }

      /* ── Running stage header ── */
      .qt-header {
        position: sticky; top: 60px; z-index: 9;
        background: #fff;
        border-bottom: 1px solid #e7e5e4;
      }
      .qt-header-inner {
        max-width: 760px; margin: 0 auto;
        padding: 16px 24px;
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
      }
      .qt-header-title {
        font-size: 15px; font-weight: 600;
        letter-spacing: -0.01em;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .qt-header-stats {
        display: flex; align-items: center; gap: 12px;
      }
      .qt-timer {
        display: inline-flex; align-items: center; gap: 6px;
        background: #f0fdf4; color: #15803d;
        border: 1px solid #bbf7d0;
        padding: 6px 12px; border-radius: 8px;
        font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px;
      }
      .qt-timer--danger {
        background: #fef2f2; color: #dc2626; border-color: #fecaca;
        animation: qt-pulse 1s ease-in-out infinite alternate;
      }
      @keyframes qt-pulse {
        from { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.3); }
        to   { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
      }
      .qt-progress-stat {
        font-size: 13px; color: #57534e;
        font-variant-numeric: tabular-nums;
      }
      .qt-progress-bar {
        height: 3px; background: #e7e5e4;
      }
      .qt-progress-bar-fill {
        height: 100%; background: linear-gradient(90deg, #10b981, #34d399);
        transition: width 0.3s ease;
      }

      .qt-warning {
        max-width: 760px; margin: 16px auto;
        padding: 10px 16px; border-radius: 8px;
        background: #fef3c7; color: #92400e;
        border: 1px solid #fde68a;
        display: flex; align-items: center; gap: 8px;
        font-size: 13px;
      }

      /* ── Questions ── */
      .qt-questions {
        max-width: 760px; margin: 24px auto 80px;
        padding: 0 24px;
      }
      .qt-q {
        background: #fff; border: 1px solid #e7e5e4;
        border-radius: 12px;
        padding: 24px; margin-bottom: 16px;
      }
      .qt-q-num {
        font-size: 11px; color: #78716c;
        text-transform: uppercase; letter-spacing: 0.05em;
        font-weight: 600; margin-bottom: 8px;
      }
      .qt-q-text {
        font-size: 16px; font-weight: 600; line-height: 1.5;
        margin: 0 0 18px;
      }
      .qt-q-options {
        display: flex; flex-direction: column; gap: 8px;
      }
      .qt-opt {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 16px;
        background: #fafaf9; border: 1.5px solid #e7e5e4;
        border-radius: 10px;
        cursor: pointer; transition: all 0.15s;
      }
      .qt-opt:hover {
        background: #f5f5f4;
        border-color: #d6d3d1;
      }
      .qt-opt--selected {
        background: #f0fdf4 !important;
        border-color: #10b981 !important;
      }
      .qt-opt input[type="radio"] {
        accent-color: #10b981;
        width: 16px; height: 16px;
        cursor: pointer;
      }
      .qt-opt-text {
        font-size: 14px; flex: 1;
      }

      /* ── Submit section ── */
      .qt-submit-section {
        background: #fff; border: 1px solid #e7e5e4;
        border-radius: 12px;
        padding: 20px 24px; margin-top: 24px;
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
      }
      .qt-submit-summary {
        font-size: 14px; color: #57534e;
      }
      .qt-submit-btn {
        background: #0a0a0b; color: #fff;
        border: none; padding: 12px 24px;
        font-size: 14px; font-weight: 600;
        border-radius: 10px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 8px;
        transition: transform 0.15s, opacity 0.15s;
      }
      .qt-submit-btn:hover { transform: translateY(-1px); }
      .qt-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

      /* ── Result ── */
      .qt-result {
        max-width: 600px; margin: 80px auto;
        background: #fff; border-radius: 16px;
        border: 1px solid #e7e5e4;
        padding: 56px 40px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .qt-result-icon {
        width: 80px; height: 80px;
        margin: 0 auto 24px;
        border-radius: 50%;
        display: grid; place-items: center;
      }
      .qt-result-title {
        font-size: 28px; font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0 0 12px;
      }
      .qt-result-msg {
        color: #44403c; font-size: 16px;
        margin: 0 0 8px; line-height: 1.6;
      }
      .qt-result-sub {
        color: #78716c; font-size: 14px;
        margin: 0;
      }

      /* ── Modal ── */
      .qt-modal-backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        z-index: 100;
        display: grid; place-items: center;
        padding: 20px;
      }
      .qt-modal {
        background: #fff; border-radius: 16px;
        max-width: 440px; width: 100%;
        padding: 32px;
        text-align: center;
        animation: qt-modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes qt-modal-in {
        from { transform: scale(0.9); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }
      .qt-modal-icon {
        width: 56px; height: 56px;
        margin: 0 auto 16px;
        background: #fef3c7; color: #d97706;
        border-radius: 50%;
        display: grid; place-items: center;
      }
      .qt-modal-title {
        font-size: 18px; font-weight: 700;
        margin: 0 0 8px;
      }
      .qt-modal-msg {
        color: #57534e; font-size: 14px;
        margin: 0 0 24px; line-height: 1.6;
      }
      .qt-modal-actions {
        display: flex; gap: 8px; justify-content: center;
      }
      .qt-modal-btn {
        padding: 10px 20px;
        font-size: 14px; font-weight: 600;
        border-radius: 8px; cursor: pointer;
        border: none;
      }
      .qt-modal-btn--ghost {
        background: transparent; color: #57534e;
        border: 1px solid #d6d3d1;
      }
      .qt-modal-btn--ghost:hover { background: #fafaf9; }
      .qt-modal-btn--primary {
        background: #10b981; color: #fff;
      }
      .qt-modal-btn--primary:hover { background: #059669; }
      .qt-modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }

      /* Mobile */
      @media (max-width: 640px) {
        .qt-brand { padding: 14px 20px; }
        .qt-landing { padding: 32px 24px; margin: 32px auto; }
        .qt-landing-title { font-size: 22px; }
        .qt-meta-grid { gap: 8px; }
        .qt-meta { padding: 12px 8px; }
        .qt-meta-value { font-size: 18px; }
        .qt-questions { padding: 0 16px; margin: 16px auto 60px; }
        .qt-q { padding: 18px; }
        .qt-submit-section { flex-direction: column; align-items: stretch; }
        .qt-submit-btn { justify-content: center; }
        .qt-result { padding: 40px 24px; margin: 32px auto; }
      }
    `}</style>
  );
}
