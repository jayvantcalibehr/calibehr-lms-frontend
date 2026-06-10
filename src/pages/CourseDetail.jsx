import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  RiArrowLeftLine, RiArrowRightLine, RiPlayFill, RiFileTextLine,
  RiLinkM, RiCheckboxCircleFill, RiTimeLine, RiTeamLine,
  RiStarFill, RiStarLine, RiHeartLine, RiHeartFill,
  RiArrowDownSLine, RiArrowRightSLine, RiCheckLine, RiCloseLine,
  RiBookOpenLine, RiBookOpenFill, RiInformationLine, RiQuestionLine,
  RiTrophyFill,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';

/* ═══════════════════════════════════════════════════════════════════
   VIDEO PLAYER — supports YouTube + native MP4
   Auto-completes after 90% watch time
   ═══════════════════════════════════════════════════════════════════ */
function VideoPlayer({ url, onComplete, videoType }) {
  const videoRef = useRef(null);
  const [watched, setWatched] = useState(false);

  console.log('[VideoPlayer] url:', url, 'videoType:', videoType);
// const isYoutube = videoType === 2 || 
//   (url && (url.includes('youtube.com') || url.includes('youtu.be')));
	// const isYoutube = url && (url.includes('youtube.com') || url.includes('youtu.be'));
	const isYoutube = !!(url && (url.includes('youtube.com') || url.includes('youtu.be')));

const getYoutubeId = (u) => {
  if (!u) return '';
  // youtube.com/watch?v=ID
  const m1 = u.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m1) return m1[1];
  // youtu.be/ID
  const m2 = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (m2) return m2[1];
  // youtube.com/embed/ID
  const m3 = u.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (m3) return m3[1];
  // Sirf 11 char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(u.trim())) return u.trim();
  return '';
};

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = videoRef.current.currentTime / videoRef.current.duration;
    if (pct > 0.9 && !watched) {
      setWatched(true);
      onComplete?.();
    }
  };

  if (isYoutube) {
    const vid = getYoutubeId(url);
    return (
      <div className="vp-wrap">
        <div className="vp-iframe-wrap">
<iframe
  className="vp-iframe"
  src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1`}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowFullScreen
  referrerPolicy="strict-origin-when-cross-origin"
  title="Course Video"
/>
        </div>
        {!watched && (
          <button
            className="vp-mark-btn"
            onClick={() => { setWatched(true); onComplete?.(); }}
          >
            <RiCheckLine size={14}/>Mark as watched
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="vp-wrap">
      <video
        ref={videoRef}
        className="vp-video"
        controls
        src={url}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PDF VIEWER
   ═══════════════════════════════════════════════════════════════════ */
function PDFViewer({ url, onComplete }) {
  const [marked, setMarked] = useState(false);
  return (
    <div className="vp-wrap">
      <iframe src={url} className="vp-pdf" title="PDF Document"/>
      {!marked && (
        <button
          className="vp-mark-btn"
          onClick={() => { setMarked(true); onComplete?.(); }}
        >
          <RiCheckLine size={14}/>Mark as read
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOPIC TEST — inline quiz
   ═══════════════════════════════════════════════════════════════════ */
function TopicTest({ topic, courseId, chapterId, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [answers,   setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [locked,    setLocked]    = useState(false);
  const [lockMsg,   setLockMsg]   = useState('');

  const [pastAttempts, setPastAttempts] = useState([]);

  useEffect(() => {
    loadQuestions();
    // Load past attempts + check locked status from backend
    API.get('/Webservice/getTopicAttempts', { params: { topicID: topic.id, courseID: courseId } })
      .then(res => {
        if (res.data.code === 1) {
          const data = res.data.data;
          const attempts = data?.attempts || data || [];
          setPastAttempts(attempts);
          if (data?.isLocked) {
            setLocked(true);
            setLockMsg('Attempt limit reached. Please contact admin to unlock.');
          }
        }
      })
      .catch(() => {});
  }, [topic.id]);

  const loadQuestions = async () => {
    setLoading(true);
    setAnswers({}); setSubmitted(false); setResult(null); setLocked(false); setLockMsg('');
    try {
      const res = await API.get('/Webservice/getCourseTopicQuestions', { params: { topicID: topic.id } });
      if (res.data.code === 1) setQuestions(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const res = await API.post('/Webservice/submitTopicTest', {
        courseID:  courseId,
        chapterID: chapterId ?? topic.chapter_id,
        topicID:   topic.id,
        answers,
      });
      if (res.data.code === 1) {
        setResult(res.data.data);
        setSubmitted(true);
        if (res.data.data?.passed) onComplete?.();
        // Reload attempts to check if now locked
        API.get('/Webservice/getTopicAttempts', { params: { topicID: topic.id, courseID: courseId } })
          .then(r => {
            if (r.data.code === 1) {
              const data = r.data.data;
              setPastAttempts(data?.attempts || data || []);
              if (data?.isLocked) {
                setLocked(true);
                setLockMsg('Attempt limit reached. Please contact admin to unlock.');
              }
            }
          }).catch(() => {});
      } else if (res.data.code === 0) {
        // Attempt limit reached — locked
        setLocked(true);
        setLockMsg(res.data.message || 'Attempt limit reached. Please contact admin to unlock.');
      }
    } catch {}
  };

  if (loading) return <div className="ta-state">Loading questions…</div>;

  // Locked state — show message, no retry
  if (locked) {
    return (
      <div className="ta-wrap">
        <div className="ta-result-icon ta-result-icon--fail">
          <RiCloseLine size={28}/>
        </div>
        <h3 className="ta-title">Attempt Limit Reached</h3>
        <p className="ta-msg">{lockMsg}</p>
      </div>
    );
  }

  if (submitted && result) {
    const passed = !!result.passed;
    // Check if locked after this submission (failed attempts >= limit)
    const isNowLocked = !passed && topic.number_of_attempt > 0;
    return (
      <div className="ta-wrap">
        <div className={`ta-result-icon ${passed ? 'ta-result-icon--ok' : 'ta-result-icon--fail'}`}>
          {passed ? <RiCheckLine size={28}/> : <RiCloseLine size={28}/>}
        </div>
        <h3 className="ta-title">{passed ? 'Passed!' : 'Not passed'}</h3>
        <div className="ta-score">{result.percentage ?? 0}%</div>
        <p className="ta-msg">
          {passed
            ? 'Great job! You passed.'
            : `You need ${topic.passing_percentage ?? 75}% to pass. Try again!`}
        </p>
        {!passed && !isNowLocked && (
          <button className="cdp-btn cdp-btn--primary" onClick={loadQuestions}>
            Retry
          </button>
        )}

        {pastAttempts.length > 0 && (
          <div className="ta-past">
            <div className="ta-past-title">Past Attempts</div>
            {pastAttempts.map((a, i) => {
              const ok = a.passed;
              return (
                <div key={i} className={`ta-attempt ${ok ? 'ta-attempt--pass' : 'ta-attempt--fail'}`}>
                  <div className="ta-attempt-left">
                    <div className="ta-attempt-score">{a.percentage}% Score</div>
                    <div className="ta-attempt-meta">
                      You attempt <strong>{a.totalQuestions}</strong> questions and from that <strong>{a.correctAnswers}</strong> answer is correct
                    </div>
                    <div className="ta-attempt-date">
                      {a.answeredOn ? new Date(a.answeredOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                  <div className={`ta-attempt-icon ${ok ? 'ta-attempt-icon--pass' : 'ta-attempt-icon--fail'}`}>
                    {ok ? '✓' : '✗'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div className="ta-quiz">
      <div className="ta-q-header">
        <h3 className="ta-title">{topic.name}</h3>
        <div className="ta-meta">
          {answered} / {questions.length} answered · Pass: {topic.passing_percentage ?? 75}%
        </div>
      </div>
      {questions.map((q, qi) => (
        <article key={q.id} className="ta-q">
          <span className="ta-q-num">Q{qi + 1}</span>
          <h4 className="ta-q-text">{q.question}</h4>
          {(q.options || []).map(opt => {
            const sel = answers[q.id] === opt.id;
            return (
              <label key={opt.id} className={`ta-opt ${sel ? 'ta-opt--sel' : ''}`}>
                <input type="radio" name={`q_${q.id}`} checked={sel}
                       onChange={() => setAnswers(p => ({ ...p, [q.id]: opt.id }))}/>
                <span>{opt.option_text || opt.option}</span>
              </label>
            );
          })}
        </article>
      ))}
      <button
        className="cdp-btn cdp-btn--primary cdp-btn--full"
        onClick={handleSubmit}
        disabled={answered < questions.length}
      >
        <RiCheckLine size={14}/>Submit test ({answered}/{questions.length})
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RESOURCE LINKS
   ═══════════════════════════════════════════════════════════════════ */
function ResourceLinks({ topic }) {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    API.get('/Webservice/getCourseTopicResourceLinks', { params: { topicID: topic.id } })
      .then(r => { if (r.data.code === 1) setLinks(r.data.data || []); })
      .catch(() => {});
  }, [topic.id]);

  return (
    <div className="rs-wrap">
      <div className="rs-title">Resource links</div>
      {links.length === 0 ? (
        <div className="rs-empty">No resources available.</div>
      ) : links.map(l => (
        <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="rs-link">
          <RiLinkM size={14}/>
          <span>{l.title || l.url}</span>
        </a>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COURSE DETAIL PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function CourseDetail() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course,       setCourse]       = useState(null);
  const [chapters,     setChapters]     = useState([]);
  const [activeTopic,  setActiveTopic]  = useState(null);
  const [openChapters, setOpenChapters] = useState({});
  const [completed,    setCompleted]    = useState({});
  const [wishlisted,   setWishlisted]   = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('curriculum');
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [rating,       setRating]       = useState(0);
  const [hoverRating,  setHoverRating]  = useState(0);
  const [review,       setReview]       = useState('');
  const [reviewSent,   setReviewSent]   = useState(false);

  useEffect(() => { loadCourse(); }, [courseId]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      const [cRes, chRes] = await Promise.all([
        API.get('/Webservice/getCourseDetailsMobile',  { params: { courseID: courseId } }),
        API.get('/Webservice/getCourseChapterDetails', { params: { courseID: courseId } }),
      ]);
      if (cRes.data.code === 1) {
        setCourse(cRes.data.data);
        setWishlisted(!!cRes.data.data?.wishlisted);
      }
      if (chRes.data.code === 1) {
        const chs = chRes.data.data || [];
        setChapters(chs);
        if (chs.length > 0) {
          setOpenChapters({ [chs[0].id]: true });
          const firstTopic = chs[0]?.topics?.[0];
          if (firstTopic) setActiveTopic(firstTopic);
        }
        const doneMap = {};
        chs.forEach(ch => (ch.topics || []).forEach(t => {
          if (t.completed) doneMap[t.id] = true;
        }));
        setCompleted(doneMap);
      }
    } catch {}
    setLoading(false);
  };

  const toggleChapter = (id) =>
    setOpenChapters(p => ({ ...p, [id]: !p[id] }));

  const markComplete = async (topicId) => {
    try {
      await API.post('/Webservice/updateTopicStatus', {
        courseID: courseId, topicID: topicId,
      });
      setCompleted(p => ({ ...p, [topicId]: true }));
    } catch {}
  };

  const toggleWishlist = async () => {
    try {
      await API.post('/Webservice/toggleWishlist', { courseID: courseId });
      setWishlisted(p => !p);
    } catch {}
  };

  const sendReview = async () => {
    try {
      await API.post('/Webservice/addCourseFeedback', {
        courseID: courseId,
        star: rating,
        comment: review,
      });
      setReviewSent(true);
    } catch {}
  };

  const totalTopics = chapters.reduce((s, c) => s + (c.topics?.length || 0), 0);
  const doneTopics  = Object.keys(completed).length;
  const progress    = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;

  const topicIcon = (type) => {
    if (type === 1) return { icon: <RiPlayFill size={13}/>,    c1: '#6366F1', c2: '#8B5CF6', label: 'Video' };
    if (type === 2) return { icon: <RiFileTextLine size={13}/>,c1: '#EF4444', c2: '#DC2626', label: 'PDF' };
    if (type === 3) return { icon: <RiQuestionLine size={13}/>,c1: '#F59E0B', c2: '#EF4444', label: 'Test' };
    return                 { icon: <RiLinkM size={13}/>,        c1: '#10B981', c2: '#059669', label: 'Link' };
  };

  if (loading) return (
    <AppShell>
      <style>{CSS}</style>
      <div className="cdp-loading">
        <div className="cdp-spin"/>
        <div>Loading course…</div>
      </div>
    </AppShell>
  );

  if (!course) return (
    <AppShell>
      <style>{CSS}</style>
      <div className="cdp-empty">
        <div className="cdp-empty-icon"><RiCloseLine size={28}/></div>
        <div className="cdp-empty-title">Course not found</div>
        <button className="cdp-btn cdp-btn--ghost" onClick={() => navigate('/courses')}>
          <RiArrowLeftLine size={14}/>Back to courses
        </button>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <style>{CSS}</style>

      <button className="cdp-back" onClick={() => navigate('/courses')}>
        <RiArrowLeftLine size={14}/>Back to courses
      </button>

      {/* Hero */}
      <header className="cdp-hero">
        <div className="cdp-hero-inner">
          <div className="cdp-hero-left">
            <span className="cdp-cat-badge">{course.category_name || 'Course'}</span>
            <h1 className="cdp-title">{course.name}</h1>
            {course.description && (
              <p className="cdp-desc">{course.description}</p>
            )}

            <div className="cdp-stats">
              <span><RiBookOpenLine size={13}/>{totalTopics} topics</span>
              <span><RiTeamLine size={13}/>{course.learner_count || 0} learners</span>
              <span><RiStarFill size={13}/>{course.rating || '4.5'}</span>
              <span><RiTimeLine size={13}/>{course.duration || 0} min</span>
            </div>

            <div className="cdp-hero-actions">
              <button
                className="cdp-btn cdp-btn--primary"
                onClick={() => activeTopic && setPanelOpen(true)}
                disabled={!activeTopic}
              >
                <RiPlayFill size={14}/>
                {doneTopics > 0 ? 'Continue learning' : 'Start learning'}
              </button>
              <button
                className={`cdp-btn cdp-btn--wish ${wishlisted ? 'cdp-btn--wish-on' : ''}`}
                onClick={toggleWishlist}
              >
                {wishlisted ? <RiHeartFill size={14}/> : <RiHeartLine size={14}/>}
                {wishlisted ? 'Wishlisted' : 'Wishlist'}
              </button>
            </div>
          </div>

          <div className="cdp-prog-card">
            <div className="cdp-prog-image">
              {course.image_url
                ? <img src={course.image_url} alt={course.name}/>
                : <div className="cdp-prog-placeholder"><RiBookOpenFill size={36}/></div>}
            </div>
            <div className="cdp-prog-body">
              <div className="cdp-prog-row">
                <span className="cdp-prog-label">Your progress</span>
                <span className={`cdp-prog-pct ${progress === 100 ? 'cdp-prog-pct--done' : ''}`}>
                  {progress}%
                </span>
              </div>
              <div className="cdp-prog-track">
                <div
                  className={`cdp-prog-fill ${progress === 100 ? 'cdp-prog-fill--done' : ''}`}
                  style={{ width: progress + '%' }}
                />
              </div>
              <div className="cdp-prog-stat">
                {doneTopics} of {totalTopics} topics completed
              </div>
              {progress === 100 && (
                <div className="cdp-cert">
                  <RiTrophyFill size={14}/>
                  <span>Certificate earned</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="cdp-tabs">
        {[
          { id: 'curriculum', label: 'Curriculum', icon: <RiBookOpenLine size={13}/> },
          { id: 'overview',   label: 'Overview',   icon: <RiInformationLine size={13}/> },
          { id: 'reviews',    label: 'Reviews',    icon: <RiStarLine size={13}/> },
        ].map(t => (
          <button
            key={t.id}
            className={`cdp-tab ${activeTab === t.id ? 'cdp-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="cdp-content">
        <div className="cdp-main">
          {activeTab === 'curriculum' && (
            <>
              <h2 className="cdp-section-title">Course curriculum</h2>
              {chapters.map((ch, ci) => (
                <article key={ch.id} className="cdp-chapter">
                  <button className="cdp-ch-head" onClick={() => toggleChapter(ch.id)}>
                    <div className="cdp-ch-left">
                      <div className="cdp-ch-num">{ci + 1}</div>
                      <div>
                        <div className="cdp-ch-name">{ch.name}</div>
                        <div className="cdp-ch-sub">{ch.topics?.length || 0} topics</div>
                      </div>
                    </div>
                    {openChapters[ch.id]
                      ? <RiArrowDownSLine size={18}/>
                      : <RiArrowRightSLine size={18}/>}
                  </button>

                  {openChapters[ch.id] && (
                    <div className="cdp-topics">
                      {(ch.topics || []).map(t => {
                        const ti = topicIcon(t.type);
                        const done = !!completed[t.id];
                        const isActive = activeTopic?.id === t.id;
                        return (
                          <button
                            key={t.id}
                            className={`cdp-topic ${isActive ? 'cdp-topic--active' : ''}`}
                            onClick={() => { setActiveTopic(t); setPanelOpen(true); }}
                          >
                            <div
                              className="cdp-topic-icon"
                              style={{ '--c1': ti.c1, '--c2': ti.c2 }}
                            >
                              <span className="cdp-topic-icon-bg"/>
                              {ti.icon}
                            </div>
                            <div className="cdp-topic-info">
                              <div className="cdp-topic-name">{t.name}</div>
                              <div className="cdp-topic-meta">
                                {ti.label}{t.duration > 0 && ` · ${t.duration} min`}
                              </div>
                            </div>
                            <div className="cdp-topic-status">
                              {done
                                ? <RiCheckboxCircleFill size={18} className="cdp-done-icon"/>
                                : <span className="cdp-todo-circle"/>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
            </>
          )}

          {activeTab === 'overview' && (
            <>
              <h2 className="cdp-section-title">What you will learn</h2>
              <div className="cdp-overview">
                {(course.what_will_you_learn || 'This course will help you understand key concepts and improve your skills.')
                  .split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="cdp-learn-item">
                      <div className="cdp-learn-check"><RiCheckLine size={12}/></div>
                      {line}
                    </div>
                  ))}
              </div>

              {course.pre_requisites && (
                <>
                  <h2 className="cdp-section-title">Prerequisites</h2>
                  <div className="cdp-overview">
                    <p>{course.pre_requisites}</p>
                  </div>
                </>
              )}

              {course.trainer_details && (
                <>
                  <h2 className="cdp-section-title">Trainer</h2>
                  <div className="cdp-trainer">
                    <div className="cdp-trainer-avatar">
                      {(course.trainer_details || 'T').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="cdp-trainer-name">{course.trainer_details}</div>
                      <div className="cdp-trainer-role">Course trainer</div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'reviews' && (
            <>
              <h2 className="cdp-section-title">Rate this course</h2>
              {reviewSent ? (
                <div className="cdp-review-sent">
                  <RiCheckLine size={14}/>Thank you for your feedback!
                </div>
              ) : (
                <div className="cdp-review-form">
                  <div className="cdp-stars-row">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        className={`cdp-star ${(hoverRating || rating) >= s ? 'cdp-star--on' : ''}`}
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        {(hoverRating || rating) >= s ? <RiStarFill size={28}/> : <RiStarLine size={28}/>}
                      </button>
                    ))}
                    <span className="cdp-stars-label">
                      {(hoverRating || rating) > 0
                        ? ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][hoverRating || rating]
                        : 'Select rating'}
                    </span>
                  </div>
                  <textarea
                    className="cdp-input"
                    placeholder="Share your experience with this course…"
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    rows={4}
                  />
                  <button
                    className="cdp-btn cdp-btn--primary"
                    onClick={sendReview}
                    disabled={!rating}
                  >
                    Submit review
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right rail */}
        <aside className="cdp-rail">
          <div className="cdp-info-card">
            <div className="cdp-info-title">Course info</div>
            {[
              ['Duration',    `${course.duration || 0} min`],
              ['Topics',      totalTopics],
              ['Mode',        'E-Learning'],
              ['Points',      `${course.points || 1} pts`],
              ['Certificate', progress === 100 ? 'Earned' : 'On completion'],
              ['Visibility',  course.visibility === 0 ? 'Public' : 'Private'],
            ].map(([k, v]) => (
              <div key={k} className="cdp-info-row">
                <span className="cdp-info-key">{k}</span>
                <span className="cdp-info-val">{v}</span>
              </div>
            ))}
          </div>

          <div className="cdp-info-card">
            <div className="cdp-info-title">Your progress</div>
            <div className="cdp-circle-wrap">
              <svg viewBox="0 0 80 80" className="cdp-circle">
                <circle cx="40" cy="40" r="34" fill="none"
                        stroke="var(--surface-3)" strokeWidth="6"/>
                <circle cx="40" cy="40" r="34" fill="none"
                        stroke="var(--accent)" strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }}/>
                <text x="40" y="46" textAnchor="middle" fill="var(--text)"
                      fontSize="16" fontWeight="700"
                      style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {progress}%
                </text>
              </svg>
              <div className="cdp-circle-stat">{doneTopics} / {totalTopics} done</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Topic viewer side panel */}
      {panelOpen && activeTopic && (
        <>
          <div className="cdp-panel-overlay" onClick={() => setPanelOpen(false)}/>
          <div className="cdp-panel">
            <header className="cdp-panel-head">
              <div className="cdp-panel-title-wrap">
                <h2 className="cdp-panel-title">{activeTopic.name}</h2>
                <div className="cdp-panel-sub">
                  {activeTopic.type === 1 ? 'Video' :
                   activeTopic.type === 2 ? 'PDF' :
                   activeTopic.type === 3 ? 'Test' : 'Resources'}
                  {activeTopic.duration > 0 && ` · ${activeTopic.duration} min`}
                </div>
              </div>
              <button className="cdp-panel-close" onClick={() => setPanelOpen(false)}>
                <RiCloseLine size={18}/>
              </button>
            </header>

            <div className="cdp-panel-body">
              {activeTopic.type === 1 && (
                <VideoPlayer url={activeTopic.file_url}
                             videoType={activeTopic.video_type}
                             onComplete={() => markComplete(activeTopic.id)}/>
              )}
              {activeTopic.type === 2 && (
                <PDFViewer url={activeTopic.file_url}
                           onComplete={() => markComplete(activeTopic.id)}/>
              )}
              {activeTopic.type === 3 && (
                <TopicTest topic={activeTopic}
                           courseId={courseId}
                           chapterId={activeTopic.chapter_id}
                           onComplete={() => markComplete(activeTopic.id)}/>
              )}
              {activeTopic.type === 4 && <ResourceLinks topic={activeTopic}/>}

              {activeTopic.description && (
                <div className="cdp-panel-desc">{activeTopic.description}</div>
              )}
            </div>

            <footer className="cdp-panel-foot">
              {chapters.map(ch => ch.topics || []).flat().map((t, i, arr) => {
                if (t.id !== activeTopic.id) return null;
                const prev = arr[i - 1];
                const next = arr[i + 1];
                return (
                  <div key={t.id} className="cdp-panel-nav">
                    <button
                      className="cdp-btn cdp-btn--ghost"
                      onClick={() => prev && setActiveTopic(prev)}
                      disabled={!prev}
                    >
                      <RiArrowLeftLine size={13}/>Previous
                    </button>
                    <button
                      className="cdp-btn cdp-btn--primary"
                      onClick={() => next && setActiveTopic(next)}
                      disabled={!next}
                    >
                      Next<RiArrowRightLine size={13}/>
                    </button>
                  </div>
                );
              })}
            </footer>
          </div>
        </>
      )}
    </AppShell>
  );
}

const CSS = `
.cdp-loading, .cdp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-3); padding: var(--s-9) var(--s-4); text-align: center; font-size: var(--text-sm); color: var(--text-3); }
.cdp-spin { width: 36px; height: 36px; border: 3px solid var(--surface-2); border-top-color: var(--accent); border-radius: 50%; animation: cdpSpin 0.8s linear infinite; }
@keyframes cdpSpin { to { transform: rotate(360deg); } }
.cdp-empty-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--danger-soft); color: var(--danger); display: grid; place-items: center; }
.cdp-empty-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; color: var(--text); letter-spacing: -0.025em; }

.cdp-back { display: inline-flex; align-items: center; gap: 5px; background: transparent; border: none; padding: 0; margin-bottom: var(--s-4); font-family: inherit; font-size: var(--text-sm); font-weight: 500; color: var(--text-3); cursor: pointer; transition: color var(--duration-fast) var(--ease); }
.cdp-back:hover { color: var(--text); }

.cdp-hero { background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface) 70%); border-radius: var(--r-lg); padding: var(--s-7) var(--s-7); box-shadow: var(--shadow-sm), var(--ring); margin-bottom: var(--s-5); position: relative; overflow: hidden; animation: cdpFadeUp 600ms var(--ease-out); }
.cdp-hero::before { content: ''; position: absolute; top: -100px; right: -100px; width: 360px; height: 360px; background: radial-gradient(circle at center, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%); pointer-events: none; }
.cdp-hero-inner { display: grid; grid-template-columns: 1fr 320px; gap: var(--s-7); position: relative; z-index: 1; }
.cdp-cat-badge { display: inline-block; padding: 4px 11px; background: var(--accent-soft); color: var(--accent); border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: var(--s-3); }
.cdp-title { font-family: var(--font-display); font-size: var(--text-display); font-weight: 400; letter-spacing: -0.03em; color: var(--text); margin: 0 0 var(--s-3); line-height: 1.05; }
.cdp-desc { font-size: var(--text-md); color: var(--text-2); margin: 0 0 var(--s-4); line-height: 1.6; max-width: 580px; }
.cdp-stats { display: flex; flex-wrap: wrap; gap: var(--s-4); font-size: var(--text-xs); color: var(--text-3); font-weight: 500; margin-bottom: var(--s-4); }
.cdp-stats span { display: inline-flex; align-items: center; gap: 5px; }
.cdp-stats svg { color: var(--accent); }
.cdp-hero-actions { display: flex; gap: var(--s-2); flex-wrap: wrap; }

.cdp-prog-card { background: var(--surface); border-radius: var(--r-md); box-shadow: var(--shadow-md), var(--ring); overflow: hidden; align-self: flex-start; }
.cdp-prog-image { aspect-ratio: 16/9; background: var(--surface-2); display: grid; place-items: center; overflow: hidden; }
.cdp-prog-image img { width: 100%; height: 100%; object-fit: cover; }
.cdp-prog-placeholder { width: 64px; height: 64px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; }
.cdp-prog-body { padding: var(--s-3) var(--s-4); }
.cdp-prog-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.cdp-prog-label { font-size: var(--text-sm); font-weight: 600; color: var(--text); }
.cdp-prog-pct { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; color: var(--accent); letter-spacing: -0.025em; line-height: 1; font-variant-numeric: tabular-nums; }
.cdp-prog-pct--done { color: var(--success); }
.cdp-prog-track { height: 5px; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
.cdp-prog-fill { height: 100%; background: var(--accent); transition: width 700ms var(--ease-out); }
.cdp-prog-fill--done { background: var(--success); }
.cdp-prog-stat { font-size: var(--text-xs); color: var(--text-3); margin-top: 8px; }
.cdp-cert { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 7px 11px; background: linear-gradient(135deg, color-mix(in srgb, var(--warning) 10%, transparent), color-mix(in srgb, var(--warning) 4%, transparent)); color: var(--warning); border-radius: var(--r-sm); font-size: var(--text-xs); font-weight: 700; }

.cdp-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; cursor: pointer; letter-spacing: -0.005em; transition: all var(--duration-fast) var(--ease); }
.cdp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.cdp-btn:active:not(:disabled) { transform: scale(0.97); }
.cdp-btn--full { width: 100%; justify-content: center; }
.cdp-btn--primary { background: var(--accent); color: var(--accent-text); box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent); }
.cdp-btn--primary:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 45%, transparent); }
.cdp-btn--ghost { background: var(--surface); border-color: var(--border-strong); color: var(--text); }
.cdp-btn--ghost:hover:not(:disabled) { background: var(--surface-2); }
.cdp-btn--wish { background: var(--surface); border-color: var(--border-strong); color: var(--text); }
.cdp-btn--wish:hover:not(:disabled) { background: var(--surface-2); }
.cdp-btn--wish-on { background: color-mix(in srgb, #ef4444 12%, var(--surface)); border-color: color-mix(in srgb, #ef4444 30%, transparent); color: #ef4444; }

.cdp-tabs { display: inline-flex; gap: 2px; background: var(--surface-2); border-radius: var(--r-md); padding: 3px; margin-bottom: var(--s-4); }
.cdp-tab { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; background: transparent; border: none; border-radius: 7px; font-family: inherit; font-size: var(--text-base); font-weight: 600; color: var(--text-3); cursor: pointer; letter-spacing: -0.005em; transition: all var(--duration-fast) var(--ease); }
.cdp-tab:hover { color: var(--text-2); }
.cdp-tab--active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-xs); }

.cdp-content { display: grid; grid-template-columns: 1fr 280px; gap: var(--s-5); }
.cdp-main { min-width: 0; }
.cdp-rail { display: flex; flex-direction: column; gap: var(--s-3); }
.cdp-section-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0 0 var(--s-3); line-height: 1.2; }
.cdp-section-title:not(:first-child) { margin-top: var(--s-5); }

.cdp-chapter { background: var(--surface); border-radius: var(--r-md); box-shadow: var(--shadow-sm), var(--ring); overflow: hidden; margin-bottom: var(--s-2); }
.cdp-ch-head { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: transparent; border: none; font-family: inherit; cursor: pointer; color: var(--text-3); transition: background var(--duration-fast) var(--ease); }
.cdp-ch-head:hover { background: var(--surface-2); }
.cdp-ch-left { display: flex; align-items: center; gap: 12px; }
.cdp-ch-num { width: 30px; height: 30px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: var(--text-xs); font-weight: 700; flex-shrink: 0; }
.cdp-ch-name { font-size: var(--text-base); font-weight: 600; color: var(--text); text-align: left; letter-spacing: -0.005em; }
.cdp-ch-sub { font-size: var(--text-xs); color: var(--text-3); text-align: left; margin-top: 2px; }

.cdp-topics { padding: 4px; border-top: 1px solid var(--border); }
.cdp-topic { width: 100%; display: flex; align-items: center; gap: 12px; padding: 9px 12px; background: transparent; border: none; font-family: inherit; text-align: left; cursor: pointer; border-radius: var(--r-sm); transition: all var(--duration-fast) var(--ease); }
.cdp-topic:hover { background: var(--surface-2); }
.cdp-topic--active { background: var(--accent-soft); }
.cdp-topic-icon { position: relative; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: #fff; flex-shrink: 0; }
.cdp-topic-icon-bg { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(135deg, var(--c1), var(--c2)); }
.cdp-topic-icon > svg { position: relative; z-index: 1; }
.cdp-topic-info { flex: 1; min-width: 0; }
.cdp-topic-name { font-size: var(--text-base); font-weight: 500; color: var(--text); letter-spacing: -0.005em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cdp-topic-meta { font-size: 11px; color: var(--text-3); margin-top: 2px; font-weight: 500; }
.cdp-topic-status { flex-shrink: 0; display: grid; place-items: center; }
.cdp-done-icon { color: var(--success); }
.cdp-todo-circle { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--border-strong); }

.cdp-overview { background: var(--surface); border-radius: var(--r-md); padding: var(--s-4); box-shadow: var(--shadow-sm), var(--ring); font-size: var(--text-base); color: var(--text-2); line-height: 1.7; }
.cdp-overview p { margin: 0; }
.cdp-learn-item { display: flex; gap: 10px; padding: 7px 0; font-size: var(--text-base); color: var(--text); }
.cdp-learn-item:not(:last-child) { border-bottom: 1px solid var(--border); }
.cdp-learn-check { width: 22px; height: 22px; border-radius: 50%; background: var(--success-soft); color: var(--success); display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; }
.cdp-trainer { display: flex; align-items: center; gap: 14px; background: var(--surface); border-radius: var(--r-md); padding: var(--s-3); box-shadow: var(--shadow-sm), var(--ring); }
.cdp-trainer-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: var(--accent-text); display: grid; place-items: center; font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; flex-shrink: 0; }
.cdp-trainer-name { font-size: var(--text-md); font-weight: 600; color: var(--text); }
.cdp-trainer-role { font-size: var(--text-xs); color: var(--text-3); margin-top: 2px; }

.cdp-review-form { background: var(--surface); border-radius: var(--r-md); padding: var(--s-4); box-shadow: var(--shadow-sm), var(--ring); }
.cdp-stars-row { display: flex; align-items: center; gap: 4px; margin-bottom: var(--s-3); }
.cdp-star { background: transparent; border: none; padding: 4px; color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); display: grid; place-items: center; }
.cdp-star:hover { transform: scale(1.1); }
.cdp-star--on { color: var(--warning); }
.cdp-stars-label { font-size: var(--text-sm); color: var(--text-3); margin-left: 8px; font-weight: 500; }
.cdp-review-sent { display: flex; align-items: center; gap: 6px; background: var(--success-soft); color: var(--success); padding: 12px 16px; border-radius: var(--r-md); font-size: var(--text-sm); font-weight: 600; }
.cdp-input { width: 100%; padding: 10px 12px; background: var(--surface-2); border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); color: var(--text); outline: none; resize: vertical; margin-bottom: var(--s-3); transition: all var(--duration-fast) var(--ease); }
.cdp-input:focus { background: var(--surface); border-color: var(--accent); box-shadow: var(--ring-focus); }

.cdp-info-card { background: var(--surface); border-radius: var(--r-md); padding: var(--s-4); box-shadow: var(--shadow-sm), var(--ring); }
.cdp-info-title { font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-3); margin-bottom: 10px; }
.cdp-info-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; font-size: var(--text-base); }
.cdp-info-row:not(:last-child) { border-bottom: 1px solid var(--border); }
.cdp-info-key { color: var(--text-3); font-weight: 500; }
.cdp-info-val { color: var(--text); font-weight: 600; }
.cdp-circle-wrap { text-align: center; padding: var(--s-2) 0; }
.cdp-circle { width: 100px; height: 100px; }
.cdp-circle-stat { font-size: var(--text-sm); color: var(--text-2); margin-top: 8px; font-weight: 500; }

.cdp-panel-overlay { position: fixed; inset: 0; background: var(--overlay); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 1999; animation: cdpFadeIn 200ms var(--ease-out); }
.cdp-panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(720px, 100vw); background: var(--surface); z-index: 2000; display: flex; flex-direction: column; box-shadow: -10px 0 40px rgba(0, 0, 0, 0.20); animation: cdpSlideIn 320ms var(--ease-out); }
@keyframes cdpSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes cdpFadeIn { from { opacity: 0; } to { opacity: 1; } }

.cdp-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-3); padding: var(--s-4) var(--s-5); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.cdp-panel-title-wrap { flex: 1; min-width: 0; }
.cdp-panel-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0; line-height: 1.2; }
.cdp-panel-sub { font-size: var(--text-xs); color: var(--text-3); margin-top: 4px; font-weight: 500; }
.cdp-panel-close { background: transparent; border: none; width: 32px; height: 32px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.cdp-panel-close:hover { background: var(--surface-2); color: var(--text); }
.cdp-panel-body { flex: 1; overflow-y: auto; padding: var(--s-5); }
.cdp-panel-desc { font-size: var(--text-base); color: var(--text-2); line-height: 1.6; margin-top: var(--s-4); padding-top: var(--s-4); border-top: 1px solid var(--border); }
.cdp-panel-foot { padding: var(--s-3) var(--s-5); border-top: 1px solid var(--border); background: var(--surface-2); flex-shrink: 0; }
.cdp-panel-nav { display: flex; justify-content: space-between; gap: var(--s-2); }

.vp-wrap { position: relative; }
.vp-video { width: 100%; border-radius: var(--r-md); background: #000; aspect-ratio: 16/9; display: block; }
.vp-iframe-wrap { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: var(--r-md); overflow: hidden; background: #000; }
.vp-iframe { width: 100%; height: 100%; border: none; }
.vp-pdf { width: 100%; height: 540px; border: 1px solid var(--border); border-radius: var(--r-md); }
.vp-mark-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: var(--s-3); padding: 9px 16px; background: var(--accent); color: var(--accent-text); border: none; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; cursor: pointer; letter-spacing: -0.005em; box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent); transition: all var(--duration-fast) var(--ease); }
.vp-mark-btn:hover { background: var(--accent-hover); transform: translateY(-1px); }

.ta-state { text-align: center; padding: var(--s-7); color: var(--text-3); font-size: var(--text-sm); }
.ta-wrap { padding: var(--s-7) var(--s-4); text-align: center; }
.ta-result-icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto var(--s-3); color: #fff; }
.ta-result-icon--ok { background: linear-gradient(135deg, #10B981, #059669); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.30); }
.ta-result-icon--fail { background: linear-gradient(135deg, #EF4444, #DC2626); box-shadow: 0 8px 24px rgba(239, 68, 68, 0.30); }
.ta-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0 0 6px; }
.ta-score { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 400; color: var(--accent); letter-spacing: -0.025em; line-height: 1; margin: 8px 0; font-variant-numeric: tabular-nums; }
.ta-msg { font-size: var(--text-sm); color: var(--text-3); margin: 0 0 var(--s-4); }
.ta-meta { font-size: var(--text-xs); color: var(--text-3); margin-top: 4px; font-weight: 500; }

.ta-quiz { display: flex; flex-direction: column; gap: var(--s-3); }
.ta-q-header { margin-bottom: var(--s-2); }
.ta-q { background: var(--surface-2); border-radius: var(--r-md); padding: var(--s-4); border: 1px solid var(--border); }
.ta-q-num { display: inline-block; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 700; color: var(--accent); margin-bottom: 6px; letter-spacing: 0.04em; }
.ta-q-text { font-size: var(--text-base); font-weight: 600; color: var(--text); margin: 0 0 12px; line-height: 1.5; letter-spacing: -0.005em; }
.ta-opt { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); margin-bottom: 6px; cursor: pointer; font-size: var(--text-base); color: var(--text); transition: all var(--duration-fast) var(--ease); }
.ta-opt:hover { background: var(--surface-2); }
.ta-opt--sel { background: var(--accent-soft); border-color: var(--accent); font-weight: 600; }
.ta-opt input[type=radio] { accent-color: var(--accent); flex-shrink: 0; }

/* ── Past Attempts ── */
.ta-past { margin-top: var(--s-5); text-align: left; border-top: 1px solid var(--border); padding-top: var(--s-4); }
.ta-past-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin-bottom: var(--s-3); text-align: center; }
.ta-attempt { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); padding: var(--s-3) var(--s-4); border-radius: var(--r-md); border: 1px solid var(--border); margin-bottom: var(--s-2); background: var(--surface); }
.ta-attempt--pass { border-color: var(--success-soft); }
.ta-attempt--fail { border-color: #fecaca; }
.ta-attempt-left { flex: 1; }
.ta-attempt-score { font-size: var(--text-md); font-weight: 700; color: var(--text); margin-bottom: 3px; }
.ta-attempt-meta { font-size: var(--text-sm); color: var(--text-2); margin-bottom: 3px; }
.ta-attempt-date { font-size: var(--text-xs); color: var(--text-3); font-style: italic; }
.ta-attempt-icon { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
.ta-attempt-icon--pass { background: var(--success-soft); color: var(--success); }
.ta-attempt-icon--fail { background: #fee2e2; color: #dc2626; }

.rs-wrap { padding: var(--s-3) 0; }
.rs-title { font-size: var(--text-sm); font-weight: 600; color: var(--text); margin-bottom: 12px; letter-spacing: -0.005em; }
.rs-empty { background: var(--surface-2); padding: var(--s-5); text-align: center; color: var(--text-3); font-size: var(--text-sm); border-radius: var(--r-md); }
.rs-link { display: flex; align-items: center; gap: 8px; padding: 11px 14px; background: var(--surface-2); border-radius: var(--r-md); color: var(--text); text-decoration: none; font-size: var(--text-base); font-weight: 500; margin-bottom: 8px; transition: all var(--duration-fast) var(--ease); }
.rs-link:hover { background: var(--accent-soft); color: var(--accent); transform: translateX(2px); }

@keyframes cdpFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1100px) {
  .cdp-hero-inner { grid-template-columns: 1fr; }
  .cdp-content { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .cdp-hero { padding: var(--s-5) var(--s-4); }
  .cdp-title { font-size: var(--text-3xl); }
  .cdp-tabs { width: 100%; }
  .cdp-tab { flex: 1; justify-content: center; }
}
`;
