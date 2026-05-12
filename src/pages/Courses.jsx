import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiBookOpenLine, RiPlayFill, RiFileTextLine, RiLinkM, RiCheckboxLine,
  RiArrowDownSLine, RiArrowRightSLine, RiArrowLeftLine,
  RiHeartLine, RiHeartFill, RiSearchLine, RiFilter3Line, RiStarFill,
  RiTimeLine, RiTeamLine, RiCheckLine, RiCloseLine, RiLockLine,
  RiBookOpenFill, RiRefreshLine, RiSettings3Line, RiAddLine, RiFolder3Line,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';

/* ═══════════════════════════════════════════════════════════════════
   COURSE CARD — Premium grid card
   ═══════════════════════════════════════════════════════════════════ */
function CourseCard({ course, onOpen, onWishlist, idx }) {
  const pct      = course.completed ? 100 : Math.round(course.progress_percentage ?? 0);
  const enrolled = course.enrolled ?? !!course.learner_id;
  const isDone   = !!course.completed;

  return (
    <article
      className="cc"
      onClick={() => onOpen(course)}
      style={{ animationDelay: `${Math.min(idx * 50, 400)}ms` }}
    >
      <div className="cc-img-wrap">
        {course.image_url ? (
          <img src={course.image_url} alt={course.name} className="cc-img"/>
        ) : (
          <div className="cc-img-empty"><RiBookOpenLine size={28}/></div>
        )}
        <span className="cc-type">{course.type_name || 'E-Learning'}</span>
        <button
          className="cc-heart"
          onClick={e => { e.stopPropagation(); onWishlist(course); }}
          aria-label={course.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {course.wishlisted ? <RiHeartFill size={14}/> : <RiHeartLine size={14}/>}
        </button>
      </div>

      <div className="cc-body">
        <h3 className="cc-title">{course.name}</h3>
        {course.category_name && (
          <div className="cc-category">
            <RiFolder3Line size={11}/>
            <span>{course.category_name}</span>
          </div>
        )}
        <div className="cc-meta">
          <span><RiTeamLine size={11}/>{course.learner_count ?? 0} learners</span>
          <span className="cc-rating"><RiStarFill size={11}/>{course.rating ?? '—'}</span>
        </div>

        {enrolled && (
          <div className="cc-progress">
            <div className="cc-track">
              <div
                className={`cc-fill ${isDone ? 'cc-fill--done' : ''}`}
                style={{ width: pct + '%' }}
              />
            </div>
            <span className={`cc-pct ${isDone ? 'cc-pct--done' : ''}`}>{pct}%</span>
          </div>
        )}

        <div className="cc-foot">
          {enrolled ? (
            <span className={`cc-badge cc-badge--${isDone ? 'done' : 'enrolled'}`}>
              {isDone ? <><RiCheckLine size={11}/>Completed</> : <><RiPlayFill size={11}/>Continue</>}
            </span>
          ) : (
            <span className="cc-badge cc-badge--enroll">Enroll now</span>
          )}
          <span className="cc-pts">
            <RiStarFill size={11}/>{course.points ?? 0} pts
          </span>
        </div>
      </div>
    </article>
  );
}

/* ─── Topic icon by type ─── */
function topicIcon(type) {
  if (type === 1) return <RiPlayFill size={13}/>;
  if (type === 2) return <RiFileTextLine size={13}/>;
  if (type === 3) return <RiLinkM size={13}/>;
  if (type === 4) return <RiCheckboxLine size={13}/>;
  return <RiBookOpenLine size={13}/>;
}

/* ═══════════════════════════════════════════════════════════════════
   TOPIC ASSESSMENT — inline quiz inside a course
   ═══════════════════════════════════════════════════════════════════ */
function TopicAssessment({ topic, courseId, chapterId, onPassed }) {
  const [phase,    setPhase]    = useState('intro');
  const [questions,setQuestions]= useState([]);
  const [answers,  setAnswers]  = useState({});
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  useEffect(() => {
    setPhase('intro'); setQuestions([]); setAnswers({}); setResult(null); setError('');
  }, [topic.id]);

  const startAssessment = async () => {
    setPhase('loading'); setError('');
    try {
      const res = await API.get('/Webservice/getCourseTopicQuestions', { params: { topicID: topic.id } });
      if (res.data.code === 1 && (res.data.data || []).length > 0) {
        setQuestions(res.data.data); setPhase('quiz');
      } else {
        setError('No questions found for this assessment.'); setPhase('intro');
      }
    } catch {
      setError('Could not load questions. Please try again.'); setPhase('intro');
    }
  };

  const submit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.'); return;
    }
    setPhase('submitting'); setError('');
    try {
      const res = await API.post('/Webservice/submitTopicTest', {
        courseID: courseId, chapterID: chapterId ?? topic.chapter_id, topicID: topic.id, answers,
      });
      if (res.data.code === 1) {
        setResult(res.data.data); setPhase('result');
        if (res.data.data?.passed) onPassed && onPassed();
      } else {
        setError(res.data.message || 'Submission failed.'); setPhase('quiz');
      }
    } catch {
      setError('Submission failed. Please try again.'); setPhase('quiz');
    }
  };

  const retry = () => { setPhase('intro'); setAnswers({}); setResult(null); setError(''); };

  if (phase === 'intro' || phase === 'loading') {
    return (
      <div className="ta-wrap">
        <div className="ta-icon"><RiCheckboxLine size={26}/></div>
        <h3 className="ta-title">Topic assessment</h3>
        <p className="ta-sub">Test your knowledge for this topic.</p>
        {topic.passing_percentage > 0 && (
          <div className="ta-meta">Passing: <strong>{topic.passing_percentage}%</strong></div>
        )}
        {error && <div className="ta-error">{error}</div>}
        <button className="cr-btn cr-btn--primary" onClick={startAssessment} disabled={phase === 'loading'}>
          {phase === 'loading' ? 'Loading…' : 'Start assessment'}
        </button>
      </div>
    );
  }

  if (phase === 'quiz' || phase === 'submitting') {
    return (
      <div className="ta-quiz">
        {questions.map((q, idx) => (
          <article key={q.id} className="ta-q">
            <h4 className="ta-q-text">Q{idx + 1}. {q.question_text || q.question || q.text}</h4>
            {(q.options || []).map(opt => {
              const sel = answers[q.id] === opt.id;
              return (
                <label key={opt.id} className={`ta-opt ${sel ? 'ta-opt--sel' : ''}`}>
                  <input type="radio" name={`q_${q.id}`} checked={sel}
                         onChange={() => setAnswers(p => ({ ...p, [q.id]: opt.id }))}/>
                  <span>{opt.option_text || opt.option || opt.text}</span>
                </label>
              );
            })}
          </article>
        ))}
        {error && <div className="ta-error">{error}</div>}
        <button className="cr-btn cr-btn--primary cr-btn--full"
                onClick={submit} disabled={phase === 'submitting'}>
          {phase === 'submitting' ? 'Submitting…' : 'Submit assessment'}
        </button>
      </div>
    );
  }

  // result
  const passed = !!result?.passed;
  const scorePct = result?.percentage ?? result?.score ?? 0;
  const correct  = result?.correct ?? 0;
  const total    = result?.total_q ?? result?.total ?? questions.length;
  return (
    <div className="ta-wrap">
      <div className={`ta-result-icon ${passed ? 'ta-result-icon--ok' : 'ta-result-icon--fail'}`}>
        {passed ? <RiCheckLine size={28}/> : <RiCloseLine size={28}/>}
      </div>
      <h3 className="ta-title">{passed ? 'Passed!' : 'Not passed'}</h3>
      <div className="ta-result-score">{scorePct}%</div>
      <div className="ta-meta">{correct} of {total} correct</div>
      {!passed && (
        <button className="cr-btn cr-btn--primary" onClick={retry} style={{ marginTop: 16 }}>
          Try again
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COURSE DETAIL — chapters + topic player
   ═══════════════════════════════════════════════════════════════════ */
function CourseDetail({ course, onBack }) {
  const [detail,      setDetail]      = useState(null);
  const [chapters,    setChapters]    = useState([]);
  const [openCh,      setOpenCh]      = useState({});
  const [activeTopic, setActiveTopic] = useState(null);
  const [enrolling,   setEnrolling]   = useState(false);
  const [enrolled,    setEnrolled]    = useState(course.enrolled ?? !!course.learner_id);
  const [loading,     setLoading]     = useState(true);
  const [feedbackTxt, setFeedbackTxt] = useState('');
  const [feedSent,    setFeedSent]    = useState(false);

  const timerRef        = useRef(null);
  const autoCompleteRef = useRef(null);
  const MIN_READ_SECS   = 60;

  useEffect(() => {
    loadDetail();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(autoCompleteRef.current);
    };
  }, []);

  const loadDetail = async () => {
    try {
      const [detRes, chapRes] = await Promise.all([
        API.get('/Webservice/getCourseDetailsWS',     { params: { courseID: course.id } }),
        API.get('/Webservice/getCourseChapterDetails', { params: { courseID: course.id } }),
      ]);
      if (detRes.data.code  === 1) setDetail(detRes.data.data);
      if (chapRes.data.code === 1) {
        const chs = chapRes.data.data || [];
        setChapters(chs);
        if (chs.length > 0) setOpenCh({ [chs[0].id]: true });
      }
    } catch {}
    setLoading(false);
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await API.post('/Webservice/enrollSelf', { courseID: course.id });
      if (res.data.code === 1) { setEnrolled(true); loadDetail(); }
    } catch {}
    setEnrolling(false);
  };

  const openTopic = (topic) => {
    setActiveTopic(topic);
    clearTimeout(autoCompleteRef.current);
    if (!topic.completed) {
      let delayMs = null;
      if (topic.topic_type === 2) {
        delayMs = MIN_READ_SECS * 1000;
      } else if (topic.topic_type === 1) {
        const url = (topic.file_url || topic.fileURL || '').toLowerCase();
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        if (isYouTube) {
          const dur = parseInt(topic.duration, 10);
          delayMs = (dur > 0 ? dur : 180) * 1000;
        }
      }
      if (delayMs) autoCompleteRef.current = setTimeout(() => markComplete(topic), delayMs);
    }

    clearInterval(timerRef.current);
    let secs = 0;
    timerRef.current = setInterval(() => {
      secs += 10;
      API.post('/Webservice/updateTopicTimeWS', {
        courseID: course.id, topicID: topic.id, time: secs,
      }).catch(() => {});
    }, 10000);
  };

  const markComplete = async (topic) => {
    try {
      await API.post('/Webservice/markAsComplete', { courseID: course.id, topicID: topic.id });
      setActiveTopic(prev => prev && prev.id === topic.id ? { ...prev, completed: 1 } : prev);
      loadDetail();
    } catch {}
  };

  const sendFeedback = async () => {
    if (!feedbackTxt.trim()) return;
    try {
      await API.post('/Webservice/addFeedBackWS', { courseID: course.id, star: 5, comment: feedbackTxt });
      setFeedSent(true); setFeedbackTxt('');
    } catch {}
  };

  if (loading) return <div className="cr-state">Loading course…</div>;

  const totalTopics = chapters.reduce((a, c) => a + (c.topics?.length ?? 0), 0);
  const doneTopics  = chapters.reduce((a, c) => a + (c.topics?.filter(t => t.completed)?.length ?? 0), 0);
  const pct         = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;

  return (
    <>
      {/* Header bar */}
      <div className="cd-header">
        <button className="cr-btn cr-btn--ghost" onClick={onBack}>
          <RiArrowLeftLine size={14}/>Back
        </button>
        <h1 className="cd-h-title">{course.name}</h1>
        {!enrolled && (
          <button className="cr-btn cr-btn--primary" onClick={handleEnroll} disabled={enrolling}>
            {enrolling ? 'Enrolling…' : 'Enroll now'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="cd-body">
        {/* Left column — chapters/topics */}
        <aside className="cd-left">
          {/* Progress */}
          <div className="cd-progress-card">
            <div className="cd-pcard-row">
              <span className="cd-pcard-label">Your progress</span>
              <span className={`cd-pcard-pct ${pct === 100 ? 'cd-pcard-pct--done' : ''}`}>{pct}%</span>
            </div>
            <div className="cd-track">
              <div className={`cd-fill ${pct === 100 ? 'cd-fill--done' : ''}`} style={{ width: pct + '%' }}/>
            </div>
            <div className="cd-pcard-meta">{doneTopics} of {totalTopics} topics completed</div>
          </div>

          {/* Chapters */}
          {chapters.length === 0 ? (
            <div className="cd-empty">No chapters yet.</div>
          ) : chapters.map(ch => (
            <div key={ch.id} className="cd-chapter">
              <button className="cd-ch-head"
                      onClick={() => setOpenCh(p => ({ ...p, [ch.id]: !p[ch.id] }))}>
                <span className="cd-ch-title">{ch.chapter_name || ch.name}</span>
                <span className="cd-ch-right">
                  <span className="cd-ch-count">{ch.topics?.length ?? 0} topics</span>
                  {openCh[ch.id] ? <RiArrowDownSLine size={15}/> : <RiArrowRightSLine size={15}/>}
                </span>
              </button>
              {openCh[ch.id] && (
                <div className="cd-topics">
                  {(ch.topics || []).map(t => {
                    const isActive = activeTopic?.id === t.id;
                    const isDone   = !!t.completed;
                    const locked   = !enrolled;
                    return (
                      <button key={t.id}
                              className={`cd-topic ${isActive ? 'cd-topic--active' : ''} ${isDone ? 'cd-topic--done' : ''}`}
                              onClick={() => !locked && openTopic(t)}
                              disabled={locked}
                              title={locked ? 'Enroll to access' : t.topic_name}>
                        <span className="cd-topic-icon">
                          {isDone ? <RiCheckLine size={13}/> : locked ? <RiLockLine size={12}/> : topicIcon(t.topic_type)}
                        </span>
                        <span className="cd-topic-name">{t.topic_name || t.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Feedback */}
          {enrolled && (
            <div className="cd-feedback">
              <div className="cd-feed-title">Leave feedback</div>
              {feedSent ? (
                <div className="cd-feed-thanks">
                  <RiCheckLine size={14}/>Thanks for your feedback!
                </div>
              ) : (
                <>
                  <textarea className="cr-input" rows={3}
                            placeholder="Share your thoughts about this course…"
                            value={feedbackTxt}
                            onChange={e => setFeedbackTxt(e.target.value)}/>
                  <button className="cr-btn cr-btn--primary cr-btn--full"
                          onClick={sendFeedback} style={{ marginTop: 10 }}>
                    Submit feedback
                  </button>
                </>
              )}
            </div>
          )}
        </aside>

        {/* Right column — topic player */}
        <main className="cd-right">
          {!activeTopic ? (
            <div className="cd-empty-player">
              <div className="cd-empty-icon"><RiBookOpenFill size={28}/></div>
              <h3 className="cd-empty-title">
                {enrolled ? 'Select a topic to start' : 'Enroll to access content'}
              </h3>
              <p className="cd-empty-sub">
                {enrolled
                  ? 'Choose any topic from the left panel.'
                  : 'Click "Enroll now" to begin your learning journey.'}
              </p>
              {!enrolled && (
                <button className="cr-btn cr-btn--primary" style={{ marginTop: 16 }}
                        onClick={handleEnroll} disabled={enrolling}>
                  {enrolling ? 'Enrolling…' : 'Enroll now'}
                </button>
              )}
            </div>
          ) : (
            <div className="cd-player">
              <h2 className="cd-player-title">
                <span className="cd-player-icon">{topicIcon(activeTopic.topic_type)}</span>
                {activeTopic.topic_name || activeTopic.name}
              </h2>

              {activeTopic.topic_type === 1 && (activeTopic.file_url || activeTopic.fileURL) && (
                <video controls className="cd-video"
                       src={activeTopic.file_url || activeTopic.fileURL}
                       onEnded={() => markComplete(activeTopic)}/>
              )}

              {activeTopic.topic_type === 2 && (activeTopic.file_url || activeTopic.fileURL) && (
                <iframe src={activeTopic.file_url || activeTopic.fileURL} title="PDF Viewer"
                        className="cd-pdf"/>
              )}

              {activeTopic.topic_type === 3 && (
                <div className="cd-resources">
                  <div className="cd-res-label">External resources</div>
                  {(activeTopic.resource_links || activeTopic.resourceLinks || []).map((r, i) => (
                    <a key={i} href={r.link || r.url} target="_blank" rel="noreferrer"
                       className="cd-res-link"
                       onClick={() => { if (!activeTopic.completed) markComplete(activeTopic); }}>
                      <RiLinkM size={14}/> {r.name || r.title || r.link}
                    </a>
                  ))}
                </div>
              )}

              {activeTopic.topic_type === 4 && (
                <TopicAssessment
                  topic={activeTopic}
                  courseId={course.id}
                  chapterId={activeTopic.chapter_id}
                  onPassed={() => markComplete(activeTopic)}
                />
              )}

              {activeTopic.description && (
                <div className="cd-desc"
                     dangerouslySetInnerHTML={{ __html: activeTopic.description }}/>
              )}

              {!!activeTopic.completed && (
                <div className="cd-done-pill">
                  <RiCheckLine size={13}/>Completed
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COURSES PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function Courses() {
  const navigate = useNavigate();
  const [courses,   setCourses]   = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [cats,      setCats]      = useState([]);
  const [selCat,    setSelCat]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [tab,       setTab]       = useState('my');
  const [loading,   setLoading]   = useState(true);
  const [selCourse, setSelCourse] = useState(null);

  /* Admin / Trainer detection — shows the "Admin" tab to manage courses */
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  let userRoles = user?.role;
  if (!Array.isArray(userRoles)) userRoles = userRoles ? [Number(userRoles)] : [3];
  userRoles = userRoles.map(Number);
  const isAdmin = userRoles.includes(1) || userRoles.includes(2);

  useEffect(() => { loadData(); }, [tab]);

  useEffect(() => {
    let list = courses;
    if (selCat !== 'all') list = list.filter(c => c.category_id == selCat);
    if (search.trim())    list = list.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [courses, selCat, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, catRes] = await Promise.all([
        tab === 'my'
          ? API.get('/Webservice/getMycoursesInprogress')
          : API.get('/Webservice/getCatalogCourseList'),
        API.get('/Webservice/getCategories'),
      ]);
      if (cRes.data.code   === 1) setCourses(cRes.data.data || []);
      if (catRes.data.code === 1) setCats(catRes.data.data || []);
    } catch {}
    setLoading(false);
  };

  const toggleWishlist = async (course) => {
    try {
      await API.post('/Webservice/anrToWishlistWS', { courseID: course.id });
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, wishlisted: !c.wishlisted } : c));
    } catch {}
  };

  /* ── Course detail view ── */
  if (selCourse) {
    return (
      <AppShell>
        <style>{CSS}</style>
        <CourseDetail course={selCourse} onBack={() => setSelCourse(null)}/>
      </AppShell>
    );
  }

  /* ── Counts for hero ── */
  const myCount      = courses.filter(c => c.enrolled || c.learner_id).length;
  const completed    = courses.filter(c => c.completed).length;

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* Hero */}
      <header className="cr-hero">
        <div>
          <div className="cr-eyebrow">
            {tab === 'my' ? 'Your learning' : 'Discover new'}
          </div>
          <h1 className="cr-title">Courses.</h1>
          <p className="cr-sub">
            {loading
              ? 'Loading…'
              : tab === 'my'
                ? `${myCount} ${myCount === 1 ? 'course' : 'courses'} enrolled · ${completed} completed.`
                : `Browse the catalog and enroll in courses that match your goals.`
            }
          </p>
        </div>
        {isAdmin && (
          <button className="cr-btn cr-btn--primary"
                  onClick={() => navigate('/admin/courses')}>
            <RiSettings3Line size={14}/>Manage courses
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="cr-tabs">
        {[['catalog', 'Catalog'],['my', 'My courses']].map(([val, lbl]) => (
          <button key={val}
                  className={`cr-tab ${tab === val ? 'cr-tab--active' : ''}`}
                  onClick={() => setTab(val)}>
            {lbl}
          </button>
        ))}
        {isAdmin && (
          <button className="cr-tab cr-tab--admin"
                  onClick={() => navigate('/admin/courses')}>
            <RiSettings3Line size={11}/>Admin panel
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="cr-toolbar">
        <div className="cr-search">
          <RiSearchLine size={14}/>
          <input placeholder="Search courses…" value={search}
                 onChange={e => setSearch(e.target.value)}/>
          {search && (
            <button className="cr-search-clear" onClick={() => setSearch('')}>
              <RiCloseLine size={13}/>
            </button>
          )}
        </div>
        <div className="cr-filter">
          <RiFilter3Line size={13}/>
          <select value={selCat} onChange={e => setSelCat(e.target.value)}>
            <option value="all">All categories</option>
            {cats.map(c => (
              <option key={c.id} value={c.id}>{c.category_name || c.name}</option>
            ))}
          </select>
        </div>
        <button className="cr-btn cr-btn--ghost cr-btn--sm" onClick={loadData}>
          <RiRefreshLine size={13}/>Refresh
        </button>
      </div>

      <div className="cr-count">
        {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'course' : 'courses'}`}
      </div>

      {/* Grid / Empty */}
      {loading ? (
        <div className="cr-grid">
          {[...Array(6)].map((_, i) => <div key={i} className="cr-skel"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="cr-empty">
          <div className="cr-empty-icon"><RiBookOpenLine size={28}/></div>
          <div className="cr-empty-title">
            {search ? 'No courses found' : tab === 'my' ? 'No courses enrolled' : 'No courses available'}
          </div>
          <div className="cr-empty-sub">
            {search
              ? 'Try a different search term.'
              : tab === 'my'
                ? 'Browse the catalog and enroll in your first course.'
                : 'Try adjusting your filters.'}
          </div>
          {tab === 'my' && !search && (
            <button className="cr-btn cr-btn--primary" onClick={() => setTab('catalog')}
                    style={{ marginTop: 16 }}>
              Browse catalog
            </button>
          )}
        </div>
      ) : (
        <div className="cr-grid">
          {filtered.map((c, i) => (
            <CourseCard key={c.id} course={c} idx={i}
                        onOpen={setSelCourse}
                        onWishlist={toggleWishlist}/>
          ))}
        </div>
      )}
    </AppShell>
  );
}

const CSS = `
/* ── Hero ── */
.cr-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--s-4); margin-bottom: var(--s-5); flex-wrap: wrap; animation: crFadeUp 600ms var(--ease-out); }
.cr-eyebrow { font-size: var(--text-sm); color: var(--text-3); font-weight: 500; margin-bottom: 6px; }
.cr-title { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 400; letter-spacing: -0.03em; color: var(--text); margin: 0 0 6px; line-height: 1; }
.cr-sub { font-size: var(--text-md); color: var(--text-2); margin: 0; line-height: 1.5; max-width: 540px; }

/* ── Tabs ── */
.cr-tabs { display: inline-flex; gap: 2px; background: var(--surface-2); border-radius: var(--r-md); padding: 3px; margin-bottom: var(--s-3); animation: crFadeUp 500ms var(--ease-out) 100ms both; }
.cr-tab { padding: 7px 16px; border: none; background: transparent; border-radius: 7px; font-family: inherit; font-size: var(--text-base); font-weight: 600; color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); letter-spacing: -0.005em; }
.cr-tab:hover { color: var(--text-2); }
.cr-tab--active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-xs); }
.cr-tab--admin { display: inline-flex; align-items: center; gap: 5px; margin-left: 4px; color: var(--accent); }
.cr-tab--admin:hover { color: var(--accent-hover); background: var(--accent-soft); }

/* ── Toolbar ── */
.cr-toolbar { display: flex; gap: var(--s-2); margin-bottom: 10px; flex-wrap: wrap; align-items: center; }
.cr-search { display: flex; align-items: center; gap: var(--s-2); padding: 9px 12px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--shadow-sm), var(--ring); flex: 1; min-width: 200px; max-width: 480px; color: var(--text-3); transition: box-shadow var(--duration-fast) var(--ease); }
.cr-search:focus-within { box-shadow: var(--ring-focus); }
.cr-search input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: var(--text-base); color: var(--text); }
.cr-search input::placeholder { color: var(--text-3); }
.cr-search-clear { background: none; border: none; padding: 2px; display: grid; place-items: center; color: var(--text-3); border-radius: 4px; cursor: pointer; }
.cr-search-clear:hover { background: var(--surface-2); color: var(--text); }
.cr-filter { display: flex; align-items: center; gap: 6px; padding: 9px 12px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--shadow-sm), var(--ring); color: var(--text-3); min-width: 180px; }
.cr-filter select { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: var(--text-base); color: var(--text); cursor: pointer; }

.cr-count { font-size: var(--text-xs); color: var(--text-3); font-weight: 500; margin-bottom: var(--s-3); letter-spacing: -0.005em; }

/* ── Buttons ── */
.cr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; cursor: pointer; letter-spacing: -0.005em; transition: all var(--duration-fast) var(--ease); }
.cr-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.cr-btn:active:not(:disabled) { transform: scale(0.97); }
.cr-btn--sm { padding: 7px 11px; font-size: var(--text-xs); }
.cr-btn--full { width: 100%; justify-content: center; }
.cr-btn--primary { background: var(--accent); color: var(--accent-text); box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent); }
.cr-btn--primary:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
.cr-btn--ghost { background: var(--surface); border-color: var(--border-strong); color: var(--text); }
.cr-btn--ghost:hover:not(:disabled) { background: var(--surface-2); }

/* ── State / empty ── */
.cr-state { text-align: center; padding: var(--s-9); color: var(--text-3); font-size: var(--text-sm); }
.cr-empty { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm), var(--ring); padding: var(--s-9) var(--s-4); text-align: center; animation: crFadeUp 500ms var(--ease-out); }
.cr-empty-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; margin: 0 auto var(--s-3); }
.cr-empty-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; color: var(--text); letter-spacing: -0.025em; margin-bottom: 4px; }
.cr-empty-sub { font-size: var(--text-sm); color: var(--text-3); max-width: 340px; margin: 0 auto; }

/* ── Grid ── */
.cr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
.cr-skel { background: var(--surface-2); border-radius: var(--r-lg); height: 320px; animation: crShimmer 1.5s ease-in-out infinite; }
@keyframes crShimmer { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.9; } }

/* ── Course Card ── */
.cc { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm), var(--ring); overflow: hidden; cursor: pointer; opacity: 0; animation: crFadeUp 500ms var(--ease-out) forwards; transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease); display: flex; flex-direction: column; }
.cc:hover { transform: translateY(-3px); box-shadow: var(--shadow-md), var(--ring); }
.cc-img-wrap { position: relative; aspect-ratio: 16/9; overflow: hidden; background: var(--surface-2); }
.cc-img { width: 100%; height: 100%; object-fit: cover; transition: transform 400ms var(--ease); }
.cc:hover .cc-img { transform: scale(1.04); }
.cc-img-empty { width: 100%; height: 100%; display: grid; place-items: center; color: var(--text-3); }
.cc-type { position: absolute; top: 10px; left: 10px; padding: 3px 9px; background: rgba(0, 0, 0, 0.65); color: #fff; font-size: 10px; font-weight: 700; border-radius: 99px; letter-spacing: 0.04em; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.cc-heart { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.95); color: var(--text-2); display: grid; place-items: center; cursor: pointer; transition: all var(--duration-fast) var(--ease); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.cc-heart:hover { background: #fff; transform: scale(1.1); color: #ef4444; }

.cc-body { padding: var(--s-4); display: flex; flex-direction: column; gap: 8px; flex: 1; }
.cc-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.02em; color: var(--text); margin: 0; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cc-category { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--accent); background: var(--accent-soft); padding: 3px 8px; border-radius: 99px; font-weight: 600; align-self: flex-start; letter-spacing: -0.005em; }
.cc-category > svg { flex-shrink: 0; }
.cc-meta { display: flex; gap: var(--s-3); font-size: var(--text-xs); color: var(--text-3); font-weight: 500; }
.cc-meta span { display: inline-flex; align-items: center; gap: 4px; }
.cc-rating { color: var(--warning); font-weight: 600; }

.cc-progress { display: flex; align-items: center; gap: 8px; }
.cc-track { flex: 1; height: 4px; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
.cc-fill { height: 100%; background: var(--accent); transition: width 600ms var(--ease-out); }
.cc-fill--done { background: var(--success); }
.cc-pct { font-size: var(--text-xs); font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; min-width: 32px; text-align: right; }
.cc-pct--done { color: var(--success); }

.cc-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); margin-top: auto; padding-top: 4px; }
.cc-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: 0.02em; }
.cc-badge--enrolled { background: var(--accent-soft); color: var(--accent); }
.cc-badge--done     { background: var(--success-soft); color: var(--success); }
.cc-badge--enroll   { background: var(--info-soft); color: var(--info); }
.cc-pts { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-xs); color: var(--text-2); font-weight: 600; }
.cc-pts svg { color: var(--warning); }

/* ═══ Course Detail ═══ */
.cd-header { display: flex; align-items: center; gap: var(--s-3); margin-bottom: var(--s-5); padding-bottom: var(--s-3); border-bottom: 1px solid var(--border); }
.cd-h-title { flex: 1; font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0; line-height: 1.05; }

.cd-body { display: grid; grid-template-columns: 340px 1fr; gap: var(--s-5); }
@media (max-width: 980px) { .cd-body { grid-template-columns: 1fr; } }

/* Left col */
.cd-left { display: flex; flex-direction: column; gap: var(--s-3); }
.cd-progress-card { background: var(--surface); border-radius: var(--r-md); padding: var(--s-4); box-shadow: var(--shadow-sm), var(--ring); }
.cd-pcard-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.cd-pcard-label { font-size: var(--text-sm); font-weight: 600; color: var(--text); }
.cd-pcard-pct { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 400; color: var(--accent); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.cd-pcard-pct--done { color: var(--success); }
.cd-track { height: 5px; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
.cd-fill { height: 100%; background: var(--accent); transition: width 600ms var(--ease-out); }
.cd-fill--done { background: var(--success); }
.cd-pcard-meta { font-size: var(--text-xs); color: var(--text-3); margin-top: 6px; }

.cd-empty { background: var(--surface); border-radius: var(--r-md); padding: var(--s-5); text-align: center; color: var(--text-3); font-size: var(--text-sm); }

.cd-chapter { background: var(--surface); border-radius: var(--r-md); box-shadow: var(--shadow-sm), var(--ring); overflow: hidden; }
.cd-ch-head { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: transparent; border: none; font-family: inherit; font-size: var(--text-base); color: var(--text); cursor: pointer; transition: background var(--duration-fast) var(--ease); }
.cd-ch-head:hover { background: var(--surface-2); }
.cd-ch-title { font-weight: 600; letter-spacing: -0.005em; text-align: left; }
.cd-ch-right { display: flex; align-items: center; gap: 8px; color: var(--text-3); }
.cd-ch-count { font-size: var(--text-xs); font-weight: 500; }

.cd-topics { padding: 4px; border-top: 1px solid var(--border); }
.cd-topic { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: transparent; border: none; font-family: inherit; font-size: var(--text-base); color: var(--text-2); text-align: left; border-radius: var(--r-sm); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.cd-topic:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.cd-topic:disabled { cursor: not-allowed; opacity: 0.55; }
.cd-topic--active { background: var(--accent-soft) !important; color: var(--accent) !important; font-weight: 600; }
.cd-topic--done { color: var(--success); }
.cd-topic-icon { display: grid; place-items: center; width: 20px; height: 20px; flex-shrink: 0; }
.cd-topic-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cd-feedback { background: var(--surface); border-radius: var(--r-md); padding: var(--s-4); box-shadow: var(--shadow-sm), var(--ring); }
.cd-feed-title { font-size: var(--text-base); font-weight: 600; color: var(--text); margin-bottom: 10px; letter-spacing: -0.005em; }
.cd-feed-thanks { display: flex; align-items: center; gap: 6px; color: var(--success); font-size: var(--text-sm); font-weight: 600; padding: 8px 0; }

/* Right col */
.cd-right { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm), var(--ring); overflow: hidden; min-height: 400px; }
.cd-empty-player { padding: var(--s-9) var(--s-4); text-align: center; }
.cd-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; margin: 0 auto var(--s-3); }
.cd-empty-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; color: var(--text); letter-spacing: -0.025em; margin: 0 0 8px; }
.cd-empty-sub { font-size: var(--text-sm); color: var(--text-3); max-width: 320px; margin: 0 auto; }

.cd-player { padding: var(--s-5); }
.cd-player-title { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0 0 var(--s-4); line-height: 1.2; }
.cd-player-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; flex-shrink: 0; }

