import { useState, useEffect } from 'react';
import {
  RiTrophyLine, RiMedalLine, RiTrophyFill, RiMedalFill,
  RiStarFill, RiBookOpenLine, RiFireFill, RiTeamLine,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';

export default function Leaderboard() {
  const [tab,     setTab]     = useState('global'); // 'global' | 'dept' | 'mydept'
  const [data,    setData]    = useState([]);
  const [deptData,setDeptData]= useState([]);
  const [loading, setLoading] = useState(true);
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [gRes, dRes] = await Promise.all([
        API.get('/Webservice/getLeaderBoardWS'),
        API.get('/Webservice/getDepartmentLeaderBoardWS'),
      ]);
      if (gRes.data.code === 1) setData(gRes.data.data || []);
      if (dRes.data.code === 1) setDeptData(dRes.data.data || []);
    } catch {}
    setLoading(false);
  };

  // My department = filter global data by same emp_department as logged in user
  const myDeptData = data.filter(d => d.emp_department && me.department && 
    String(d.emp_department) === String(me.department));

  const myRank = data.findIndex(d => d.emp_code === me.emp_code) + 1;
  const top3   = data.slice(0, 3);
  const totalPoints = data.reduce((s, d) => s + (d.total_points ?? d.points ?? 0), 0);
  const myEntry = data.find(d => d.emp_code === me.emp_code);

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* Hero with subtle glow */}
      <header className="lb-hero">
        <div className="lb-hero-glow" aria-hidden="true"/>
        <div className="lb-hero-text">
          <div className="lb-hero-eyebrow">This month</div>
          <h1 className="lb-hero-title">Top performers.</h1>
          <p className="lb-hero-sub">
            {data.length > 0
              ? `${data.length} ${data.length === 1 ? 'learner' : 'learners'} ranked by points earned.`
              : 'Be the first to lead the board.'}
          </p>
        </div>
        {myRank > 0 && (
          <div className="lb-rank-card">
            <div className="lb-rank-icon"><RiMedalFill size={18}/></div>
            <div>
              <div className="lb-rank-label">Your rank</div>
              <div className="lb-rank-value">#{myRank}</div>
              {myEntry && (
                <div className="lb-rank-pts">{myEntry.total_points ?? myEntry.points ?? 0} points</div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Stats strip */}
      {!loading && data.length > 0 && (
        <div className="lb-stats">
          <div className="lb-stat" style={{ '--c1': '#6366F1', '--c2': '#8B5CF6' }}>
            <div className="lb-stat-num">{data.length}</div>
            <div className="lb-stat-lbl">Learners</div>
          </div>
          <div className="lb-stat" style={{ '--c1': '#10B981', '--c2': '#059669' }}>
            <div className="lb-stat-num">{totalPoints.toLocaleString()}</div>
            <div className="lb-stat-lbl">Total points</div>
          </div>
          <div className="lb-stat" style={{ '--c1': '#FBBF24', '--c2': '#F59E0B' }}>
            <div className="lb-stat-num">{data[0]?.total_points ?? data[0]?.points ?? 0}</div>
            <div className="lb-stat-lbl">Top score</div>
          </div>
          <div className="lb-stat" style={{ '--c1': '#EC4899', '--c2': '#F43F5E' }}>
            <div className="lb-stat-num">
              {Math.round(totalPoints / Math.max(data.length, 1))}
            </div>
            <div className="lb-stat-lbl">Avg points</div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="lb-tabs">
        <button className={`lb-tab ${tab === 'global' ? 'lb-tab--active' : ''}`} onClick={() => setTab('global')}>
          <RiTrophyLine size={14}/> Overall
        </button>
        {/* <button className={`lb-tab ${tab === 'mydept' ? 'lb-tab--active' : ''}`} onClick={() => setTab('mydept')}>
          <RiTeamLine size={14}/> My Department
        </button> */}
        <button className={`lb-tab ${tab === 'dept' ? 'lb-tab--active' : ''}`} onClick={() => setTab('dept')}>
          <RiTeamLine size={14}/> All Departments
        </button>
      </div>

      {tab === 'dept' ? (
        <DeptLeaderboard data={deptData} loading={loading}/>
      ) : tab === 'mydept' ? (
        <MyDeptLeaderboard data={myDeptData} loading={loading} me={me}/>
      ) : (
        <>
        {loading ? (
        <div className="lb-state">Loading the board…</div>
      ) : data.length === 0 ? (
        <div className="lb-state lb-empty">
          <div className="lb-empty-icon"><RiTrophyLine size={28}/></div>
          <div className="lb-empty-title">No data yet</div>
          <div className="lb-empty-sub">Once learners earn points, the leaderboard will fill up here.</div>
        </div>
      ) : (
        <>
          {/* Top 3 dramatic podium */}
          {top3.length >= 3 && (
            <section className="lb-podium-stage">
              <div className="lb-podium-bg" aria-hidden="true"/>
              <div className="lb-podium">
                <PodiumItem person={top3[1]} rank={2}/>
                <PodiumItem person={top3[0]} rank={1}/>
                <PodiumItem person={top3[2]} rank={3}/>
              </div>
            </section>
          )}

          {/* Full table */}
          <article className="lb-card">
            <header className="lb-card-head">
              <div>
                <h2 className="lb-card-title">Full ranking</h2>
                <p className="lb-card-sub">Sorted by total points earned</p>
              </div>
            </header>

            <div className="lb-thead">
              <span style={{ width: 56, textAlign: 'center' }}>Rank</span>
              <span style={{ flex: 1 }}>Learner</span>
              <span className="lb-col-courses">Courses</span>
              <span style={{ width: 90, textAlign: 'right' }}>Points</span>
            </div>

            <ul className="lb-rows">
              {data.map((d, i) => {
                const isMe   = d.emp_code === me.emp_code;
                const points = d.total_points ?? d.points ?? 0;
                const initials = (d.emp_first_name || 'U')[0].toUpperCase();
                return (
                  <li
                    key={d.id || i}
                    className={`lb-row ${isMe ? 'lb-row--me' : ''}`}
                    style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}
                  >
                    <span className="lb-rank-cell">
                      {i < 3
                        ? <span className={`lb-medal lb-medal--${i+1}`}>
                            {i === 0 ? <RiTrophyFill size={20}/> : <RiMedalFill size={18}/>}
                          </span>
                        : <span className="lb-num">{i + 1}</span>}
                    </span>
                    <div className="lb-user">
                      <div className={`lb-avatar lb-avatar--${i < 3 ? ['gold','silver','bronze'][i] : (isMe ? 'me' : 'default')}`}>
                        {d.emp_photo && d.emp_photo.trim()
                          ? <img 
                              src={d.emp_photo.startsWith('http') ? d.emp_photo : `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}${d.emp_photo}`}
                              alt={d.emp_first_name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const sibling = e.target.nextElementSibling;
                                if (sibling) sibling.style.display = 'flex';
                              }}
                            />
                          : null}
                        <span style={{display: d.emp_photo && d.emp_photo.trim() ? 'none' : 'flex'}}>
                          {initials}
                        </span>
                      </div>
                      <div>
                        <div className="lb-name">
                          {d.emp_first_name} {d.emp_last_name}
                          {isMe && <span className="lb-you">You</span>}
                        </div>
                        <div className="lb-code">
                          {d.emp_code}
                          {d.emp_department && ` · ${d.emp_department}`}
                        </div>
                      </div>
                    </div>
                    <span className="lb-col-courses lb-courses-val">
                      {d.completed_courses ?? d.courses_completed ?? 0}
                    </span>
                    <span className="lb-points">{points.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          </article>
        </>
      )}
        </>
      )}
    </AppShell>
  );
}

/* ── Dramatic Podium tile ── */
function PodiumItem({ person, rank }) {
  const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
  const initials = (person?.emp_first_name || 'U')[0].toUpperCase();
  const points  = person?.total_points ?? person?.points ?? 0;
  const fullName = `${person?.emp_first_name || ''} ${person?.emp_last_name || ''}`.trim() || 'User';

  const Icon = rank === 1 ? RiTrophyFill : RiMedalFill;

  return (
    <div className={`pod pod--${rank}`}>
      <div className={`pod-glow pod-glow--${tier}`} aria-hidden="true"/>
      {rank === 1 && <div className="pod-crown">👑</div>}
      <div className={`pod-medal-icon pod-medal-icon--${tier}`}>
        <Icon size={rank === 1 ? 22 : 18}/>
      </div>
      <div className={`pod-avatar-wrap pod-avatar-wrap--${tier}`}>
        <div className={`pod-avatar pod-avatar--${tier}`}>
          {person?.emp_photo && person.emp_photo.trim()
            ? <img 
                src={person.emp_photo.startsWith('http') ? person.emp_photo : `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}${person.emp_photo}`}
                alt={person.emp_first_name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const sibling = e.target.nextElementSibling;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
            : null}
          <span style={{display: person?.emp_photo && person.emp_photo.trim() ? 'none' : 'flex'}}>
            {initials}
          </span>
        </div>
      </div>
      <div className="pod-name" title={fullName}>{fullName.split(' ')[0]}</div>
      <div className="pod-points">
        <RiStarFill size={11}/> <span className="pod-points-num">{points.toLocaleString()}</span>
        <span className="pod-points-lbl">pts</span>
      </div>
      {(person?.completed_courses ?? 0) > 0 && (
        <div className="pod-courses">
          <RiBookOpenLine size={10}/> {person.completed_courses} done
        </div>
      )}
      <div className={`pod-bar pod-bar--${rank}`}>
        <div className="pod-bar-rank">{rank}</div>
      </div>
    </div>
  );
}

/* ── My Department Leaderboard ── */
function MyDeptLeaderboard({ data, loading, me }) {
  if (loading) return <div className="lb-state">Loading…</div>;

  const deptName = data[0]?.dept_name || data[0]?.emp_department_name || '';

  if (data.length === 0) return (
    <div className="lb-state lb-empty">
      <div className="lb-empty-icon"><RiTeamLine size={28}/></div>
      <div className="lb-empty-title">No department data</div>
      <div className="lb-empty-sub">No colleagues found in your department on the leaderboard yet.</div>
    </div>
  );

  return (
    <article className="lb-card">
      <header className="lb-card-head">
        <div>
          <h2 className="lb-card-title">My Department Rankings</h2>
          <p className="lb-card-sub">{deptName ? `${deptName} · ` : ''}Sorted by points earned</p>
        </div>
      </header>
      <div className="lb-thead">
        <span style={{ width: 56, textAlign: 'center' }}>Rank</span>
        <span style={{ flex: 1 }}>Learner</span>
        <span className="lb-col-courses">Courses</span>
        <span style={{ width: 90, textAlign: 'right' }}>Points</span>
      </div>
      <ul className="lb-rows">
        {data.map((d, i) => {
          const isMe   = d.emp_code === me.emp_code;
          const points = d.total_points ?? d.points ?? 0;
          const initials = (d.emp_first_name || 'U')[0].toUpperCase();
          return (
            <li key={d.id || i} className={`lb-row ${isMe ? 'lb-row--me' : ''}`}
                style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}>
              <span className="lb-rank-cell">
                {i < 3
                  ? <span className={`lb-medal lb-medal--${i+1}`}>
                      {i === 0 ? <RiTrophyFill size={20}/> : <RiMedalFill size={18}/>}
                    </span>
                  : <span className="lb-num">{i + 1}</span>}
              </span>
              <div className="lb-user">
                <div className={`lb-avatar lb-avatar--${i < 3 ? ['gold','silver','bronze'][i] : (isMe ? 'me' : 'default')}`}>
                  {d.emp_photo && d.emp_photo.trim()
                    ? <img src={d.emp_photo.startsWith('http') ? d.emp_photo : `${import.meta.env.VITE_API_URL || ''}${d.emp_photo}`}
                           alt={d.emp_first_name} onError={e => { e.target.style.display='none'; }}/>
                    : null}
                  <span>{initials}</span>
                </div>
                <div>
                  <div className="lb-name">
                    {d.emp_first_name} {d.emp_last_name}
                    {isMe && <span className="lb-you">You</span>}
                  </div>
                  <div className="lb-code">{d.emp_code}</div>
                </div>
              </div>
              <span className="lb-col-courses lb-courses-val">{d.completed_courses ?? d.courses_completed ?? 0}</span>
              <span className="lb-points">{points.toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/* ── Department Leaderboard ── */
function DeptLeaderboard({ data, loading }) {
  const [deptNames, setDeptNames] = useState({});

  useEffect(() => {
    // fetch department list to map ID → name
    (async () => {
      try {
        const res = await API.get('/Webservice/getDepartmentList');
        if (res.data.code === 1) {
          // response: [{id, name}] or [{name}] — build map by id and by index
          const map = {};
          (res.data.data || []).forEach(d => {
            if (d.id) map[String(d.id)] = d.name;
            if (d.dept_id) map[String(d.dept_id)] = d.name;
            if (d.DeptId) map[String(d.DeptId)] = d.name;
          });
          setDeptNames(map);
        }
      } catch {}
    })();
  }, []);

  const getDeptName = (d) => d.dept_name || `Dept ${d.emp_department}`;

  if (loading) return <div className="lb-state">Loading departments…</div>;
  if (data.length === 0) return (
    <div className="lb-state lb-empty">
      <div className="lb-empty-icon"><RiTeamLine size={28}/></div>
      <div className="lb-empty-title">No department data yet</div>
      <div className="lb-empty-sub">Department rankings appear once learners earn points.</div>
    </div>
  );
  return (
    <article className="lb-card">
      <header className="lb-card-head">
        <div>
          <h2 className="lb-card-title">Department Rankings</h2>
          <p className="lb-card-sub">Sorted by total points earned across all learners</p>
        </div>
      </header>
      <div className="lb-thead">
        <span style={{ width: 56, textAlign: 'center' }}>Rank</span>
        <span style={{ flex: 1 }}>Department</span>
        <span style={{ width: 100, textAlign: 'center' }}>Learners</span>
        <span style={{ width: 110, textAlign: 'center' }}>Completions</span>
        <span style={{ width: 90, textAlign: 'right' }}>Points</span>
      </div>
      <ul className="lb-rows">
        {data.map((d, i) => (
          <li key={i} className="lb-row" style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}>
            <span className="lb-rank-cell">
              {i < 3
                ? <span className={`lb-medal lb-medal--${i+1}`}>
                    {i === 0 ? <RiTrophyFill size={20}/> : <RiMedalFill size={18}/>}
                  </span>
                : <span className="lb-num">{i + 1}</span>}
            </span>
            <div className="lb-user" style={{ flex: 1 }}>
              <div className="lb-dept-icon"><RiTeamLine size={16}/></div>
              <div>
                <div className="lb-name">{getDeptName(d)}</div>
              </div>
            </div>
            <span style={{ width: 100, textAlign: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
              {d.total_learners ?? 0}
            </span>
            <span style={{ width: 110, textAlign: 'center', fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
              {d.completions ?? 0}
            </span>
            <span className="lb-points">{Number(d.total_points || 0).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

const CSS = `
/* ── Hero ── */
.lb-hero {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
  margin-bottom: var(--s-5);
  padding: var(--s-5) 0;
  flex-wrap: wrap;
  animation: lbFadeUp 600ms var(--ease-out);
}
.lb-hero-glow {
  position: absolute;
  top: -40px; left: -60px;
  width: 360px; height: 240px;
  background: radial-gradient(ellipse at top left, rgba(251,191,36,0.16), transparent 70%);
  filter: blur(28px);
  pointer-events: none;
  z-index: 0;
}
.lb-hero-text { position: relative; z-index: 1; flex: 1; min-width: 240px; }
.lb-hero-eyebrow { font-size: var(--text-sm); color: var(--text-3); font-weight: 500; margin-bottom: 6px; }
.lb-hero-title {
  font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 400;
  letter-spacing: -0.03em; color: var(--text); margin: 0 0 8px; line-height: 1;
}
.lb-hero-sub {
  font-size: var(--text-md); color: var(--text-2);
  margin: 0; max-width: 520px; line-height: 1.5;
}
.lb-rank-card {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: var(--s-3);
  padding: 10px 14px 10px 12px;
  background: linear-gradient(135deg, color-mix(in srgb, #FBBF24 8%, var(--surface)), var(--surface));
  border-radius: var(--r-md);
  box-shadow: var(--shadow-md), inset 0 0 0 1px color-mix(in srgb, #FBBF24 22%, transparent);
  flex-shrink: 0;
}
.lb-rank-icon {
  width: 36px; height: 36px; border-radius: 9px;
  background: linear-gradient(135deg, #FBBF24, #F59E0B);
  color: #fff; display: grid; place-items: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.30);
}
.lb-rank-label {
  font-size: var(--text-xs); color: var(--text-3); font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.lb-rank-value {
  font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400;
  color: var(--text); letter-spacing: -0.025em; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.lb-rank-pts { font-size: 11px; color: var(--text-3); margin-top: 2px; font-weight: 500; }

/* ── Stats strip ── */
.lb-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: var(--s-3); margin-bottom: var(--s-5);
  animation: lbFadeUp 500ms var(--ease-out) 100ms both;
}
.lb-stat {
  background: var(--surface); border-radius: var(--r-md);
  padding: var(--s-3) var(--s-4); text-align: center;
  box-shadow: var(--shadow-sm), var(--ring);
  position: relative; overflow: hidden;
  transition: transform var(--duration) var(--ease);
}
.lb-stat:hover { transform: translateY(-2px); }
.lb-stat::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--c1), var(--c2));
}
.lb-stat-num {
  font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400;
  letter-spacing: -0.025em; line-height: 1;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
}
.lb-stat-lbl { font-size: var(--text-xs); color: var(--text-3); margin-top: 4px; font-weight: 500; }

/* ── States ── */
.lb-state { text-align: center; padding: var(--s-9) var(--s-4); color: var(--text-3); font-size: var(--text-sm); }
.lb-empty { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm), var(--ring); }
.lb-empty-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent);
  display: grid; place-items: center; margin: 0 auto var(--s-3);
}
.lb-empty-title {
  font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400;
  color: var(--text); letter-spacing: -0.025em; margin-bottom: 4px;
}
.lb-empty-sub { font-size: var(--text-sm); color: var(--text-3); max-width: 360px; margin: 0 auto; }

/* ═══ DRAMATIC PODIUM ═══ */
.lb-podium-stage {
  position: relative;
  background: linear-gradient(180deg,
    color-mix(in srgb, #FBBF24 5%, var(--surface)) 0%,
    var(--surface) 100%);
  border-radius: var(--r-lg);
  padding: var(--s-7) var(--s-5) var(--s-3);
  margin-bottom: var(--s-5);
  box-shadow: var(--shadow-md), var(--ring);
  overflow: hidden;
  animation: lbFadeUp 700ms var(--ease-out) 150ms both;
}
.lb-podium-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 50% 0%, rgba(251,191,36,0.18), transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(156,163,175,0.10), transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(217,119,6,0.10), transparent 50%);
  pointer-events: none;
  z-index: 0;
}
.lb-podium {
  position: relative; z-index: 1;
  display: flex; align-items: flex-end; justify-content: center;
  gap: var(--s-3); padding: 0 var(--s-3);
}

.pod {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  flex: 1; max-width: 180px;
  animation: lbFadeUp 700ms var(--ease-out) both;
}
.pod--1 { z-index: 3; animation-delay: 200ms; }
.pod--2 { z-index: 2; animation-delay: 100ms; }
.pod--3 { z-index: 2; animation-delay: 300ms; }

.pod-glow {
  position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
  width: 140px; height: 140px;
  border-radius: 50%; pointer-events: none;
  filter: blur(30px); opacity: 0.5;
}
.pod-glow--gold   { background: #FBBF24; }
.pod-glow--silver { background: #9CA3AF; opacity: 0.35; }
.pod-glow--bronze { background: #D97706; opacity: 0.35; }

.pod-crown {
  font-size: 24px;
  margin-bottom: -4px;
  animation: lbBob 2.4s ease-in-out infinite;
  filter: drop-shadow(0 2px 8px rgba(245,158,11,0.55));
}
.pod-medal-icon {
  width: 36px; height: 36px; border-radius: 50%;
  display: grid; place-items: center;
  color: #fff; flex-shrink: 0;
  position: relative;
}
.pod-medal-icon--gold {
  background: linear-gradient(135deg, #FBBF24, #F59E0B);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.45), inset 0 1px 0 rgba(255,255,255,0.3);
}
.pod-medal-icon--silver {
  background: linear-gradient(135deg, #D1D5DB, #9CA3AF);
  box-shadow: 0 4px 14px rgba(107, 114, 128, 0.30), inset 0 1px 0 rgba(255,255,255,0.3);
}
.pod-medal-icon--bronze {
  background: linear-gradient(135deg, #FB923C, #C2410C);
  box-shadow: 0 4px 14px rgba(194, 65, 12, 0.35), inset 0 1px 0 rgba(255,255,255,0.3);
}
.pod-medal-icon > svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.20)); }

.pod-avatar-wrap {
  position: relative;
  padding: 3px;
  border-radius: 50%;
}
.pod-avatar-wrap--gold   { background: linear-gradient(135deg, #FBBF24, #F59E0B, #FBBF24); }
.pod-avatar-wrap--silver { background: linear-gradient(135deg, #D1D5DB, #9CA3AF, #D1D5DB); }
.pod-avatar-wrap--bronze { background: linear-gradient(135deg, #FB923C, #C2410C, #FB923C); }
.pod--1 .pod-avatar-wrap { padding: 4px; }

.pod-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--surface);
  color: var(--text); font-size: 22px; font-weight: 700;
  display: grid; place-items: center;
  letter-spacing: -0.01em;
  overflow: hidden;
}
.pod--1 .pod-avatar { width: 72px; height: 72px; font-size: 28px; }
.pod-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pod-avatar > span { display: block; }

.pod-name {
  font-size: var(--text-sm); font-weight: 700;
  color: var(--text); letter-spacing: -0.01em;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pod--1 .pod-name { font-size: var(--text-md); }

.pod-points {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 99px;
  background: var(--surface); box-shadow: var(--shadow-xs), inset 0 0 0 1px var(--border);
  font-size: var(--text-xs); font-weight: 600; color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.pod-points > svg { color: #F59E0B; }
.pod-points-lbl { color: var(--text-3); font-weight: 500; }
.pod--1 .pod-points {
  background: linear-gradient(135deg, #FBBF24, #F59E0B);
  color: #fff;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.40);
}
.pod--1 .pod-points > svg { color: #fff; }
.pod--1 .pod-points-lbl { color: rgba(255, 255, 255, 0.8); }

.pod-courses {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; color: var(--text-3); font-weight: 500;
}

/* Podium bars (the steps) */
.pod-bar {
  position: relative;
  width: 100%;
  border-radius: var(--r-md) var(--r-md) 0 0;
  margin-top: 6px;
  display: grid; place-items: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 -2px 8px rgba(0,0,0,0.05);
}
.pod-bar-rank {
  font-family: var(--font-display);
  font-size: 36px; font-weight: 400;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: -0.05em; line-height: 1;
}
.pod-bar--1 {
  height: 100px;
  background: linear-gradient(180deg, #FBBF24, #F59E0B);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.30), 0 -4px 12px rgba(245,158,11,0.20);
}
.pod-bar--1 .pod-bar-rank { font-size: 44px; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.20); }
.pod-bar--2 {
  height: 70px;
  background: linear-gradient(180deg, #D1D5DB, #9CA3AF);
}
.pod-bar--3 {
  height: 50px;
  background: linear-gradient(180deg, #FB923C, #C2410C);
}

/* ── Card ── */
.lb-card {
  background: var(--surface); border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm), var(--ring); overflow: hidden;
  animation: lbFadeUp 700ms var(--ease-out) 250ms both;
}
.lb-card-head { padding: var(--s-5); border-bottom: 1px solid var(--border); }
.lb-card-title {
  font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400;
  letter-spacing: -0.025em; color: var(--text); margin: 0; line-height: 1.1;
}
.lb-card-sub { font-size: var(--text-xs); color: var(--text-3); margin: 4px 0 0; font-weight: 500; }

.lb-thead {
  display: flex; align-items: center; gap: var(--s-3);
  padding: 10px var(--s-5);
  background: var(--surface-2); border-bottom: 1px solid var(--border);
  font-size: 10px; font-weight: 700; color: var(--text-3);
  letter-spacing: 0.04em; text-transform: uppercase;
}
.lb-col-courses { width: 88px; text-align: center; }
.lb-rows { list-style: none; margin: 0; padding: 0; }
.lb-row {
  display: flex; align-items: center; gap: var(--s-3);
  padding: 12px var(--s-5); border-bottom: 1px solid var(--border);
  transition: background var(--duration-fast) var(--ease);
  opacity: 0; animation: lbFadeIn 400ms var(--ease-out) forwards;
}
.lb-row:last-child { border-bottom: none; }
.lb-row:hover { background: var(--surface-2); }
.lb-row--me {
  background: var(--accent-soft) !important;
  box-shadow: inset 3px 0 0 var(--accent);
}

.lb-rank-cell { width: 56px; text-align: center; flex-shrink: 0; }
.lb-medal { display: inline-grid; place-items: center; }
.lb-medal--1 { color: #F59E0B; filter: drop-shadow(0 2px 4px rgba(245,158,11,0.4)); }
.lb-medal--2 { color: #94A3B8; }
.lb-medal--3 { color: #C2410C; }
.lb-num {
  display: inline-block;
  font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 600;
  color: var(--text-3); font-variant-numeric: tabular-nums;
}
.lb-user { display: flex; align-items: center; gap: var(--s-3); flex: 1; min-width: 0; }
.lb-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  color: #fff; font-size: 13px; font-weight: 700;
  display: grid; place-items: center;
  flex-shrink: 0; letter-spacing: -0.01em;
  overflow: hidden;
}
.lb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-avatar--gold    { background: linear-gradient(135deg, #FBBF24, #F59E0B); box-shadow: 0 0 0 2px rgba(251,191,36,0.30); }
.lb-avatar--silver  { background: linear-gradient(135deg, #D1D5DB, #9CA3AF); }
.lb-avatar--bronze  { background: linear-gradient(135deg, #FB923C, #C2410C); }
.lb-avatar--me      { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); }
.lb-avatar--default { background: linear-gradient(135deg, #0a1628, #1e3a5f); }

.lb-name {
  font-size: var(--text-sm); font-weight: 600; color: var(--text);
  display: flex; align-items: center; gap: var(--s-2);
  letter-spacing: -0.01em;
}
.lb-you {
  font-size: 9px; font-weight: 700; background: var(--accent); color: var(--accent-text);
  padding: 2px 8px; border-radius: 99px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.lb-code {
  font-size: var(--text-xs); color: var(--text-3); margin-top: 2px;
  font-family: var(--font-mono);
}
.lb-courses-val {
  font-size: var(--text-sm); font-weight: 600; color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.lb-points {
  width: 90px; text-align: right;
  font-family: var(--font-display); font-size: var(--text-lg); font-weight: 400;
  color: var(--text); letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums; flex-shrink: 0;
}

/* Animations */
@keyframes lbFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lbFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes lbBob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}

/* Responsive */
@media (max-width: 900px) {
  .lb-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
  .lb-podium-stage { padding: var(--s-5) var(--s-3) var(--s-2); }
  .lb-col-courses { display: none; }
  .lb-thead, .lb-row { padding-left: var(--s-4); padding-right: var(--s-4); }
  .lb-hero-title { font-size: var(--text-3xl); }
  .pod-bar--1 { height: 80px; }
  .pod-bar--2 { height: 56px; }
  .pod-bar--3 { height: 40px; }
}
@media (max-width: 480px) {
  .pod-avatar { width: 44px; height: 44px; font-size: 16px; }
  .pod--1 .pod-avatar { width: 56px; height: 56px; font-size: 20px; }
}
/* Tabs */
.lb-tabs {
  display: flex; gap: 4px; margin-bottom: var(--s-4);
  background: var(--surface); border-radius: var(--r-md);
  padding: 4px; box-shadow: var(--ring);
  width: fit-content;
}
.lb-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--r-sm);
  border: none; cursor: pointer;
  font-family: inherit; font-size: var(--text-sm); font-weight: 600;
  color: var(--text-3); background: transparent;
  transition: all var(--duration-fast) var(--ease);
}
.lb-tab:hover { color: var(--text); background: var(--surface-2); }
.lb-tab--active { background: var(--accent); color: var(--accent-text); }
.lb-dept-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--accent-soft); color: var(--accent);
  display: grid; place-items: center; flex-shrink: 0;
}
`;
