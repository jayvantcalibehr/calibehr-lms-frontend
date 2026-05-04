import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiBookOpenLine, RiAwardLine, RiTimeLine, RiCheckboxCircleLine,
  RiBarChartBoxLine, RiVideoLine, RiTrophyLine, RiArrowRightSLine,
  RiTrophyFill, RiMedalFill, RiStarFill, RiFireFill,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user,        setUser]        = useState(null);
  const [stats,       setStats]       = useState({ assigned: 0, completed: 0, inProgress: 0 });
  const [courses,     setCourses]     = useState([]);
  const [topWinners,  setTopWinners]  = useState([]);
  const [myRank,      setMyRank]      = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    loadData();
  }, []);

  const loadData = async () => {
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      /* Parallel fetch — courses + leaderboard for top 3 */
      const [coursesRes, lbRes] = await Promise.all([
        API.get('/Webservice/getMycoursesInprogress').catch(() => ({ data: { code: 0 } })),
        API.get('/Webservice/getLeaderBoardWS').catch(() => ({ data: { code: 0 } })),
      ]);

      if (coursesRes.data.code === 1) {
        const list = coursesRes.data.data || [];
        setCourses(list.slice(0, 5));
        setStats({
          assigned:   list.length,
          completed:  list.filter(c => c.completed).length,
          inProgress: list.filter(c => !c.completed).length,
        });
      }

      if (lbRes.data.code === 1) {
        const board = lbRes.data.data || [];
        setTopWinners(board.slice(0, 3));
        const idx = board.findIndex(d => d.emp_code === me.emp_code);
        if (idx >= 0) setMyRank(idx + 1);
      }
    } catch { /* empty state */ }
    setLoading(false);
  };

  const firstName     = user?.emp_first_name || user?.name?.split(' ')[0] || 'User';
  const completionPct = stats.assigned ? Math.round((stats.completed / stats.assigned) * 100) : 0;

  /* Stats tiles */
  const STATS = [
    { Icon: RiBookOpenLine,         label: 'Courses assigned',  value: stats.assigned,      c1: '#6366F1', c2: '#8B5CF6', glow: 'rgba(99,102,241,0.30)' },
    { Icon: RiCheckboxCircleLine,   label: 'Completed',         value: stats.completed,     c1: '#10B981', c2: '#059669', glow: 'rgba(16,185,129,0.30)' },
    { Icon: RiTimeLine,             label: 'In progress',       value: stats.inProgress,    c1: '#F59E0B', c2: '#EF4444', glow: 'rgba(245,158,11,0.30)' },
    { Icon: RiBarChartBoxLine,      label: 'Completion rate',   value: completionPct + '%', c1: '#06B6D4', c2: '#0EA5E9', glow: 'rgba(14,165,233,0.30)' },
  ];

  /* Quick actions */
  const QUICK = [
    { Icon: RiBookOpenLine, label: 'Browse Courses', sub: 'Explore catalog',     path: '/courses',     c1: '#6366F1', c2: '#8B5CF6' },
    { Icon: RiAwardLine,    label: 'Take a Quiz',    sub: 'Test your knowledge', path: '/quiz',        c1: '#10B981', c2: '#059669' },
    { Icon: RiVideoLine,    label: 'Interview Prep', sub: 'Practice rounds',     path: '/interview',   c1: '#EC4899', c2: '#F43F5E' },
    { Icon: RiTrophyLine,   label: 'Leaderboard',    sub: 'See your rank',       path: '/leaderboard', c1: '#FBBF24', c2: '#F59E0B' },
  ];

  /* Time-aware greeting */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /* Podium config — gold / silver / bronze */
  const PODIUM = [
    { rank: 1, label: '1st', icon: RiTrophyFill, c1: '#FBBF24', c2: '#F59E0B', shadow: 'rgba(245,158,11,0.45)' },
    { rank: 2, label: '2nd', icon: RiMedalFill,  c1: '#CBD5E1', c2: '#94A3B8', shadow: 'rgba(148,163,184,0.40)' },
    { rank: 3, label: '3rd', icon: RiMedalFill,  c1: '#FB923C', c2: '#EA580C', shadow: 'rgba(234,88,12,0.40)' },
  ];

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* ── Hero greeting ── */}
      <header className="dh-hero">
        <div className="dh-hero-glow" aria-hidden="true"/>
        <div className="dh-hero-content">
          <div className="dh-eyebrow">{greeting}</div>
          <h1 className="dh-title">{firstName}.</h1>
          <p className="dh-sub">
            {stats.assigned === 0
              ? "Let's begin your learning journey today."
              : `You have ${stats.inProgress} ${stats.inProgress === 1 ? 'course' : 'courses'} in progress · ${completionPct}% complete overall.`
            }
          </p>
        </div>
        {myRank && (
          <div className="dh-myrank">
            <div className="dh-myrank-label">Your rank</div>
            <div className="dh-myrank-value">#{myRank}</div>
            <button className="dh-myrank-link" onClick={() => navigate('/leaderboard')}>
              View board <RiArrowRightSLine size={13}/>
            </button>
          </div>
        )}
      </header>

      {/* ── Stats grid ── */}
      <section className="dh-stats">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="dh-stat"
            style={{ '--c1': s.c1, '--c2': s.c2, '--glow': s.glow, animationDelay: `${i * 60}ms` }}
          >
            <div className="dh-stat-icon">
              <span className="dh-stat-icon-bg"/>
              <s.Icon size={16}/>
            </div>
            <div className="dh-stat-value">{s.value ?? '—'}</div>
            <div className="dh-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── 3-column main grid ── */}
      <section className="dh-grid">
        {/* My Courses */}
        <article className="dh-card dh-card--wide">
          <header className="dh-card-head">
            <div>
              <h2 className="dh-card-title">My courses</h2>
              <p className="dh-card-sub">Your active learning</p>
            </div>
            <button className="dh-card-link" onClick={() => navigate('/courses')}>
              View all <RiArrowRightSLine size={14}/>
            </button>
          </header>

          {loading ? (
            <div className="dh-empty">Loading your courses…</div>
          ) : courses.length === 0 ? (
            <div className="dh-empty">
              <div className="dh-empty-icon"><RiBookOpenLine size={20}/></div>
              <div>No courses assigned yet.</div>
              <button className="dh-empty-cta" onClick={() => navigate('/courses')}>
                Browse catalog <RiArrowRightSLine size={12}/>
              </button>
            </div>
          ) : (
            <ul className="dh-course-list">
              {courses.map((c, i) => {
                const pct      = c.completed ? 100 : Math.round(c.progress_percentage ?? 0);
                const isDone   = c.completed;
                return (
                  <li key={i} className="dh-course" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="dh-course-name">{c.course_name || c.name || 'Course'}</div>
                    <div className="dh-course-row">
                      <div className="dh-progress">
                        <div
                          className="dh-progress-fill"
                          style={{
                            width: pct + '%',
                            background: isDone
                              ? 'linear-gradient(90deg, #10B981, #059669)'
                              : 'linear-gradient(90deg, #F59E0B, #EF4444)',
                          }}
                        />
                      </div>
                      <span className="dh-course-pct">{pct}%</span>
                      <span className={`dh-pill ${isDone ? 'dh-pill--done' : 'dh-pill--prog'}`}>
                        {isDone ? 'Done' : 'In progress'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        {/* ── Top 3 Winners ── NEW WIDGET */}
        <article className="dh-card dh-card--podium">
          <header className="dh-card-head">
            <div>
              <h2 className="dh-card-title">
                Top performers
                <RiFireFill size={14} className="dh-fire"/>
              </h2>
              <p className="dh-card-sub">This month's leaders</p>
            </div>
            <button className="dh-card-link" onClick={() => navigate('/leaderboard')}>
              View all <RiArrowRightSLine size={14}/>
            </button>
          </header>

          {loading ? (
            <div className="dh-empty">Loading…</div>
          ) : topWinners.length === 0 ? (
            <div className="dh-empty">
              <div className="dh-empty-icon"><RiTrophyLine size={20}/></div>
              <div>No leaders yet</div>
              <p className="dh-empty-msg">Be the first to earn points!</p>
            </div>
          ) : (
            <ol className="dh-podium">
              {topWinners.map((w, i) => {
                const cfg = PODIUM[i] || PODIUM[2];
                const initials = (w.name || w.emp_first_name || '?')
                  .split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <li
                    key={w.id || w.userID || i}
                    className={`dh-winner dh-winner--${cfg.rank}`}
                    style={{ '--c1': cfg.c1, '--c2': cfg.c2, '--shadow': cfg.shadow, animationDelay: `${i * 80}ms` }}
                  >
                    <div className="dh-winner-rank">
                      <cfg.icon size={cfg.rank === 1 ? 16 : 13}/>
                      <span>{cfg.label}</span>
                    </div>
                    <div className="dh-winner-avatar">
                      <div className="dh-winner-avatar-ring"/>
                      <div className="dh-winner-avatar-inner">
                        {w.emp_photo
                          ? <img src={w.emp_photo} alt=""/>
                          : <span>{initials}</span>}
                      </div>
                      {cfg.rank === 1 && <div className="dh-winner-crown" aria-hidden="true">👑</div>}
                    </div>
                    <div className="dh-winner-info">
                      <div className="dh-winner-name">
                        {w.name || `${w.emp_first_name || ''} ${w.emp_last_name || ''}`.trim() || w.emp_code}
                      </div>
                      <div className="dh-winner-meta">
                        {w.emp_department || w.empClient || 'Calibehr'}
                      </div>
                    </div>
                    <div className="dh-winner-points">
                      <RiStarFill size={11}/>
                      <span>{w.points ?? w.total_points ?? 0}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </article>

        {/* Quick actions — moved into row 2 */}
        <article className="dh-card dh-card--wide">
          <header className="dh-card-head">
            <div>
              <h2 className="dh-card-title">Quick actions</h2>
              <p className="dh-card-sub">Jump back in</p>
            </div>
          </header>

          <ul className="dh-qa-list">
            {QUICK.map((q, i) => (
              <li key={q.label} style={{ animationDelay: `${i * 50}ms` }}>
                <button
                  className="dh-qa"
                  onClick={() => navigate(q.path)}
                  style={{ '--c1': q.c1, '--c2': q.c2 }}
                >
                  <span className="dh-qa-icon">
                    <span className="dh-qa-icon-bg"/>
                    <q.Icon size={15}/>
                  </span>
                  <div className="dh-qa-text">
                    <div className="dh-qa-label">{q.label}</div>
                    <div className="dh-qa-sub">{q.sub}</div>
                  </div>
                  <RiArrowRightSLine size={16} className="dh-qa-arrow"/>
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </AppShell>
  );
}

const CSS = `
/* ── Hero ── */
.dh-hero {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-4);
  margin-bottom: var(--s-7);
  padding: var(--s-5) var(--s-5) var(--s-5) 0;
  animation: dhFadeUp 600ms var(--ease-out);
  flex-wrap: wrap;
}
.dh-hero-glow {
  position: absolute;
  top: -40px;
  left: -40px;
  width: 320px;
  height: 220px;
  background: radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%);
  pointer-events: none;
  filter: blur(20px);
  z-index: 0;
}
.dh-hero-content { position: relative; z-index: 1; flex: 1; min-width: 240px; }
.dh-eyebrow {
  font-size: var(--text-sm); color: var(--text-3); font-weight: 500;
  letter-spacing: -0.005em; margin-bottom: 6px;
}
.dh-title {
  font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 400;
  letter-spacing: -0.03em; color: var(--text); margin: 0 0 8px; line-height: 1;
}
.dh-sub { font-size: var(--text-md); color: var(--text-2); margin: 0; line-height: 1.5; max-width: 540px; }

.dh-myrank {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
  padding: var(--s-3) var(--s-4);
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface)), var(--surface));
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm), inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
}
.dh-myrank-label { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
.dh-myrank-value {
  font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400;
  color: var(--accent); letter-spacing: -0.025em; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.dh-myrank-link {
  display: inline-flex; align-items: center; gap: 3px;
  background: transparent; border: none; padding: 0;
  font-family: inherit; font-size: 11px; font-weight: 600;
  color: var(--text-3); cursor: pointer;
  transition: color var(--duration-fast) var(--ease);
}
.dh-myrank-link:hover { color: var(--accent); }

/* ── Stats grid ── */
.dh-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: var(--s-3); margin-bottom: var(--s-5);
}
.dh-stat {
  background: var(--surface); border-radius: var(--r-md); padding: var(--s-4);
  box-shadow: var(--shadow-sm), var(--ring);
  position: relative; overflow: hidden;
  opacity: 0; animation: dhFadeUp 500ms var(--ease-out) forwards;
  transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
}
.dh-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md), var(--ring); }
.dh-stat::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--c1), var(--c2));
}
.dh-stat-icon {
  position: relative; width: 32px; height: 32px; border-radius: 9px;
  display: grid; place-items: center; color: #fff; margin-bottom: var(--s-2);
}
.dh-stat-icon-bg {
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  box-shadow: 0 4px 12px var(--glow);
}
.dh-stat-icon > svg { position: relative; z-index: 1; }
.dh-stat-value {
  font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400;
  letter-spacing: -0.025em; color: var(--text); line-height: 1;
  font-variant-numeric: tabular-nums; margin-bottom: 4px;
}
.dh-stat-label { font-size: var(--text-xs); color: var(--text-3); font-weight: 500; }

/* ── Main grid (3-col) ── */
.dh-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--s-4);
}
.dh-card {
  background: var(--surface); border-radius: var(--r-lg); padding: var(--s-5);
  box-shadow: var(--shadow-sm), var(--ring);
  animation: dhFadeUp 500ms var(--ease-out) 200ms both;
}
.dh-card--wide { /* default 1.4fr */ }
.dh-card--podium {
  background: linear-gradient(135deg, var(--surface), color-mix(in srgb, #FBBF24 4%, var(--surface)));
}

/* Quick actions (third card) takes full row 2 */
.dh-card:nth-child(3) { grid-column: 1 / -1; }

.dh-card-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: var(--s-3); margin-bottom: var(--s-4);
}
.dh-card-title {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400;
  letter-spacing: -0.025em; color: var(--text); margin: 0; line-height: 1.1;
}
.dh-fire { color: #F59E0B; animation: dhFire 1.6s ease-in-out infinite; }
@keyframes dhFire {
  0%, 100% { transform: scale(1) rotate(-3deg); }
  50%      { transform: scale(1.08) rotate(3deg); }
}
.dh-card-sub { font-size: var(--text-xs); color: var(--text-3); margin: 4px 0 0; font-weight: 500; }
.dh-card-link {
  display: inline-flex; align-items: center; gap: 3px;
  background: transparent; border: none; padding: 0;
  font-family: inherit; font-size: var(--text-xs); font-weight: 600;
  color: var(--accent); cursor: pointer; letter-spacing: -0.005em;
  transition: gap var(--duration-fast) var(--ease);
}
.dh-card-link:hover { gap: 6px; }

/* ── Empty / loading ── */
.dh-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: var(--s-7) var(--s-3);
  color: var(--text-3); font-size: var(--text-sm); text-align: center;
}
.dh-empty-icon {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent);
  display: grid; place-items: center;
}
.dh-empty-msg { margin: 0; font-size: var(--text-xs); color: var(--text-3); }
.dh-empty-cta {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; background: var(--accent); color: var(--accent-text);
  border: none; border-radius: var(--r-md);
  font-family: inherit; font-size: var(--text-xs); font-weight: 600;
  cursor: pointer; margin-top: 4px;
  transition: all var(--duration-fast) var(--ease);
}
.dh-empty-cta:hover { background: var(--accent-hover); transform: translateY(-1px); }

/* ── Course list ── */
.dh-course-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.dh-course {
  padding: 10px 12px; background: var(--surface-2); border-radius: var(--r-sm);
  opacity: 0; animation: dhFadeUp 400ms var(--ease-out) forwards;
}
.dh-course-name {
  font-size: var(--text-base); font-weight: 600; color: var(--text);
  letter-spacing: -0.005em; margin-bottom: 6px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dh-course-row { display: flex; align-items: center; gap: 10px; }
.dh-progress { flex: 1; height: 5px; background: var(--surface-3); border-radius: 99px; overflow: hidden; }
.dh-progress-fill { height: 100%; transition: width 600ms var(--ease-out); }
.dh-course-pct {
  font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums;
  color: var(--text-2); min-width: 32px; text-align: right;
}
.dh-pill {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px;
  letter-spacing: 0.02em; flex-shrink: 0;
}
.dh-pill--done { background: var(--success-soft); color: var(--success); }
.dh-pill--prog { background: var(--warning-soft); color: var(--warning); }

/* ═══ TOP 3 PODIUM WIDGET ═══ */
.dh-podium { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.dh-winner {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; background: var(--surface-2);
  border-radius: var(--r-md);
  position: relative; overflow: hidden;
  opacity: 0; animation: dhFadeUp 500ms var(--ease-out) forwards;
  transition: transform var(--duration) var(--ease);
}
.dh-winner:hover { transform: translateX(2px); }
.dh-winner::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--c1), var(--c2));
  border-radius: 0 2px 2px 0;
}
.dh-winner--1 {
  background: linear-gradient(135deg,
    color-mix(in srgb, #FBBF24 10%, var(--surface-2)),
    color-mix(in srgb, #F59E0B 4%, var(--surface-2)));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #FBBF24 24%, transparent);
}

.dh-winner-rank {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  width: 32px; flex-shrink: 0;
  color: var(--c1);
}
.dh-winner-rank > svg { filter: drop-shadow(0 2px 4px var(--shadow)); }
.dh-winner-rank > span {
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--c1); text-transform: uppercase;
}

.dh-winner-avatar { position: relative; width: 36px; height: 36px; flex-shrink: 0; }
.dh-winner-avatar-ring {
  position: absolute; inset: -2px; border-radius: 50%;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  z-index: 0;
}
.dh-winner-avatar-inner {
  position: absolute; inset: 0; border-radius: 50%;
  background: var(--bg);
  color: var(--text); display: grid; place-items: center;
  font-weight: 700; font-size: 13px;
  overflow: hidden; letter-spacing: -0.01em; z-index: 1;
}
.dh-winner-avatar-inner img { width: 100%; height: 100%; object-fit: cover; }
.dh-winner-crown {
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%) rotate(-8deg);
  font-size: 14px; z-index: 2; line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(245,158,11,0.5));
}

.dh-winner-info { flex: 1; min-width: 0; }
.dh-winner-name {
  font-size: var(--text-base); font-weight: 600; color: var(--text);
  letter-spacing: -0.005em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dh-winner-meta {
  font-size: 11px; color: var(--text-3); font-weight: 500; margin-top: 1px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.dh-winner-points {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 99px;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  color: #fff; font-size: 11px; font-weight: 700;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 8px var(--shadow);
  flex-shrink: 0;
}
.dh-winner-points > svg { filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3)); }

/* ── Quick actions ── */
.dh-qa-list {
  list-style: none; padding: 0; margin: 0;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.dh-qa {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 12px; background: var(--surface-2);
  border: 1px solid transparent; border-radius: var(--r-md);
  font-family: inherit; cursor: pointer; text-align: left;
  transition: all var(--duration) var(--ease);
}
.dh-qa:hover {
  background: var(--surface);
  border-color: color-mix(in srgb, var(--c1) 25%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--c1) 18%, transparent);
}
.dh-qa-icon {
  position: relative; width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center; color: #fff; flex-shrink: 0;
}
.dh-qa-icon-bg {
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(135deg, var(--c1), var(--c2));
}
.dh-qa-icon > svg { position: relative; z-index: 1; }
.dh-qa-text { flex: 1; min-width: 0; }
.dh-qa-label { font-size: var(--text-base); font-weight: 600; color: var(--text); letter-spacing: -0.005em; }
.dh-qa-sub { font-size: 11px; color: var(--text-3); margin-top: 1px; font-weight: 500; }
.dh-qa-arrow { color: var(--text-3); transition: transform var(--duration-fast) var(--ease); flex-shrink: 0; }
.dh-qa:hover .dh-qa-arrow { transform: translateX(3px); color: var(--c1); }

/* ── Animations ── */
@keyframes dhFadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ── */
@media (max-width: 1100px) {
  .dh-grid { grid-template-columns: 1fr; }
  .dh-card:nth-child(3) { grid-column: auto; }
  .dh-stats { grid-template-columns: repeat(2, 1fr); }
  .dh-qa-list { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
  .dh-title { font-size: var(--text-3xl); }
  .dh-qa-list { grid-template-columns: 1fr; }
}
`;