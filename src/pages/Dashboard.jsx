import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiBookOpenLine, RiAwardLine, RiTimeLine, RiCheckboxCircleLine,
  RiBarChartBoxLine, RiVideoLine, RiTrophyLine, RiArrowRightSLine,
  RiTrophyFill, RiMedalFill, RiStarFill, RiFireFill,
  RiQuestionLine, RiCameraLine, RiUserLine, RiSpeedLine,
  RiArrowUpLine,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';
import { isAdmin, can } from '../utils/permissions';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user,       setUser]       = useState(null);
  const [stats,      setStats]      = useState({ assigned: 0, completed: 0, inProgress: 0 });
  const [adminStats, setAdminStats] = useState(null);
  const [courses,    setCourses]    = useState([]);
  const [topWinners, setTopWinners] = useState([]);
  const [myRank,     setMyRank]     = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    loadData();
  }, []);

  const loadData = async () => {
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const requests = [
        API.get('/Webservice/getMycoursesInprogress').catch(() => ({ data: { code: 0 } })),
        API.get('/Webservice/getLeaderBoardWS').catch(() => ({ data: { code: 0 } })),
      ];
      if (isAdmin()) {
        requests.push(
          API.get('/Webservice/getCourseList').catch(() => ({ data: { code: 0 } })),
          API.get('/Webservices/getAllQuizList').catch(() => ({ data: { code: 0 } })),
          API.get('/Webservices/getAllInterviewList').catch(() => ({ data: { code: 0 } })),
          API.get('/Webservices/getAllUserList').catch(() => ({ data: { code: 0 } })),
        );
      }
      const [coursesRes, lbRes, allCoursesRes, quizRes, interviewRes, usersRes] = await Promise.all(requests);
      if (coursesRes.data.code === 1) {
        const list = coursesRes.data.data || [];
        setCourses(list.slice(0, 5));
        setStats({ assigned: list.length, completed: list.filter(c => c.completed).length, inProgress: list.filter(c => !c.completed).length });
      }
      if (lbRes.data.code === 1) {
        const board = lbRes.data.data || [];
        setTopWinners(board.slice(0, 5));
        const idx = board.findIndex(d => d.emp_code === me.emp_code);
        if (idx >= 0) setMyRank(idx + 1);
      }
      if (isAdmin()) {
        setAdminStats({
          totalCourses:    (allCoursesRes?.data?.data || []).filter(c => c.status === 2 || c.status === '2').length,
          totalQuizzes:    (quizRes?.data?.data || []).length,
          totalInterviews: (interviewRes?.data?.data || []).length,
          totalUsers:      usersRes?.data?.data?.stats?.total ?? 0,
        });
      }
    } catch {}
    setLoading(false);
  };

  const firstName     = user?.emp_first_name || user?.name?.split(' ')[0] || 'User';
  const completionPct = stats.assigned ? Math.round((stats.completed / stats.assigned) * 100) : 0;
  const hour          = new Date().getHours();
  const greeting      = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const ADMIN_CARDS = adminStats ? [
    { Icon: RiBookOpenLine, label: 'Published Courses', value: adminStats.totalCourses,                        c1: '#6366F1', c2: '#8B5CF6', path: '/admin/courses', trend: '+8 this month', trendType: 'up' },
    { Icon: RiQuestionLine, label: 'Total Quizzes',     value: adminStats.totalQuizzes,                        c1: '#F59E0B', c2: '#EF4444', path: '/quiz',         trend: 'Active',        trendType: 'info' },
    { Icon: RiCameraLine,   label: 'Total Interviews',  value: adminStats.totalInterviews,                     c1: '#EC4899', c2: '#F43F5E', path: '/interview',    trend: '3 pending',     trendType: 'warn' },
    { Icon: RiUserLine,     label: 'Total Users',       value: adminStats.totalUsers?.toLocaleString('en-IN'), c1: '#10B981', c2: '#059669', path: '/settings',     trend: '↑ 2.4%',        trendType: 'up' },
  ] : [];

  const STATS = [
    { Icon: RiBookOpenLine,       label: 'Assigned',        value: stats.assigned,      c1: '#6366F1', c2: '#8B5CF6', glow: 'rgba(99,102,241,0.3)' },
    { Icon: RiCheckboxCircleLine, label: 'Completed',       value: stats.completed,     c1: '#10B981', c2: '#059669', glow: 'rgba(16,185,129,0.3)',  badge: 'Up' },
    { Icon: RiTimeLine,           label: 'In Progress',     value: stats.inProgress,    c1: '#F59E0B', c2: '#EF4444', glow: 'rgba(245,158,11,0.3)' },
    { Icon: RiSpeedLine,          label: 'Completion Rate', value: completionPct + '%', c1: '#06B6D4', c2: '#0EA5E9', glow: 'rgba(14,165,233,0.3)',  badge: completionPct > 50 ? 'Good' : null },
  ];

  const QUICK = [
    { Icon: RiBookOpenLine, label: 'Browse Courses', sub: 'Explore catalog',     path: '/courses',     c1: '#6366F1', c2: '#8B5CF6', show: true },
    { Icon: RiAwardLine,    label: 'Take a Quiz',    sub: 'Test your knowledge', path: '/quiz',        c1: '#10B981', c2: '#059669', show: can('quiz.manage') || can('quiz.review') },
    { Icon: RiVideoLine,    label: 'Interview Prep', sub: 'Practice rounds',     path: '/interview',   c1: '#EC4899', c2: '#F43F5E', show: can('interview.manage') || can('interview.review') },
    { Icon: RiTrophyLine,   label: 'Leaderboard',    sub: 'See your rank',       path: '/leaderboard', c1: '#FBBF24', c2: '#F59E0B', show: true },
  ].filter(q => q.show);

  const PODIUM = [
    { rank: 1, label: '1st', icon: RiTrophyFill, c1: '#FBBF24', c2: '#F59E0B' },
    { rank: 2, label: '2nd', icon: RiMedalFill,  c1: '#CBD5E1', c2: '#94A3B8' },
    { rank: 3, label: '3rd', icon: RiMedalFill,  c1: '#FB923C', c2: '#EA580C' },
    { rank: 4, label: '4th', icon: RiMedalFill,  c1: '#6366F1', c2: '#8B5CF6' },
    { rank: 5, label: '5th', icon: RiMedalFill,  c1: '#10B981', c2: '#059669' },
  ];

  const Sk = ({ w='100%', h='13px', r='6px' }) => (
    <span className="dh-sk" style={{ width: w, height: h, borderRadius: r, display: 'block' }}/>
  );

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* ── Hero ── */}
      <header className="dh-hero">
        <div className="dh-hero-glow" aria-hidden="true"/>
        <div className="dh-hero-content">
          <div className="dh-eyebrow">{greeting}</div>
          <h1 className="dh-title">{firstName}.</h1>
          <p className="dh-sub">
            {stats.assigned === 0
              ? "Let's begin your learning journey today."
              : `${stats.inProgress} course${stats.inProgress !== 1 ? 's' : ''} in progress · ${completionPct}% overall · You're doing great!`}
          </p>
        </div>
        {myRank && (
          <div className="dh-myrank">
            <div className="dh-myrank-label">Your rank</div>
            <div className="dh-myrank-value">#{myRank}</div>
            <button className="dh-myrank-link" onClick={() => navigate('/leaderboard')}>
              View board <RiArrowRightSLine size={12}/>
            </button>
          </div>
        )}
      </header>

      {/* ── Platform Overview ── */}
      {isAdmin() && adminStats && (
        <section className="dh-admin-stats">
          <div className="dh-sec-label">Platform Overview</div>
          <div className="dh-admin-grid">
            {ADMIN_CARDS.map(s => (
              <button key={s.label} className="dh-ac" onClick={() => navigate(s.path)} style={{ '--c1': s.c1, '--c2': s.c2 }}>
                <div className="dh-ac-top">
                  <div className="dh-ac-icon"><s.Icon size={16}/></div>
                  <span className={`dh-ac-trend dh-ac-trend--${s.trendType}`}>{s.trend}</span>
                </div>
                <div className="dh-ac-val">{s.value ?? '—'}</div>
                <div className="dh-ac-lbl">{s.label}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── My Stats ── */}
      <section className="dh-stats">
        {STATS.map((s, i) => (
          <div key={s.label} className="dh-stat"
            style={{ '--c1': s.c1, '--c2': s.c2, '--glow': s.glow, animationDelay: `${i * 60}ms` }}>
            <div className="dh-stat-top">
              <div className="dh-stat-icon"><span className="dh-stat-icon-bg"/><s.Icon size={15}/></div>
              {s.badge && <span className="dh-stat-badge"><RiArrowUpLine size={9}/>{s.badge}</span>}
            </div>
            <div className="dh-stat-value">{s.value ?? '—'}</div>
            <div className="dh-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Main Grid ── */}
      <section className="dh-grid">

        {/* My Courses */}
        <article className="dh-card dh-card--courses">
          <header className="dh-card-head">
            <div>
              <h2 className="dh-card-title">My courses</h2>
              <p className="dh-card-sub">Active learning</p>
            </div>
            <button className="dh-card-link" onClick={() => navigate('/courses')}>
              View all <RiArrowRightSLine size={13}/>
            </button>
          </header>

          {loading ? (
            <div className="dh-sk-list">
              {[0,1,2,3].map(i => (
                <div key={i} className="dh-sk-course">
                  <Sk w="32px" h="32px" r="8px"/>
                  <div style={{ flex: 1 }}>
                    <Sk w="55%" h="12px" r="4px"/>
                    <div style={{ marginTop: 8 }}><Sk w="100%" h="3px" r="99px"/></div>
                  </div>
                </div>
              ))}
            </div>
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
                const pct    = c.completed ? 100 : Math.round(c.progress_percentage ?? 0);
                const isDone = c.completed;
                return (
                  <li key={i} className="dh-course" style={{ animationDelay: `${i * 55}ms` }}>
                    <div className="dh-course-thumb">
                      <RiBookOpenLine size={14}/>
                    </div>
                    <div className="dh-course-body">
                      <div className="dh-course-name">{c.course_name || c.name || 'Course'}</div>
                      <div className="dh-course-row">
                        <div className="dh-progress">
                          <div
                            className={`dh-progress-fill ${isDone ? 'dh-progress-fill--done' : 'dh-progress-fill--prog'}`}
                            style={{ width: pct + '%' }}
                          />
                        </div>
                        <span className="dh-course-pct">{pct}%</span>
                        <span className={`dh-pill ${isDone ? 'dh-pill--done' : 'dh-pill--prog'}`}>
                          {isDone ? 'Done' : 'In progress'}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        {/* Top Performers */}
        <article className="dh-card dh-card--podium">
          <header className="dh-card-head">
            <div>
              <h2 className="dh-card-title">Top performers <RiFireFill size={13} className="dh-fire"/></h2>
              <p className="dh-card-sub">This month</p>
            </div>
            <button className="dh-card-link" onClick={() => navigate('/leaderboard')}>
              View all <RiArrowRightSLine size={13}/>
            </button>
          </header>

          {loading ? (
            <div className="dh-sk-list">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="dh-sk-winner">
                  <Sk w="22px" h="22px" r="6px"/>
                  <Sk w="28px" h="28px" r="8px"/>
                  <div style={{ flex: 1 }}><Sk w="55%" h="12px" r="4px"/></div>
                  <Sk w="40px" h="20px" r="99px"/>
                </div>
              ))}
            </div>
          ) : topWinners.length === 0 ? (
            <div className="dh-empty">
              <div className="dh-empty-icon"><RiTrophyLine size={20}/></div>
              <div>No leaders yet</div>
            </div>
          ) : (
            <ol className="dh-podium">
              {topWinners.map((w, i) => {
                const cfg = PODIUM[i] || PODIUM[4];
                const initials = (w.name || w.emp_first_name || '?').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
                return (
                  <li key={w.id || i} className={`dh-winner ${i === 0 ? 'dh-winner--gold' : ''}`}
                    style={{ '--c1': cfg.c1, '--c2': cfg.c2, animationDelay: `${i * 70}ms` }}>
                    <div className="dh-winner-rank">
                      <cfg.icon size={i === 0 ? 14 : 12}/>
                      <span>{cfg.label}</span>
                    </div>
                    <div className="dh-winner-avatar">
                      <div className="dh-winner-avatar-ring"/>
                      <div className="dh-winner-avatar-inner">
                        {w.emp_photo ? <img src={w.emp_photo} alt=""/> : <span>{initials}</span>}
                      </div>
                      {i === 0 && <div className="dh-winner-crown" aria-hidden="true">👑</div>}
                    </div>
                    <div className="dh-winner-info">
                      <div className="dh-winner-name">
                        {w.name || `${w.emp_first_name || ''} ${w.emp_last_name || ''}`.trim() || w.emp_code}
                      </div>
                      <div className="dh-winner-meta">{w.emp_department || w.empClient || 'Calibehr'}</div>
                    </div>
                    <div className="dh-winner-points">
                      <RiStarFill size={10}/>
                      <span>{w.points ?? w.total_points ?? 0}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </article>

        {/* Quick Actions */}
        <article className="dh-card dh-card--actions">
          <header className="dh-card-head">
            <div>
              <h2 className="dh-card-title">Quick actions</h2>
              <p className="dh-card-sub">Jump back in</p>
            </div>
          </header>
          <ul className="dh-qa-list">
            {QUICK.map((q, i) => (
              <li key={q.label} style={{ animationDelay: `${i * 50}ms` }}>
                <button className="dh-qa" onClick={() => navigate(q.path)} style={{ '--c1': q.c1, '--c2': q.c2 }}>
                  <span className="dh-qa-icon"><span className="dh-qa-icon-bg"/><q.Icon size={15}/></span>
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
/* ── Shimmer skeleton ── */
.dh-sk {
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: dhShimmer 1.5s ease-in-out infinite;
}
@keyframes dhShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.dh-sk-list { display: flex; flex-direction: column; gap: 12px; padding: 2px 0; }
.dh-sk-course { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
.dh-sk-winner { display: flex; align-items: center; gap: 8px; padding: 4px 0; }

/* ── Section label ── */
.dh-sec-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--text-3);
  margin-bottom: var(--s-3); display: flex; align-items: center; gap: 8px;
}
.dh-sec-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* ── Admin cards ── */
.dh-admin-stats { margin-bottom: var(--s-5); }
.dh-admin-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-3); }
.dh-ac {
  background: var(--surface); border-radius: var(--r-lg); padding: var(--s-4);
  border: 1px solid var(--border); box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: 6px;
  cursor: pointer; font-family: inherit; text-align: left;
  position: relative; overflow: hidden;
  transition: all var(--duration) var(--ease);
}
.dh-ac::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--c1), var(--c2));
}
.dh-ac:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--c1) 28%, transparent);
  box-shadow: var(--shadow-md), 0 0 0 1px color-mix(in srgb, var(--c1) 14%, transparent);
}
.dh-ac-top { display: flex; justify-content: space-between; align-items: flex-start; }
.dh-ac-icon {
  width: 34px; height: 34px; border-radius: 9px;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  display: grid; place-items: center; color: #fff;
  box-shadow: 0 3px 8px color-mix(in srgb, var(--c1) 30%, transparent);
}
.dh-ac-trend { font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 99px; }
.dh-ac-trend--up   { background: var(--success-soft); color: var(--success); }
.dh-ac-trend--warn { background: var(--warning-soft); color: var(--warning); }
.dh-ac-trend--info { background: var(--info-soft);    color: var(--info);    }
.dh-ac-val {
  font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700;
  letter-spacing: -0.03em; color: var(--text); line-height: 1;
  font-variant-numeric: tabular-nums;
}
.dh-ac-lbl { font-size: 11px; color: var(--text-3); font-weight: 500; }

/* ── Hero ── */
.dh-hero {
  position: relative; display: flex; justify-content: space-between;
  align-items: flex-end; gap: var(--s-4); margin-bottom: var(--s-5);
  padding: var(--s-4) 0 var(--s-5); animation: dhFadeUp 550ms var(--ease-out); flex-wrap: wrap;
}
.dh-hero-glow {
  position: absolute; top: -40px; left: -50px; width: 340px; height: 230px;
  background: radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent) 16%, transparent), transparent 65%);
  pointer-events: none; filter: blur(22px); z-index: 0;
}
.dh-hero-content { position: relative; z-index: 1; flex: 1; min-width: 240px; }
.dh-eyebrow {
  font-size: 10px; color: var(--text-3); font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px;
}
.dh-title {
  font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 700;
  letter-spacing: -0.04em; color: var(--text); margin: 0 0 8px; line-height: 1;
  text-transform: capitalize;
}
.dh-sub { font-size: 13px; color: var(--text-2); margin: 0; line-height: 1.5; max-width: 520px; }
.dh-myrank {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: var(--s-3) var(--s-5);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: var(--r-lg);
}
.dh-myrank-label { font-size: 9px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
.dh-myrank-value {
  font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700;
  color: var(--accent); letter-spacing: -0.03em; line-height: 1;
}
.dh-myrank-link {
  display: inline-flex; align-items: center; gap: 2px;
  background: transparent; border: none; padding: 0;
  font-family: inherit; font-size: 10px; font-weight: 600;
  color: var(--text-3); cursor: pointer;
  transition: color var(--duration-fast) var(--ease);
}
.dh-myrank-link:hover { color: var(--accent); }

/* ── My Stats ── */
.dh-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-3); margin-bottom: var(--s-5); }
.dh-stat {
  background: var(--surface); border-radius: var(--r-lg); padding: var(--s-4);
  border: 1px solid var(--border); box-shadow: var(--shadow-sm);
  position: relative; overflow: hidden;
  opacity: 0; animation: dhFadeUp 500ms var(--ease-out) forwards;
  transition: all var(--duration) var(--ease);
}
.dh-stat:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--c1) 28%, transparent);
  box-shadow: var(--shadow-md), 0 0 0 1px color-mix(in srgb, var(--c1) 14%, transparent);
}
.dh-stat::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--c1), var(--c2));
}
.dh-stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--s-2); }
.dh-stat-icon { position: relative; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; color: #fff; }
.dh-stat-icon-bg {
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  box-shadow: 0 4px 10px var(--glow);
}
.dh-stat-icon > svg { position: relative; z-index: 1; }
.dh-stat-badge {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 99px;
  background: var(--success-soft); color: var(--success);
}
.dh-stat-value {
  font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700;
  letter-spacing: -0.03em; color: var(--text); line-height: 1;
  font-variant-numeric: tabular-nums; margin-bottom: 4px;
}
.dh-stat-label { font-size: 11px; color: var(--text-3); font-weight: 500; }

/* ── Grid ── */
.dh-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--s-4); }
.dh-card {
  background: var(--surface); border-radius: var(--r-lg); padding: var(--s-5);
  border: 1px solid var(--border); box-shadow: var(--shadow-sm);
  animation: dhFadeUp 500ms var(--ease-out) 200ms both;
}
.dh-card--podium {
  background: linear-gradient(145deg, var(--surface), color-mix(in srgb, #FBBF24 5%, var(--surface)));
  border-color: color-mix(in srgb, #FBBF24 14%, var(--border));
}
.dh-card--actions { grid-column: 1 / -1; }

.dh-card-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding-bottom: var(--s-3); border-bottom: 1px solid var(--border); margin-bottom: var(--s-3);
}
.dh-card-title {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700;
  letter-spacing: -0.025em; color: var(--text); margin: 0; line-height: 1.1;
}
.dh-fire { color: #F59E0B; animation: dhFire 1.6s ease-in-out infinite; }
@keyframes dhFire { 0%,100% { transform: scale(1) rotate(-3deg); } 50% { transform: scale(1.1) rotate(3deg); } }
.dh-card-sub { font-size: 11px; color: var(--text-3); margin: 3px 0 0; }
.dh-card-link {
  display: inline-flex; align-items: center; gap: 3px;
  background: var(--accent-soft); border: none; padding: 4px 9px; border-radius: var(--r-sm);
  font-family: inherit; font-size: 11px; font-weight: 600;
  color: var(--accent); cursor: pointer;
  transition: all var(--duration-fast) var(--ease);
}
.dh-card-link:hover { background: var(--accent-soft-2); gap: 5px; }

/* ── Empty ── */
.dh-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: var(--s-7) var(--s-3);
  color: var(--text-3); font-size: var(--text-sm); text-align: center;
}
.dh-empty-icon {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent); display: grid; place-items: center;
}
.dh-empty-cta {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 14px; background: var(--accent); color: var(--accent-text);
  border: none; border-radius: var(--r-md);
  font-family: inherit; font-size: var(--text-xs); font-weight: 600; cursor: pointer;
  transition: all var(--duration-fast) var(--ease);
}
.dh-empty-cta:hover { background: var(--accent-hover); transform: translateY(-1px); }

/* ── Course list ── */
.dh-course-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px; }
.dh-course {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; background: var(--surface-2);
  border-radius: var(--r-md); border: 1px solid transparent;
  opacity: 0; animation: dhFadeUp 400ms var(--ease-out) forwards;
  transition: all var(--duration-fast) var(--ease); cursor: pointer;
}
.dh-course:hover { background: var(--surface-3); border-color: var(--border); }

