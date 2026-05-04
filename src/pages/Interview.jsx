import { useState, useEffect, useRef } from 'react';
import {
  RiVideoLine, RiVideoFill, RiPlayFill, RiStopCircleLine,
  RiCameraLine, RiUploadLine, RiTimeLine, RiCheckLine, RiCloseLine,
  RiAddLine, RiEdit2Line, RiDeleteBin6Line, RiSendPlaneLine,
  RiMailLine, RiListUnordered, RiPieChartLine, RiRefreshLine,
  RiSearchLine, RiArrowLeftLine, RiAlertLine, RiRecordCircleLine,
  RiUserVoiceLine, RiQuestionLine, RiArrowDownSLine, RiArrowRightSLine,
  RiDownloadLine, RiVolumeUpLine,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';
import { can } from '../utils/permissions';

/* ═══════════════════════════════════════════════════════════════════
   VIDEO QUESTION — Records candidate's video answer
   Phase machine: preview → thinking → recording → done → uploading → saved
   ═══════════════════════════════════════════════════════════════════ */
function VideoQuestion({ question, index, total, inviteId, onSave, onNext, isLast, onToast }) {
  const videoRef  = useRef(null);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const recRef    = useRef(null);

  const [phase,    setPhase]    = useState('preview');
  const [timeLeft, setTimeLeft] = useState(0);
  const [blob,     setBlob]     = useState(null);
  const [camReady, setCamReady] = useState(false);
  const [error,    setError]    = useState('');

  const THINK_SECS  = question.question_view_time ?? 30;
  const RECORD_SECS = question.question_time ?? 120;

  useEffect(() => { startCam(); return () => stopCam(); }, []);

  useEffect(() => {
    if (phase !== 'thinking' && phase !== 'recording') return;
    const secs = phase === 'thinking' ? THINK_SECS : RECORD_SECS;
    setTimeLeft(secs);
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(t);
          if (phase === 'thinking')  startRecording();
          if (phase === 'recording') stopRecording();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      mediaRef.current = stream;
      setCamReady(true);
    } catch {
      setError('Camera/mic access denied. Please allow access and reload.');
    }
  };

  const stopCam = () => {
    mediaRef.current?.getTracks().forEach(t => t.stop());
  };

  const startRecording = () => {
    if (!mediaRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(mediaRef.current, { mimeType: mime });
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const b = new Blob(chunksRef.current, { type: 'video/webm' });
      setBlob(b);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(b);
        videoRef.current.muted = false;
      }
      setPhase('done');
    };
    rec.start(200);
    recRef.current = rec;
    setPhase('recording');
  };

  const stopRecording = () => {
    if (recRef.current?.state === 'recording') recRef.current.stop();
  };

  const handleUpload = async () => {
    if (!blob) return;
    setPhase('uploading');
    try {
      const startRes = await API.post('/Webservice/sendInterviewQuestionWS', {
        inviteID: inviteId, questionID: question.id,
      });
      const responseID = startRes.data?.data?.responseID;
      if (!responseID) throw new Error('No responseID');

      const file = new File([blob], `q${question.id}_answer.webm`, { type: 'video/webm' });
      const form = new FormData();
      form.append('video',      file);
      form.append('questionID', question.id);
      form.append('responseID', responseID);

      const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
      const uploadRes = await fetch(`${base}/upload/interview-video`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.code === 1) {
        await API.post('/Webservice/saveInterviewVideo', {
          responseID, src: uploadData.data?.url || '',
        });
        onSave(question.id, uploadData.data?.url);
        setPhase('saved');
      } else {
        throw new Error('Upload failed');
      }
    } catch {
      setError('Upload failed. Please retry.');
      setPhase('done');
    }
  };

  const retry = () => {
    setBlob(null); setError(''); setPhase('preview');
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
      videoRef.current.muted = true;
    }
    startCam();
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="ivq">
      {/* Progress */}
      <div className="ivq-prog">
        <div className="ivq-prog-label">
          Question {index + 1} of {total}
        </div>
        <div className="ivq-prog-track">
          <div className="ivq-prog-fill" style={{ width: `${((index + 1) / total) * 100}%` }}/>
        </div>
      </div>

      {/* Question card */}
      <article className="ivq-q">
        <div className="ivq-q-num">Q{index + 1}</div>
        <h2 className="ivq-q-text">{question.question_text}</h2>
        {THINK_SECS > 0 && (
          <div className="ivq-q-meta">
            Think time: {THINK_SECS}s · Recording time: {RECORD_SECS}s
          </div>
        )}
      </article>

      {error && (
        <div className="ivq-error">
          <RiAlertLine size={14}/>{error}
        </div>
      )}

      {/* Video preview */}
      <div className="ivq-video-wrap">
        <video ref={videoRef} autoPlay playsInline className="ivq-video"/>
        {phase === 'recording' && (
          <div className="ivq-rec-pill">
            <span className="ivq-rec-dot"/>
            REC · {fmt(timeLeft)}
          </div>
        )}
        {phase === 'thinking' && (
          <div className="ivq-think-pill">
            <RiTimeLine size={13}/>Think · {fmt(timeLeft)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="ivq-ctrl">
        {phase === 'preview' && (
          <button className="iv-btn iv-btn--primary"
                  onClick={() => setPhase('thinking')}
                  disabled={!camReady}>
            <RiPlayFill size={14}/>
            {camReady
              ? (THINK_SECS > 0 ? 'Start (think first)' : 'Start recording')
              : 'Waiting for camera…'}
          </button>
        )}
        {phase === 'thinking' && (
          <button className="iv-btn iv-btn--primary" onClick={startRecording}>
            <RiCameraLine size={14}/>Start recording now
          </button>
        )}
        {phase === 'recording' && (
          <button className="iv-btn iv-btn--danger" onClick={stopRecording}>
            <RiStopCircleLine size={14}/>Stop recording
          </button>
        )}
        {phase === 'done' && (
          <>
            <button className="iv-btn iv-btn--ghost" onClick={retry}>
              <RiRefreshLine size={13}/>Retry
            </button>
            <button className="iv-btn iv-btn--primary" onClick={handleUpload}>
              <RiUploadLine size={14}/>Upload &amp; {isLast ? 'Finish' : 'Next'}
            </button>
          </>
        )}
        {phase === 'uploading' && (
          <button className="iv-btn iv-btn--primary" disabled>Uploading…</button>
        )}
        {phase === 'saved' && (
          <button className="iv-btn iv-btn--primary" onClick={onNext}>
            {isLast ? 'Finish interview' : 'Next question'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INTERVIEW ATTEMPT — wraps VideoQuestion sequencing
   ═══════════════════════════════════════════════════════════════════ */
function InterviewAttempt({ interview, onBack, onToast }) {
  const [questions, setQuestions] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [finished,  setFinished]  = useState(false);
  const inviteId = interview.invite_id || interview.id;

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get('/Webservice/getInterviewQuestions', {
        params: { interviewID: interview.interview_id || interview.id },
      });
      if (res.data.code === 1) setQuestions(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) setFinished(true);
    else setCurrent(p => p + 1);
  };

  if (loading) return <div className="iv-state">Loading interview…</div>;

  if (finished) {
    return (
      <div className="iva-done">
        <div className="iva-done-icon">
          <RiCheckLine size={32}/>
        </div>
        <h2 className="iva-done-title">Interview completed</h2>
        <p className="iva-done-sub">
          Your responses have been submitted successfully. The team will review them shortly.
        </p>
        <button className="iv-btn iv-btn--primary" onClick={onBack}>
          <RiArrowLeftLine size={13}/>Back to interviews
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="iva-done">
        <div className="iv-empty-icon"><RiVideoLine size={26}/></div>
        <h2 className="iva-done-title">No questions yet</h2>
        <p className="iva-done-sub">This interview has no questions configured.</p>
        <button className="iv-btn iv-btn--ghost" onClick={onBack}>
          <RiArrowLeftLine size={13}/>Back
        </button>
      </div>
    );
  }

  return (
    <VideoQuestion
      key={current}
      question={questions[current]}
      index={current}
      total={questions.length}
      inviteId={inviteId}
      onSave={() => {}}
      onNext={handleNext}
      isLast={current + 1 >= questions.length}
      onToast={onToast}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FORM MODAL — admin add/edit interview
   ═══════════════════════════════════════════════════════════════════ */
function InterviewFormModal({ interview, onClose, onSaved, onToast }) {
  const isEdit = !!interview;
  const [form, setForm] = useState({
    name:        interview?.name        || '',
    description: interview?.description || '',
    time:        interview?.time        ?? 0,
    visibility:  interview?.visibility  ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { onToast?.('Interview name required.'); return; }
    setSaving(true);
    try {
      if (isEdit) await API.post('/Webservice/updateInterviewDetail', { interviewID: interview.id, ...form });
      else        await API.post('/Webservice/addInterview', form);
      onSaved();
    } catch { onToast?.('Failed to save.'); }
    setSaving(false);
  };

  return (
    <Modal onClose={() => !saving && onClose()}>
      <div className="iv-modal-head">
        <h2 className="iv-modal-title">{isEdit ? 'Edit interview' : 'New interview'}</h2>
        <button className="iv-modal-close" onClick={onClose} disabled={saving}>
          <RiCloseLine size={16}/>
        </button>
      </div>
      <div className="iv-modal-body">
        <Field label="Interview name" required>
          <input className="iv-input" autoFocus value={form.name}
                 onChange={e => f('name', e.target.value)}
                 placeholder="e.g. Frontend Developer Round 1"/>
        </Field>
        <Field label="Description">
          <textarea className="iv-input" rows={3} value={form.description}
                    onChange={e => f('description', e.target.value)}
                    placeholder="Optional description…"/>
        </Field>
        <div className="iv-modal-row">
          <Field label="Time per question (seconds)">
            <input className="iv-input" type="number" min={0} value={form.time}
                   onChange={e => f('time', +e.target.value)}
                   placeholder="0 = unlimited"/>
          </Field>
          <Field label="Visibility">
            <select className="iv-input" value={form.visibility}
                    onChange={e => f('visibility', +e.target.value)}>
              <option value={0}>Private</option>
              <option value={1}>Public</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="iv-modal-foot">
        <button className="iv-btn iv-btn--ghost" onClick={onClose}>Cancel</button>
        <button className="iv-btn iv-btn--primary" onClick={save} disabled={saving}>
          <RiCheckLine size={14}/>{saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QUESTIONS MODAL — manage interview questions
   ═══════════════════════════════════════════════════════════════════ */
function QuestionsModal({ interview, onClose, onToast }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [adding,    setAdding]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [newQ, setNewQ] = useState({ text: '', question_time: 120, question_view_time: 30 });

  useEffect(() => { loadQ(); }, []);

  const loadQ = async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservice/getInterviewQuestions', { params: { interviewID: interview.id } });
      if (res.data.code === 1) setQuestions(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  const addQuestion = async () => {
    if (!newQ.text.trim()) { onToast?.('Question text required.'); return; }
    setSaving(true);
    try {
      await API.post('/Webservice/addInterviewQuestion', {
        interviewID:        interview.id,
        question_text:      newQ.text,
        question_time:      newQ.question_time,
        question_view_time: newQ.question_view_time,
      });
      setAdding(false);
      setNewQ({ text: '', question_time: 120, question_view_time: 30 });
      loadQ();
    } catch { onToast?.('Failed to add.'); }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const qID = confirmDel; setConfirmDel(null);
    try { await API.post('/Webservice/deleteInterviewQuestion', { questionID: qID }); loadQ(); }
    catch { onToast?.('Delete failed.'); }
  };

  return (
    <>
      <Modal large onClose={onClose}>
        <div className="iv-modal-head">
          <h2 className="iv-modal-title">Questions · {interview.name}</h2>
          <button className="iv-modal-close" onClick={onClose}>
            <RiCloseLine size={16}/>
          </button>
        </div>
        <div className="iv-modal-body">
          {loading ? (
            <div className="iv-state">Loading…</div>
          ) : (
            <>
              {questions.length === 0 && !adding && (
                <div className="iv-state">No questions yet. Add one below.</div>
              )}
              {questions.map((q, qi) => (
                <article key={q.id} className="ivmgr-q">
                  <div className="ivmgr-q-text">
                    <span className="ivmgr-q-num">Q{qi + 1}</span>
                    {q.question_text}
                    <span className="ivmgr-q-meta">
                      Think: {q.question_view_time}s · Rec: {q.question_time}s
                    </span>
                  </div>
                  <button className="iv-icon-btn iv-icon-btn--danger"
                          onClick={() => setConfirmDel(q.id)} title="Delete">
                    <RiDeleteBin6Line size={13}/>
                  </button>
                </article>
              ))}

              {adding ? (
                <article className="ivmgr-q ivmgr-q--new">
                  <Field label="Question text" required>
                    <textarea className="iv-input" rows={2} value={newQ.text}
                              onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
                              placeholder="e.g. Tell us about yourself…"/>
                  </Field>
                  <div className="iv-modal-row">
                    <Field label="Think time (sec)">
                      <input className="iv-input" type="number" min={0}
                             value={newQ.question_view_time}
                             onChange={e => setNewQ(p => ({ ...p, question_view_time: +e.target.value }))}/>
                    </Field>
                    <Field label="Recording time (sec)">
                      <input className="iv-input" type="number" min={10}
                             value={newQ.question_time}
                             onChange={e => setNewQ(p => ({ ...p, question_time: +e.target.value }))}/>
                    </Field>
                  </div>
                  <div className="iv-modal-foot" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 12, background: 'transparent', borderTop: 'none' }}>
                    <button className="iv-btn iv-btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
                    <button className="iv-btn iv-btn--primary" onClick={addQuestion} disabled={saving}>
                      <RiCheckLine size={14}/>{saving ? 'Saving…' : 'Add question'}
                    </button>
                  </div>
                </article>
              ) : (
                <button className="ivmgr-add" onClick={() => setAdding(true)}>
                  <RiAddLine size={14}/>Add new question
                </button>
              )}
            </>
          )}
        </div>
      </Modal>

      {confirmDel && (
        <Modal small onClose={() => setConfirmDel(null)}>
          <h3 className="iv-modal-title">Delete question?</h3>
          <p className="iv-modal-msg">This action cannot be undone.</p>
          <div className="iv-modal-foot">
            <button className="iv-btn iv-btn--ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="iv-btn iv-btn--danger" onClick={doDelete}>
              <RiDeleteBin6Line size={13}/>Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INVITE MODAL
   ═══════════════════════════════════════════════════════════════════ */
function InviteModal({ interview, onClose, onToast }) {
  const [emailInput,  setEmailInput]  = useState('');
  const [emails,      setEmails]      = useState([]);
  const [expiryDays,  setExpiryDays]  = useState(7);
  const [invList,     setInvList]     = useState([]);
  const [tab,         setTab]         = useState('send');
  const [sending,     setSending]     = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => { if (tab === 'list') loadList(); }, [tab]);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const res = await API.get('/Webservice/getInterviewInvitedList', { params: { interviewID: interview.id } });
      if (res.data.code === 1) setInvList(res.data.data || []);
    } catch {}
    setLoadingList(false);
  };

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !e.includes('@')) { onToast?.('Enter a valid email.'); return; }
    if (emails.includes(e))     { onToast?.('Already added.'); return; }
    setEmails(p => [...p, e]); setEmailInput('');
  };

  const sendInvites = async () => {
    if (!emails.length) { onToast?.('Add at least one email.'); return; }
    setSending(true);
    try {
      const res = await API.post('/Webservice/shareInterviewInvite', {
        interviewID: interview.id, emails, expiry_days: expiryDays,
      });
      if (res.data.code === 1) {
        onToast?.(`Invites sent to ${emails.length} email${emails.length !== 1 ? 's' : ''}`, 'ok');
        setEmails([]); setTab('list');
      } else {
        onToast?.(res.data.message || 'Failed to send.');
      }
    } catch { onToast?.('Send failed.'); }
    setSending(false);
  };

  return (
    <Modal large onClose={onClose}>
      <div className="iv-modal-head">
        <h2 className="iv-modal-title">Invites · {interview.name}</h2>
        <button className="iv-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>
      <div className="iv-modal-body">
        <div className="iv-tabs">
          {[
            { key: 'send', label: 'Send invites', icon: <RiSendPlaneLine size={12}/> },
            { key: 'list', label: 'Invited list',  icon: <RiListUnordered size={12}/> },
          ].map(t => (
            <button key={t.key} className={`iv-tab ${tab === t.key ? 'iv-tab--active' : ''}`}
                    onClick={() => setTab(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'send' ? (
          <>
            <div className="iv-input-row">
              <input className="iv-input" type="email" placeholder="Enter email address"
                     value={emailInput}
                     onChange={e => setEmailInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && addEmail()}/>
              <button className="iv-btn iv-btn--primary" onClick={addEmail}>Add</button>
            </div>
            <Field label="Link expiry (days)">
              <input className="iv-input" type="number" min={1} max={30}
                     value={expiryDays}
                     onChange={e => setExpiryDays(+e.target.value)}
                     style={{ maxWidth: 120 }}/>
            </Field>
            {emails.length > 0 && (
              <div className="iv-chips">
                {emails.map(e => (
                  <span key={e} className="iv-chip">
                    <RiMailLine size={11}/>{e}
                    <button onClick={() => setEmails(p => p.filter(x => x !== e))}>
                      <RiCloseLine size={11}/>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="iv-modal-foot" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 12, background: 'transparent', borderTop: 'none' }}>
              <button className="iv-btn iv-btn--ghost" onClick={onClose}>Cancel</button>
              <button className="iv-btn iv-btn--primary" onClick={sendInvites} disabled={sending || !emails.length}>
                <RiSendPlaneLine size={13}/>
                {sending ? 'Sending…' : `Send to ${emails.length} email${emails.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        ) : loadingList ? (
          <div className="iv-state">Loading…</div>
        ) : invList.length === 0 ? (
          <div className="iv-state">No invites sent yet.</div>
        ) : (
          <div className="iv-table-wrap">
            <table className="iv-table">
              <thead>
                <tr><th>Email</th><th>Invited</th><th>Expires</th><th>Status</th><th>Completed</th></tr>
              </thead>
              <tbody>
                {invList.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>{inv.invited_on ? new Date(inv.invited_on).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{inv.expire_on  ? new Date(inv.expire_on).toLocaleDateString('en-IN')  : '—'}</td>
                    <td>
                      <span className={`iv-st iv-st--${inv.invite_status == 1 ? 'ok' : inv.invite_status == 2 ? 'fail' : 'pend'}`}>
                        {inv.invite_status == 1 ? 'Sent' : inv.invite_status == 2 ? 'Failed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`iv-st iv-st--${inv.completed == 2 ? 'ok' : 'pend'}`}>
                        {inv.completed == 2 ? 'Done' : inv.completed == 1 ? 'In progress' : 'Not started'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS MODAL
   ═══════════════════════════════════════════════════════════════════ */
function ChartsModal({ interview, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    API.get('/Webservice/getOverViewChartsInterview', { params: { interviewID: interview.id } })
      .then(r => { if (r.data.code === 1) setData(r.data.data); })
      .catch(() => {});
  }, []);

  return (
    <Modal large onClose={onClose}>
      <div className="iv-modal-head">
        <h2 className="iv-modal-title">Analytics · {interview.name}</h2>
        <button className="iv-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>
      <div className="iv-modal-body">
        {!data ? (
          <div className="iv-state">Loading…</div>
        ) : (
          <div className="iv-chart-grid">
            {[
              { num: data.total ?? 0,                       lbl: 'Invited',   c1: '#06B6D4', c2: '#0EA5E9' },
              { num: data.started ?? 0,                     lbl: 'Started',   c1: '#F59E0B', c2: '#EF4444' },
              { num: data.done ?? 0,                        lbl: 'Completed', c1: '#10B981', c2: '#059669' },
              { num: (data.total || 0) - (data.done || 0),  lbl: 'Pending',   c1: '#EF4444', c2: '#DC2626' },
            ].map(c => (
              <div key={c.lbl} className="iv-chart-card" style={{ '--c1': c.c1, '--c2': c.c2 }}>
                <div className="iv-chart-num">{c.num}</div>
                <div className="iv-chart-lbl">{c.lbl}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="iv-modal-foot">
        <button className="iv-btn iv-btn--ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUBMISSIONS MODAL — admin views all candidate video responses
   ═══════════════════════════════════════════════════════════════════ */
function SubmissionsModal({ interview, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);   // invite_id of expanded card
  const [search,      setSearch]      = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservice/getInterviewSubmissions', {
        params: { interviewID: interview.id },
      });
      if (res.data.code === 1) {
        const data = res.data.data || [];
        setSubmissions(data);
        // Auto-expand first one if any
        if (data.length > 0) setExpanded(data[0].invite_id);
      }
    } catch {}
    setLoading(false);
  };

  const filtered = search.trim()
    ? submissions.filter(s => (s.email || '').toLowerCase().includes(search.toLowerCase()))
    : submissions;

  const completed = submissions.filter(s => s.completed === 2).length;
  const inProgress = submissions.filter(s => s.completed === 1).length;
  const totalVideos = submissions.reduce((sum, s) =>
    sum + (s.responses || []).reduce((vs, r) => vs + (r.videos?.length || 0), 0), 0);

  const formatDate = (iso) => iso
    ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  return (
    <Modal large onClose={onClose}>
      <div className="iv-modal-head">
        <div>
          <h2 className="iv-modal-title">Submissions · {interview.name}</h2>
          <p className="iv-sub-meta">
            {completed} completed · {inProgress} in progress · {totalVideos} {totalVideos === 1 ? 'video' : 'videos'}
          </p>
        </div>
        <button className="iv-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>

      <div className="iv-modal-body iv-sub-body">
        {/* Search bar */}
        {submissions.length > 0 && (
          <div className="iv-sub-search">
            <RiSearchLine size={13}/>
            <input
              placeholder="Search by email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="iv-sub-clear">
                <RiCloseLine size={12}/>
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="iv-state">Loading submissions…</div>
        ) : submissions.length === 0 ? (
          <div className="iv-sub-empty">
            <div className="iv-sub-empty-icon"><RiUserVoiceLine size={28}/></div>
            <div className="iv-sub-empty-title">No submissions yet</div>
            <div className="iv-sub-empty-msg">
              Once invited candidates record and submit their videos, they'll appear here.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="iv-state">No matches for "{search}".</div>
        ) : (
          <div className="iv-sub-list">
            {filtered.map(sub => {
              const isOpen   = expanded === sub.invite_id;
              const isDone   = sub.completed === 2;
              return (
                <div key={sub.invite_id} className={`iv-sub-card ${isOpen ? 'iv-sub-card--open' : ''}`}>
                  {/* Header — click to expand */}
                  <button
                    className="iv-sub-head"
                    onClick={() => setExpanded(isOpen ? null : sub.invite_id)}
                  >
                    <div className="iv-sub-avatar">
                      {(sub.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="iv-sub-info">
                      <div className="iv-sub-email">{sub.email}</div>
                      <div className="iv-sub-meta-row">
                        <span className={`iv-st iv-st--${isDone ? 'ok' : 'pend'}`}>
                          {isDone ? 'Completed' : 'In progress'}
                        </span>
                        <span className="iv-sub-count">
                          {sub.response_count} {sub.response_count === 1 ? 'response' : 'responses'}
                        </span>
                        {isDone && (
                          <span className="iv-sub-time">
                            <RiTimeLine size={11}/> {formatDate(sub.complete_on)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen ? <RiArrowDownSLine size={16}/> : <RiArrowRightSLine size={16}/>}
                  </button>

                  {/* Expanded — show videos per question */}
                  {isOpen && (
                    <div className="iv-sub-detail">
                      {(sub.responses || []).length === 0 ? (
                        <div className="iv-sub-no-resp">No responses recorded yet.</div>
                      ) : (
                        sub.responses.map((resp, qIdx) => (
                          <div key={resp.response_id} className="iv-sub-question">
                            <div className="iv-sub-q-head">
                              <div className="iv-sub-q-num">Q{qIdx + 1}</div>
                              <div className="iv-sub-q-text">
                                {resp.question_text}
                              </div>
                              <div className="iv-sub-q-time">
                                {formatDate(resp.submitted_on)}
                              </div>
                            </div>

                            {(resp.videos || []).length === 0 ? (
                              <div className="iv-sub-no-video">
                                <RiAlertLine size={12}/> No video recorded for this question.
                              </div>
                            ) : (
                              <div className="iv-sub-videos">
                                {resp.videos.map(v => (
                                  <div key={v.id} className="iv-sub-video-wrap">
                                    <video
                                      controls
                                      preload="metadata"
                                      className="iv-sub-video"
                                      src={v.src}
                                    >
                                      Your browser doesn't support video playback.
                                    </video>
                                    <div className="iv-sub-video-actions">
                                      <span className="iv-sub-video-meta">
                                        <RiVolumeUpLine size={11}/> Recorded {formatDate(v.added_on)}
                                      </span>
                                      <a
                                        href={v.src}
                                        download
                                        target="_blank"
                                        rel="noreferrer"
                                        className="iv-sub-download"
                                      >
                                        <RiDownloadLine size={11}/> Download
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="iv-modal-foot">
        <button className="iv-btn iv-btn--ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */
function Modal({ children, onClose, large, small }) {
  return (
    <div className="iv-overlay" onClick={onClose}>
      <div className={`iv-modal ${large ? 'iv-modal--lg' : ''} ${small ? 'iv-modal--sm' : ''}`}
           onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="iv-field">
      <label className="iv-label">{label}{required && <span className="iv-req">*</span>}</label>
      {children}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show: (text, type = 'err') => setToast({ text, type }) };
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function Interview() {
  const [interviews, setInterviews] = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [selInv,     setSelInv]     = useState(null);
  const [activeTab,  setActiveTab]  = useState('learner');
  const [showAdd,    setShowAdd]    = useState(false);
  const [editInv,    setEditInv]    = useState(null);
  const [qMgrInv,    setQMgrInv]    = useState(null);
  const [invInv,     setInvInv]     = useState(null);
  const [chartInv,   setChartInv]   = useState(null);
  const [submissionsInv, setSubmissionsInv] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const { toast, show } = useToast();

  /* "Admin panel" = anyone who can manage interviews — admin, trainer, HR recruiter */
  const isAdmin = can('interview.manage') || can('interview.review') || can('courses.manage');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservices/getAllInterviewList');
      if (res.data.code === 1) setInterviews(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const iv = confirmDel; setConfirmDel(null);
    try {
      await API.post('/Webservice/updateInterviewDetail', { interviewID: iv.id, status: 0 });
      load();
    } catch { show('Delete failed.'); }
  };

  const filtered = interviews.filter(iv =>
    (iv.name || '').toLowerCase().includes(search.toLowerCase())
  );

  /* ── Attempt view ── */
  if (selInv) {
    return (
      <AppShell>
        <style>{CSS}</style>
        <div className="iva-header">
          <button className="iv-btn iv-btn--ghost" onClick={() => { setSelInv(null); load(); }}>
            <RiArrowLeftLine size={14}/>Exit
          </button>
          <h1 className="iva-h-title">{selInv.name}</h1>
        </div>
        <InterviewAttempt interview={selInv}
                          onBack={() => { setSelInv(null); load(); }}
                          onToast={show}/>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* Hero */}
      <header className="iv-hero">
        <div>
          <div className="iv-eyebrow">
            {isAdmin ? 'Admin · Learner' : 'Your assignments'}
          </div>
          <h1 className="iv-title">Interviews.</h1>
          <p className="iv-sub">
            {loading
              ? 'Loading…'
              : `${interviews.length} ${interviews.length === 1 ? 'interview' : 'interviews'} ${isAdmin ? 'in the catalog' : 'available to you'}.`}
          </p>
        </div>
        {isAdmin && (
          <button className="iv-btn iv-btn--primary" onClick={() => setShowAdd(true)}>
            <RiAddLine size={14}/>New interview
          </button>
        )}
      </header>

      {/* Toast */}
      {toast && (
        <div className={`iv-toast iv-toast--${toast.type}`}>
          {toast.type === 'ok' ? <RiCheckLine size={14}/> : <RiAlertLine size={14}/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Tabs */}
      {isAdmin && (
        <div className="iv-tabs iv-tabs--page">
          {[
            { key: 'learner', label: 'My interviews' },
            { key: 'admin',   label: 'Admin panel' },
          ].map(t => (
            <button key={t.key}
                    className={`iv-tab ${activeTab === t.key ? 'iv-tab--active' : ''}`}
                    onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="iv-toolbar">
        <div className="iv-search">
          <RiSearchLine size={14}/>
          <input placeholder="Search interviews…" value={search}
                 onChange={e => setSearch(e.target.value)}/>
          {search && (
            <button className="iv-search-clear" onClick={() => setSearch('')}>
              <RiCloseLine size={13}/>
            </button>
          )}
        </div>
        <button className="iv-btn iv-btn--ghost iv-btn--sm" onClick={load}>
          <RiRefreshLine size={13}/>Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="iv-state">Loading interviews…</div>
      ) : filtered.length === 0 ? (
        <div className="iv-empty">
          <div className="iv-empty-icon"><RiVideoLine size={26}/></div>
          <div className="iv-empty-title">No interviews found</div>
          <div className="iv-empty-sub">
            {search ? 'Try a different search.' : isAdmin ? 'Create your first interview.' : 'No video interviews assigned yet.'}
          </div>
          {isAdmin && !search && (
            <button className="iv-btn iv-btn--primary" onClick={() => setShowAdd(true)} style={{ marginTop: 16 }}>
              <RiAddLine size={14}/>Create interview
            </button>
          )}
        </div>
      ) : (
        <div className="iv-grid">
          {filtered.map((iv, i) => {
            const done = iv.completed == 2;
            const exp  = iv.expire_on && new Date(iv.expire_on) < new Date();
            const showAdminActions = isAdmin && activeTab === 'admin';
            return (
              <article key={iv.id} className="iv-card" style={{ animationDelay: `${i * 50}ms` }}>
                <header className="iv-card-head">
                  <div className="iv-card-icon">
                    <span className="iv-card-icon-bg"/>
                    <RiVideoFill size={18}/>
                  </div>
                  {done ? (
                    <span className="iv-pill iv-pill--ok">
                      <RiCheckLine size={11}/>Completed
                    </span>
                  ) : exp ? (
                    <span className="iv-pill iv-pill--exp">Expired</span>
                  ) : (
                    <span className="iv-pill iv-pill--pend">
                      <RiTimeLine size={11}/>Pending
                    </span>
                  )}
                </header>
                <h3 className="iv-card-title">{iv.name}</h3>
                {iv.description && <p className="iv-card-desc">{iv.description}</p>}
                <div className="iv-card-meta">
                  {iv.expire_on && (
                    <span><RiTimeLine size={11}/>Due: {new Date(iv.expire_on).toLocaleDateString('en-IN')}</span>
                  )}
                  {iv.question_count && <span>{iv.question_count} questions</span>}
                </div>

                {showAdminActions ? (
                  <div className="iv-card-actions">
                    <button className="iv-icon-btn" onClick={() => setEditInv(iv)} title="Edit">
                      <RiEdit2Line size={12}/>
                    </button>
                    <button className="iv-icon-btn" onClick={() => setQMgrInv(iv)} title="Questions">
                      <RiListUnordered size={12}/>
                    </button>
                    <button className="iv-icon-btn" onClick={() => setInvInv(iv)} title="Invite">
                      <RiMailLine size={12}/>
                    </button>
                    <button className="iv-icon-btn iv-icon-btn--accent"
                            onClick={() => setSubmissionsInv(iv)} title="View video submissions">
                      <RiVideoFill size={12}/>
                    </button>
                    <button className="iv-icon-btn" onClick={() => setChartInv(iv)} title="Analytics">
                      <RiPieChartLine size={12}/>
                    </button>
                    <button className="iv-icon-btn iv-icon-btn--danger"
                            onClick={() => setConfirmDel(iv)} title="Delete">
                      <RiDeleteBin6Line size={12}/>
                    </button>
                  </div>
                ) : (
                  <button className="iv-card-cta" onClick={() => setSelInv(iv)} disabled={done || exp}>
                    {done ? 'Completed' : exp ? 'Expired' : (
                      <><RiVideoFill size={13}/>Start interview</>
                    )}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <InterviewFormModal onClose={() => setShowAdd(false)}
                            onSaved={() => { setShowAdd(false); load(); show('Interview created', 'ok'); }}
                            onToast={show}/>
      )}
      {editInv && (
        <InterviewFormModal interview={editInv}
                            onClose={() => setEditInv(null)}
                            onSaved={() => { setEditInv(null); load(); show('Interview updated', 'ok'); }}
                            onToast={show}/>
      )}
      {qMgrInv  && <QuestionsModal interview={qMgrInv}  onClose={() => setQMgrInv(null)} onToast={show}/>}
      {invInv   && <InviteModal    interview={invInv}   onClose={() => setInvInv(null)}  onToast={show}/>}
      {chartInv && <ChartsModal    interview={chartInv} onClose={() => setChartInv(null)}/>}
      {submissionsInv && <SubmissionsModal interview={submissionsInv} onClose={() => setSubmissionsInv(null)}/>}

      {confirmDel && (
        <Modal small onClose={() => setConfirmDel(null)}>
          <h3 className="iv-modal-title">Delete interview?</h3>
          <p className="iv-modal-msg">"{confirmDel.name}" will be removed.</p>
          <div className="iv-modal-foot">
            <button className="iv-btn iv-btn--ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="iv-btn iv-btn--danger" onClick={doDelete}>
              <RiDeleteBin6Line size={13}/>Delete
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

const CSS = `
/* ── Hero ── */
.iv-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--s-4); margin-bottom: var(--s-5); flex-wrap: wrap; animation: ivFadeUp 600ms var(--ease-out); }
.iv-eyebrow { font-size: var(--text-sm); color: var(--text-3); font-weight: 500; margin-bottom: 6px; }
.iv-title { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 400; letter-spacing: -0.03em; color: var(--text); margin: 0 0 6px; line-height: 1; }
.iv-sub { font-size: var(--text-md); color: var(--text-2); margin: 0; line-height: 1.5; }

/* ── Toast ── */
.iv-toast { position: fixed; top: 80px; right: 28px; display: flex; align-items: center; gap: var(--s-2); padding: 11px 16px; border-radius: var(--r-md); font-size: var(--text-sm); font-weight: 600; box-shadow: var(--shadow-lg); z-index: 1000; animation: ivSlide 280ms var(--ease-bounce); }
.iv-toast--ok  { background: var(--accent); color: var(--accent-text); }
.iv-toast--err { background: var(--danger); color: #fff; }
@keyframes ivSlide { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* ── Tabs ── */
.iv-tabs { display: inline-flex; gap: 2px; background: var(--surface-2); border-radius: var(--r-md); padding: 3px; }
.iv-tabs--page { margin-bottom: var(--s-3); }
.iv-tab { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; background: transparent; border: none; border-radius: 7px; font-family: inherit; font-size: var(--text-base); font-weight: 600; color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); letter-spacing: -0.005em; }
.iv-tab:hover { color: var(--text-2); }
.iv-tab--active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-xs); }

/* ── Toolbar ── */
.iv-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); margin-bottom: var(--s-4); flex-wrap: wrap; }
.iv-search { display: flex; align-items: center; gap: var(--s-2); padding: 9px 12px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--shadow-sm), var(--ring); flex: 1; max-width: 480px; color: var(--text-3); transition: box-shadow var(--duration-fast) var(--ease); }
.iv-search:focus-within { box-shadow: var(--ring-focus); }
.iv-search input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: var(--text-base); color: var(--text); }
.iv-search input::placeholder { color: var(--text-3); }
.iv-search-clear { background: none; border: none; padding: 2px; display: grid; place-items: center; color: var(--text-3); border-radius: 4px; cursor: pointer; }
.iv-search-clear:hover { background: var(--surface-2); color: var(--text); }

/* ── Buttons ── */
.iv-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; cursor: pointer; letter-spacing: -0.005em; transition: all var(--duration-fast) var(--ease); }
.iv-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.iv-btn:active:not(:disabled) { transform: scale(0.97); }
.iv-btn--sm { padding: 7px 11px; font-size: var(--text-xs); }
.iv-btn--primary { background: var(--accent); color: var(--accent-text); box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent); }
.iv-btn--primary:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
.iv-btn--ghost { background: var(--surface); border-color: var(--border-strong); color: var(--text); }
.iv-btn--ghost:hover:not(:disabled) { background: var(--surface-2); }
.iv-btn--danger { background: var(--danger); color: #fff; }
.iv-btn--danger:hover:not(:disabled) { background: color-mix(in srgb, var(--danger) 85%, black); }

/* ── States / empty ── */
.iv-state { text-align: center; padding: var(--s-9) var(--s-4); color: var(--text-3); font-size: var(--text-sm); }
.iv-empty { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm), var(--ring); padding: var(--s-9) var(--s-4); text-align: center; }
.iv-empty-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; margin: 0 auto var(--s-3); }
.iv-empty-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; color: var(--text); letter-spacing: -0.025em; margin-bottom: 4px; }
.iv-empty-sub { font-size: var(--text-sm); color: var(--text-3); max-width: 340px; margin: 0 auto; }

/* ── Card grid ── */
.iv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
.iv-card { background: var(--surface); border-radius: var(--r-lg); padding: var(--s-5); box-shadow: var(--shadow-sm), var(--ring); display: flex; flex-direction: column; gap: var(--s-3); opacity: 0; animation: ivFadeUp 500ms var(--ease-out) forwards; transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease); }
.iv-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md), var(--ring); }

.iv-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-3); }
.iv-card-icon { position: relative; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; color: #fff; }
.iv-card-icon-bg { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(135deg, #06B6D4, #3B82F6); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.30); }
.iv-card-icon > svg { position: relative; z-index: 1; }

.iv-card-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.02em; color: var(--text); margin: 0; line-height: 1.2; }
.iv-card-desc { font-size: var(--text-xs); color: var(--text-3); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.iv-card-meta { display: flex; gap: var(--s-3); font-size: var(--text-xs); color: var(--text-3); font-weight: 500; flex-wrap: wrap; }
.iv-card-meta span { display: inline-flex; align-items: center; gap: 4px; }

.iv-card-cta { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: var(--accent); color: var(--accent-text); border: none; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; cursor: pointer; letter-spacing: -0.005em; transition: all var(--duration-fast) var(--ease); box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent); margin-top: auto; }
.iv-card-cta:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
.iv-card-cta:disabled { opacity: 0.55; cursor: not-allowed; background: var(--surface-2); color: var(--text-3); box-shadow: none; }

.iv-card-actions { display: flex; gap: 4px; margin-top: auto; }
.iv-icon-btn { width: 32px; height: 32px; display: grid; place-items: center; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); color: var(--text-2); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.iv-icon-btn:hover { background: var(--surface-3); color: var(--text); }
.iv-icon-btn--danger { color: var(--danger); }
.iv-icon-btn--danger:hover { background: var(--danger-soft); border-color: color-mix(in srgb, var(--danger) 30%, transparent); }

/* ── Pills ── */
.iv-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; letter-spacing: 0.02em; }
.iv-pill--ok   { background: var(--success-soft); color: var(--success); }
.iv-pill--pend { background: var(--warning-soft); color: var(--warning); }
.iv-pill--exp  { background: var(--danger-soft); color: var(--danger); }

/* ═══ Interview attempt ═══ */
.iva-header { display: flex; align-items: center; gap: var(--s-3); margin-bottom: var(--s-4); padding-bottom: var(--s-3); border-bottom: 1px solid var(--border); }
.iva-h-title { flex: 1; font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0; }

.ivq { display: flex; flex-direction: column; gap: var(--s-3); }
.ivq-prog { background: var(--surface); border-radius: var(--r-md); padding: 14px 16px; box-shadow: var(--shadow-sm), var(--ring); }
.ivq-prog-label { font-size: var(--text-sm); font-weight: 600; color: var(--text-2); margin-bottom: 8px; }
.ivq-prog-track { height: 4px; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
.ivq-prog-fill { height: 100%; background: linear-gradient(90deg, #06B6D4, #3B82F6); transition: width 600ms var(--ease-out); }

.ivq-q { background: var(--surface); border-radius: var(--r-md); padding: var(--s-5); box-shadow: var(--shadow-sm), var(--ring); }
.ivq-q-num { display: inline-block; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 700; color: var(--accent); letter-spacing: 0.04em; }
.ivq-q-text { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 6px 0 0; line-height: 1.3; }
.ivq-q-meta { font-size: var(--text-xs); color: var(--text-3); margin-top: 10px; font-weight: 500; }

.ivq-error { display: flex; align-items: center; gap: 6px; padding: 9px 12px; background: var(--danger-soft); color: var(--danger); border-radius: var(--r-md); font-size: var(--text-sm); font-weight: 500; }

.ivq-video-wrap { position: relative; background: #000; border-radius: var(--r-md); overflow: hidden; }
.ivq-video { width: 100%; max-height: 420px; display: block; aspect-ratio: 16/9; object-fit: cover; background: #000; }
.ivq-rec-pill { position: absolute; top: 14px; right: 14px; display: flex; align-items: center; gap: 6px; padding: 5px 11px; background: var(--danger); color: #fff; border-radius: 99px; font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.ivq-rec-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: ivPulse 1.2s ease-in-out infinite; }
@keyframes ivPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.ivq-think-pill { position: absolute; top: 14px; right: 14px; display: flex; align-items: center; gap: 5px; padding: 5px 11px; background: rgba(0, 0, 0, 0.78); color: #fff; border-radius: 99px; font-size: var(--text-xs); font-weight: 600; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); font-variant-numeric: tabular-nums; }

.ivq-ctrl { display: flex; gap: var(--s-2); justify-content: center; flex-wrap: wrap; padding: var(--s-3) 0; }
.ivq-ctrl .iv-btn { padding: 11px 22px; font-size: var(--text-md); }

.iva-done { background: var(--surface); border-radius: var(--r-lg); padding: var(--s-9) var(--s-5); text-align: center; box-shadow: var(--shadow-sm), var(--ring); margin: var(--s-4) auto; max-width: 520px; }
.iva-done-icon { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #10B981, #059669); color: #fff; display: grid; place-items: center; margin: 0 auto var(--s-3); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.30); }
.iva-done-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0 0 8px; }
.iva-done-sub { font-size: var(--text-sm); color: var(--text-3); margin: 0 0 var(--s-4); line-height: 1.5; }

/* ═══ Modal ═══ */
.iv-overlay { position: fixed; inset: 0; background: var(--overlay); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: grid; place-items: center; padding: var(--s-4); z-index: 2000; animation: ivFadeIn 200ms var(--ease-out); }
.iv-modal { width: 100%; max-width: 480px; max-height: 90vh; background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-xl); display: flex; flex-direction: column; overflow: hidden; animation: ivModalIn 280ms var(--ease-bounce); }
.iv-modal--lg { max-width: 720px; }
.iv-modal--sm { max-width: 380px; }
@keyframes ivModalIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes ivFadeIn { from { opacity: 0; } to { opacity: 1; } }

.iv-modal-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); flex-shrink: 0; }
.iv-modal-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0; line-height: 1.1; }
.iv-modal-close { background: transparent; border: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.iv-modal-close:hover { background: var(--surface-2); color: var(--text); }
.iv-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.iv-modal-msg { font-size: var(--text-sm); color: var(--text-2); margin: 0 0 16px; line-height: 1.5; padding: 0 20px; }
.iv-modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
.iv-modal-foot { padding: 12px 20px; border-top: 1px solid var(--border); background: var(--surface-2); display: flex; justify-content: flex-end; gap: var(--s-2); flex-shrink: 0; }

.iv-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.iv-label { font-size: var(--text-xs); font-weight: 600; color: var(--text-2); letter-spacing: -0.005em; }
.iv-req { color: var(--danger); margin-left: 3px; }

.iv-input { width: 100%; padding: 9px 12px; background: var(--surface-2); border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); color: var(--text); outline: none; transition: all var(--duration-fast) var(--ease); resize: vertical; }
.iv-input:hover { background: var(--surface-3); }
.iv-input:focus { background: var(--surface); border-color: var(--accent); box-shadow: var(--ring-focus); }

/* ═══ Questions manager ═══ */
.ivmgr-q { background: var(--surface-2); border-radius: var(--r-md); padding: 12px 14px; margin-bottom: 8px; border: 1px solid var(--border); display: flex; align-items: flex-start; gap: var(--s-2); }
.ivmgr-q--new { background: var(--accent-soft); border-color: var(--accent); flex-direction: column; }
.ivmgr-q-text { flex: 1; font-size: var(--text-base); color: var(--text); font-weight: 500; line-height: 1.5; }
.ivmgr-q-num { display: inline-block; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 700; color: var(--accent); margin-right: 6px; }
.ivmgr-q-meta { display: block; font-size: var(--text-xs); color: var(--text-3); margin-top: 4px; font-weight: 500; }
.ivmgr-add { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; color: var(--text-2); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.ivmgr-add:hover { background: var(--surface-3); color: var(--text); border-color: var(--accent); }

/* ═══ Invite modal ═══ */
.iv-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
.iv-input-row .iv-input { flex: 1; }
.iv-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.iv-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: var(--info-soft); color: var(--info); border-radius: 99px; font-size: var(--text-xs); font-weight: 600; }
.iv-chip button { background: none; border: none; padding: 0; display: grid; place-items: center; cursor: pointer; color: currentColor; opacity: 0.7; }
.iv-chip button:hover { opacity: 1; }

.iv-table-wrap { overflow-x: auto; }
.iv-table { width: 100%; border-collapse: collapse; font-size: var(--text-base); }
.iv-table th { text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-3); padding: 8px 10px; border-bottom: 1px solid var(--border); }
.iv-table td { padding: 9px 10px; border-bottom: 1px solid var(--border); color: var(--text-2); }
.iv-st { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; letter-spacing: 0.02em; }
.iv-st--ok   { background: var(--success-soft); color: var(--success); }
.iv-st--fail { background: var(--danger-soft); color: var(--danger); }
.iv-st--pend { background: var(--surface-2); color: var(--text-3); }

/* ═══ Charts ═══ */
.iv-chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s-3); }
.iv-chart-card { background: var(--surface-2); border-radius: var(--r-md); padding: var(--s-4); text-align: center; border: 1px solid var(--border); position: relative; overflow: hidden; }
.iv-chart-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--c1), var(--c2)); }
.iv-chart-num { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400; letter-spacing: -0.025em; line-height: 1; background: linear-gradient(135deg, var(--c1), var(--c2)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-variant-numeric: tabular-nums; }
.iv-chart-lbl { font-size: var(--text-xs); color: var(--text-3); margin-top: 6px; font-weight: 500; }

/* ═══ Animations ═══ */
@keyframes ivFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ═══ Responsive ═══ */
@media (max-width: 1100px) { .iv-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) {
  .iv-grid { grid-template-columns: 1fr; }
  .iv-title { font-size: var(--text-3xl); }
  .iv-modal-row { grid-template-columns: 1fr; }
  .ivq-q-text { font-size: var(--text-xl); }
}

/* ═══ SUBMISSIONS MODAL ═══ */
.iv-icon-btn--accent {
  color: var(--accent) !important;
  background: var(--accent-soft) !important;
}
.iv-icon-btn--accent:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent) !important;
  color: var(--accent-hover) !important;
}
.iv-sub-meta {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin: 4px 0 0;
  font-weight: 500;
}
.iv-sub-body { padding-bottom: 0; }
.iv-sub-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  margin-bottom: 14px;
  color: var(--text-3);
  transition: border-color var(--duration-fast) var(--ease);
}
.iv-sub-search:focus-within { border-color: var(--accent); }
.iv-sub-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
}
.iv-sub-search input::placeholder { color: var(--text-3); }
.iv-sub-clear {
  background: var(--surface-3);
  border: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  display: grid; place-items: center;
  cursor: pointer;
  color: var(--text-3);
}
.iv-sub-clear:hover { background: var(--surface); color: var(--text); }
.iv-sub-empty {
  text-align: center;
  padding: var(--s-7) var(--s-3);
}
.iv-sub-empty-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid; place-items: center;
  margin: 0 auto var(--s-3);
}
.iv-sub-empty-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text);
  letter-spacing: -0.025em;
  margin-bottom: 4px;
}
.iv-sub-empty-msg {
  font-size: var(--text-sm);
  color: var(--text-3);
  max-width: 340px;
  margin: 0 auto;
  line-height: 1.5;
}
.iv-sub-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.iv-sub-card {
  background: var(--surface-2);
  border-radius: var(--r-md);
  overflow: hidden;
  transition: box-shadow var(--duration-fast) var(--ease);
}
.iv-sub-card:hover { box-shadow: var(--shadow-sm); }
.iv-sub-card--open { background: var(--surface); box-shadow: var(--shadow-sm), var(--ring); }
.iv-sub-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--text-3);
  transition: background var(--duration-fast) var(--ease);
}
.iv-sub-head:hover { background: var(--surface-3); }
.iv-sub-card--open .iv-sub-head { background: transparent; }
.iv-sub-card--open .iv-sub-head:hover { background: var(--surface-2); }
.iv-sub-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-text);
  font-weight: 700;
  font-size: 14px;
  display: grid; place-items: center;
  flex-shrink: 0;
  letter-spacing: -0.01em;
}
.iv-sub-info { flex: 1; min-width: 0; }
.iv-sub-email {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.005em;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.iv-sub-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.iv-sub-count, .iv-sub-time {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.iv-sub-detail {
  border-top: 1px solid var(--border);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ivSubExpand 200ms var(--ease-out);
}
@keyframes ivSubExpand {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.iv-sub-no-resp, .iv-sub-no-video {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-style: italic;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.iv-sub-question {
  background: var(--surface-2);
  border-radius: var(--r-sm);
  padding: 12px;
}
.iv-sub-q-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}
.iv-sub-q-num {
  background: var(--accent);
  color: var(--accent-text);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.iv-sub-q-text {
  flex: 1;
  font-size: var(--text-base);
  color: var(--text);
  line-height: 1.4;
  font-weight: 500;
}
.iv-sub-q-time {
  font-size: 10px;
  color: var(--text-3);
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}
.iv-sub-videos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.iv-sub-video-wrap {
  background: #000;
  border-radius: var(--r-sm);
  overflow: hidden;
  position: relative;
}
.iv-sub-video {
  width: 100%;
  display: block;
  max-height: 360px;
  background: #000;
}
.iv-sub-video-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}
.iv-sub-video-meta {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.iv-sub-download {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  padding: 4px 10px;
  border-radius: var(--r-sm);
  transition: background var(--duration-fast) var(--ease);
}
.iv-sub-download:hover { background: var(--accent-soft); }
`;