.cd-video { width: 100%; border-radius: var(--r-md); background: #000; aspect-ratio: 16/9; }
.cd-pdf { width: 100%; height: 600px; border: none; border-radius: var(--r-md); }

.cd-resources { padding: 12px 0; }
.cd-res-label { font-size: var(--text-sm); color: var(--text-3); margin-bottom: 10px; font-weight: 500; }
.cd-res-link { display: flex; align-items: center; gap: 8px; padding: 11px 14px; background: var(--surface-2); border-radius: var(--r-md); color: var(--text); text-decoration: none; font-size: var(--text-base); font-weight: 500; margin-bottom: 8px; transition: all var(--duration-fast) var(--ease); }
.cd-res-link:hover { background: var(--accent-soft); color: var(--accent); transform: translateX(2px); }

.cd-desc { font-size: var(--text-base); color: var(--text-2); line-height: 1.6; margin-top: var(--s-4); padding-top: var(--s-4); border-top: 1px solid var(--border); }

.cd-done-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; background: var(--success-soft); color: var(--success); border-radius: 99px; font-size: var(--text-xs); font-weight: 700; margin-top: var(--s-3); }

/* ═══ Topic Assessment ═══ */
.ta-wrap { padding: var(--s-7) var(--s-4); text-align: center; background: var(--surface-2); border-radius: var(--r-md); margin: var(--s-3) 0; }
.ta-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; margin: 0 auto var(--s-3); }
.ta-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0 0 6px; }
.ta-sub { font-size: var(--text-sm); color: var(--text-3); margin: 0 0 var(--s-3); }
.ta-meta { font-size: var(--text-xs); color: var(--text-3); margin-bottom: var(--s-4); font-weight: 500; }
.ta-error { color: var(--danger); font-size: var(--text-sm); margin-bottom: 12px; }
.ta-result-icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto var(--s-3); color: #fff; }
.ta-result-icon--ok { background: linear-gradient(135deg, #10B981, #059669); }
.ta-result-icon--fail { background: linear-gradient(135deg, #EF4444, #DC2626); }
.ta-result-score { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 400; color: var(--accent); letter-spacing: -0.025em; line-height: 1; margin: 8px 0; font-variant-numeric: tabular-nums; }

.ta-quiz { padding: var(--s-3) 0; }
.ta-q { background: var(--surface); border-radius: var(--r-md); padding: var(--s-4); margin-bottom: var(--s-3); box-shadow: inset 0 0 0 1px var(--border); }
.ta-q-text { font-size: var(--text-md); font-weight: 600; color: var(--text); margin: 0 0 12px; line-height: 1.5; }
.ta-opt { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--surface-2); border: 1px solid transparent; border-radius: var(--r-md); margin-bottom: 6px; cursor: pointer; transition: all var(--duration-fast) var(--ease); font-size: var(--text-base); color: var(--text); }
.ta-opt:hover { background: var(--surface-3); }
.ta-opt--sel { background: var(--accent-soft); border-color: var(--accent); color: var(--text); font-weight: 600; }
.ta-opt input[type=radio] { accent-color: var(--accent); flex-shrink: 0; }

/* ═══ Inputs ═══ */
.cr-input { width: 100%; padding: 9px 12px; background: var(--surface-2); border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); color: var(--text); outline: none; transition: all var(--duration-fast) var(--ease); resize: vertical; }
.cr-input:hover { background: var(--surface-3); }
.cr-input:focus { background: var(--surface); border-color: var(--accent); box-shadow: var(--ring-focus); }

/* ═══ Animations ═══ */
@keyframes crFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ═══ Responsive ═══ */
@media (max-width: 1100px) { .cr-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) {
  .cr-grid { grid-template-columns: 1fr; }
  .cr-title { font-size: var(--text-3xl); }
  .cd-h-title { font-size: var(--text-xl); }
}
`;