/* Course thumb — single emerald color, no more random colors */
.dh-course-thumb {
  width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center; flex-shrink: 0;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.dh-course-body { flex: 1; min-width: 0; }
.dh-course-name {
  font-size: 12px; font-weight: 600; color: var(--text);
  letter-spacing: -0.005em; margin-bottom: 5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dh-course-row { display: flex; align-items: center; gap: 8px; }
.dh-progress { flex: 1; height: 3px; background: var(--surface-3); border-radius: 99px; overflow: hidden; }
.dh-progress-fill { height: 100%; border-radius: 99px; transition: width 700ms var(--ease-out); }

/* Progress bar — consistent colors: blue for in-progress, green for done */
.dh-progress-fill--prog { background: linear-gradient(90deg, #3b82f6, #6366f1); }
.dh-progress-fill--done { background: linear-gradient(90deg, #10B981, #059669); }

.dh-course-pct { font-size: 10.5px; font-weight: 700; color: var(--text-2); min-width: 28px; text-align: right; }
.dh-pill { font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 99px; flex-shrink: 0; }
.dh-pill--done { background: var(--success-soft); color: var(--success); }
.dh-pill--prog { background: var(--info-soft); color: var(--info); }

/* ── Podium ── */
.dh-podium { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px; }
.dh-winner {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; background: var(--surface-2);
  border-radius: var(--r-md); border: 1px solid transparent;
  position: relative; overflow: hidden;
  opacity: 0; animation: dhFadeUp 500ms var(--ease-out) forwards;
  transition: all var(--duration) var(--ease); cursor: pointer;
}
.dh-winner:hover { transform: translateX(3px); }
.dh-winner::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--c1), var(--c2));
}
.dh-winner--gold {
  background: linear-gradient(135deg,
    color-mix(in srgb, #FBBF24 12%, var(--surface-2)),
    color-mix(in srgb, #F59E0B 5%, var(--surface-2)));
  border-color: color-mix(in srgb, #FBBF24 22%, transparent);
}
.dh-winner-rank {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  width: 26px; flex-shrink: 0; color: var(--c1);
}
.dh-winner-rank > span { font-size: 8px; font-weight: 700; color: var(--c1); text-transform: uppercase; letter-spacing: 0.04em; }
.dh-winner-avatar { position: relative; width: 32px; height: 32px; flex-shrink: 0; }
.dh-winner-avatar-ring { position: absolute; inset: -2px; border-radius: 50%; background: linear-gradient(135deg, var(--c1), var(--c2)); z-index: 0; }
.dh-winner-avatar-inner {
  position: absolute; inset: 0; border-radius: 50%; background: var(--bg);
  color: var(--text); display: grid; place-items: center;
  font-weight: 700; font-size: 11px; overflow: hidden; z-index: 1;
}
.dh-winner-avatar-inner img { width: 100%; height: 100%; object-fit: cover; }
.dh-winner-crown {
  position: absolute; top: -9px; left: 50%; transform: translateX(-50%) rotate(-8deg);
  font-size: 12px; z-index: 2; line-height: 1;
}
.dh-winner-info { flex: 1; min-width: 0; }
.dh-winner-name { font-size: 12px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dh-winner-meta { font-size: 10px; color: var(--text-3); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dh-winner-points {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 8px; border-radius: 99px;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  color: #fff; font-size: 10.5px; font-weight: 700; flex-shrink: 0;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--c1) 35%, transparent);
}

/* ── Quick Actions ── */
.dh-qa-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.dh-qa {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; background: var(--surface-2);
  border: 1px solid var(--border); border-radius: var(--r-md);
  font-family: inherit; cursor: pointer; text-align: left;
  transition: all var(--duration) var(--ease);
}
.dh-qa:hover {
  background: var(--surface);
  border-color: color-mix(in srgb, var(--c1) 30%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--c1) 14%, transparent);
}
.dh-qa-icon { position: relative; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; color: #fff; flex-shrink: 0; }
.dh-qa-icon-bg {
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  box-shadow: 0 3px 8px color-mix(in srgb, var(--c1) 28%, transparent);
}
.dh-qa-icon > svg { position: relative; z-index: 1; }
.dh-qa-text { flex: 1; min-width: 0; }
.dh-qa-label { font-size: 13px; font-weight: 600; color: var(--text); letter-spacing: -0.005em; }
.dh-qa-sub   { font-size: 11px; color: var(--text-3); margin-top: 1px; }
.dh-qa-arrow { color: var(--text-3); flex-shrink: 0; transition: transform var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease); }
.dh-qa:hover .dh-qa-arrow { transform: translateX(4px); color: var(--c1); }

/* ── Animations ── */
@keyframes dhFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .dh-grid { grid-template-columns: 1fr; }
  .dh-stats { grid-template-columns: repeat(2, 1fr); }
  .dh-admin-grid { grid-template-columns: repeat(2, 1fr); }
  .dh-qa-list { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
  .dh-title { font-size: var(--text-3xl); }
  .dh-qa-list { grid-template-columns: 1fr; }
}
`;
