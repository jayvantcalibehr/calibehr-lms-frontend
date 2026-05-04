import { useState, useEffect } from 'react';
import {
  RiAwardLine, RiTimeLine, RiCheckLine, RiCloseLine,
  RiAddLine, RiEdit2Line, RiDeleteBin6Line, RiSendPlaneLine,
  RiEyeLine, RiEyeOffLine, RiMailLine, RiListUnordered,
  RiPieChartLine, RiRefreshLine, RiArrowDownSLine, RiArrowUpSLine,
  RiSearchLine, RiArrowLeftLine, RiAlertLine, RiBrainLine, RiBarChartBoxLine,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';

/* ═══════════════════════════════════════════════════════════════════
   QUIZ FORM MODAL — admin add/edit
   ═══════════════════════════════════════════════════════════════════ */
function QuizFormModal({ quiz, onClose, onSaved, onToast }) {
  const isEdit = !!quiz;
  const [form, setForm] = useState({
    name:               quiz?.name || '',
    description:        quiz?.description || '',
    type:               quiz?.type ?? 0,
    points:             quiz?.points ?? 1,
    passing_percentage: quiz?.passing_percentage ?? 75,
    number_of_attempt:  quiz?.number_of_attempt ?? 1,
    time:               quiz?.time ?? 30,
    show_marks:         quiz?.show_marks ?? 1,
    visibility:         quiz?.visibility ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { onToast?.('Quiz name required.'); return; }
    setSaving(true);
    try {
      if (isEdit) await API.post('/Webservice/updateQuizDetail', { quizID: quiz.id, ...form });
      else        await API.post('/Webservice/addQuiz', form);
      onSaved();
    } catch { onToast?.('Failed to save.'); }
    setSaving(false);
  };

  return (
    <Modal onClose={() => !saving && onClose()}>
      <div className="qz-modal-head">
        <h2 className="qz-modal-title">{isEdit ? 'Edit quiz' : 'New quiz'}</h2>
        <button className="qz-modal-close" onClick={onClose} disabled={saving}>
          <RiCloseLine size={16}/>
        </button>
      </div>

      <div className="qz-modal-body">
        <Field label="Quiz name" required>
          <input className="qz-input" autoFocus value={form.name}
                 onChange={e => f('name', e.target.value)}
                 placeholder="e.g. HR Policy Test"/>
        </Field>
        <Field label="Description">
          <textarea className="qz-input" rows={3} value={form.description}
                    onChange={e => f('description', e.target.value)}
                    placeholder="Optional description…"/>
        </Field>
        <div className="qz-modal-row">
          <Field label="Time limit (minutes)">
            <input className="qz-input" type="number" min={1} value={form.time}
                   onChange={e => f('time', +e.target.value)}/>
          </Field>
          <Field label="Passing %">
            <input className="qz-input" type="number" min={1} max={100}
                   value={form.passing_percentage}
                   onChange={e => f('passing_percentage', +e.target.value)}/>
          </Field>
        </div>
        <div className="qz-modal-row">
          <Field label="Max attempts">
            <input className="qz-input" type="number" min={1} value={form.number_of_attempt}
                   onChange={e => f('number_of_attempt', +e.target.value)}/>
          </Field>
          <Field label="Points / question">
            <input className="qz-input" type="number" min={1} value={form.points}
                   onChange={e => f('points', +e.target.value)}/>
          </Field>
        </div>
        <div className="qz-modal-row">
          <Field label="Show marks to learner">
            <select className="qz-input" value={form.show_marks}
                    onChange={e => f('show_marks', +e.target.value)}>
              <option value={1}>Yes</option><option value={0}>No</option>
            </select>
          </Field>
          <Field label="Visibility">
            <select className="qz-input" value={form.visibility}
                    onChange={e => f('visibility', +e.target.value)}>
              <option value={0}>Private</option><option value={1}>Public</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="qz-modal-foot">
        <button className="qz-btn qz-btn--ghost" onClick={onClose}>Cancel</button>
        <button className="qz-btn qz-btn--primary" onClick={save} disabled={saving}>
          <RiCheckLine size={14}/>
          {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QUESTIONS MANAGER — admin manages questions of a quiz
   ═══════════════════════════════════════════════════════════════════ */
function QuestionsModal({ quiz, onClose, onToast }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [adding,    setAdding]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [newQ, setNewQ] = useState({
    text: '', point: 1,
    options: [
      { text: '', correct: false }, { text: '', correct: false },
      { text: '', correct: false }, { text: '', correct: false },
    ],
  });

  useEffect(() => { loadQ(); }, []);

  const loadQ = async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservice/getQuizDetails', { params: { quizID: quiz.id } });
      if (res.data.code === 1) setQuestions(res.data.data?.questions || []);
    } catch {}
    setLoading(false);
  };

  const addQuestion = async () => {
    if (!newQ.text.trim()) { onToast?.('Question text required.'); return; }
    if (!newQ.options.some(o => o.correct && o.text.trim())) {
      onToast?.('Mark at least one correct answer.'); return;
    }
    setSaving(true);
    try {
      const qRes = await API.post('/Webservice/addQuizQuestion', {
        quizID: quiz.id, question_text: newQ.text, point: newQ.point,
      });
      if (qRes.data.code === 1) {
        const qID = qRes.data.data.questionID;
        const opts = newQ.options.filter(o => o.text.trim()).map(o => ({
          option_text: o.text, answer: o.correct ? 1 : 0, value: o.correct ? 1 : 0,
        }));
        await API.post('/Webservice/addQuizQuestionOptions', { questionID: qID, options: opts });
        await API.post('/Webservice/sendQuizQuestion', { questionID: qID });
        setAdding(false);
        setNewQ({
          text: '', point: 1,
          options: [
            { text: '', correct: false }, { text: '', correct: false },
            { text: '', correct: false }, { text: '', correct: false },
          ],
        });
        loadQ();
      }
    } catch { onToast?.('Failed to add question.'); }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const qID = confirmDel;
    setConfirmDel(null);
    try { await API.post('/Webservice/deleteQuizQuestion', { questionID: qID }); loadQ(); }
    catch { onToast?.('Delete failed.'); }
  };

  const setOpt = (i, key, val) => setNewQ(p => {
    const opts = [...p.options];
    if (key === 'correct') opts.forEach((_, x) => { opts[x] = { ...opts[x], correct: false }; });
    opts[i] = { ...opts[i], [key]: val };
    return { ...p, options: opts };
  });

  return (
    <>
    <Modal large onClose={onClose}>
      <div className="qz-modal-head">
        <h2 className="qz-modal-title">Questions · {quiz.name}</h2>
        <button className="qz-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>

      <div className="qz-modal-body">
        {loading ? (
          <div className="qz-state">Loading…</div>
        ) : (
          <>
            {questions.length === 0 && !adding && (
              <div className="qz-state">No questions yet.</div>
            )}
            {questions.map((q, qi) => (
              <article key={q.id} className="qmgr-q">
                <header className="qmgr-q-head">
                  <div className="qmgr-q-text">
                    <span className="qmgr-q-num">Q{qi + 1}</span>
                    {q.question_text}
                    <span className="qmgr-q-pts">{q.point} pt{q.point !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="qmgr-q-actions">
                    <button className="qz-icon-btn"
                            onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                            title="Show options">
                      {expanded === q.id ? <RiArrowUpSLine size={15}/> : <RiArrowDownSLine size={15}/>}
                    </button>
                    <button className="qz-icon-btn qz-icon-btn--danger"
                            onClick={() => setConfirmDel(q.id)} title="Delete">
                      <RiDeleteBin6Line size={13}/>
                    </button>
                  </div>
                </header>
                {expanded === q.id && (
                  <div className="qmgr-opts">
                    {(q.options || []).map(o => (
                      <span key={o.id} className={`qmgr-opt ${o.answer == 1 ? 'qmgr-opt--ok' : ''}`}>
                        {o.answer == 1 && <RiCheckLine size={11}/>}
                        {o.option_text}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}

            {adding ? (
              <article className="qmgr-q qmgr-q--new">
                <Field label="Question text" required>
                  <textarea className="qz-input" rows={2} value={newQ.text}
                            onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
                            placeholder="Type question here…"/>
                </Field>
                <Field label="Points">
                  <input className="qz-input" type="number" min={1} value={newQ.point}
                         onChange={e => setNewQ(p => ({ ...p, point: +e.target.value }))}
                         style={{ maxWidth: 100 }}/>
                </Field>
                <div className="qz-label">Options · pick the correct answer</div>
                {newQ.options.map((o, i) => (
                  <div key={i} className="qmgr-opt-row">
                    <input type="radio" name="correct_opt" checked={o.correct}
                           onChange={() => setOpt(i, 'correct', true)}/>
                    <input className="qz-input" value={o.text}
                           onChange={e => setOpt(i, 'text', e.target.value)}
                           placeholder={`Option ${i + 1}`}/>
                  </div>
                ))}
                <div className="qz-modal-foot" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 16, background: 'transparent', borderTop: 'none' }}>
                  <button className="qz-btn qz-btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
                  <button className="qz-btn qz-btn--primary" onClick={addQuestion} disabled={saving}>
                    <RiCheckLine size={14}/>{saving ? 'Saving…' : 'Add question'}
                  </button>
                </div>
              </article>
            ) : (
              <button className="qmgr-add" onClick={() => setAdding(true)}>
                <RiAddLine size={14}/>Add new question
              </button>
            )}
          </>
        )}
      </div>
    </Modal>

    {confirmDel && (
      <Modal small onClose={() => setConfirmDel(null)}>
        <h3 className="qz-modal-title">Delete question?</h3>
        <p className="qz-modal-msg">This action cannot be undone.</p>
        <div className="qz-modal-foot">
          <button className="qz-btn qz-btn--ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
          <button className="qz-btn qz-btn--danger" onClick={doDelete}>
            <RiDeleteBin6Line size={13}/>Delete
          </button>
        </div>
      </Modal>
    )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INVITE MODAL — send email invites
   ═══════════════════════════════════════════════════════════════════ */
function InviteModal({ quiz, onClose, onToast }) {
  const [emailInput,  setEmailInput]  = useState('');
  const [emails,      setEmails]      = useState([]);
  const [invList,     setInvList]     = useState([]);
  const [tab,         setTab]         = useState('send');
  const [sending,     setSending]     = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [viewDetailInv, setViewDetailInv] = useState(null);   // invite to view details for

  useEffect(() => { if (tab === 'list') loadList(); }, [tab]);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const res = await API.get('/Webservice/getInvitedList', { params: { quizID: quiz.id } });
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
      const res = await API.post('/Webservice/sendInviteToQuiz', { quizID: quiz.id, emails });
      if (res.data.code === 1) {
        onToast?.(`Sent ${res.data.data?.sent ?? emails.length} invite(s)`, 'ok');
        setEmails([]); setTab('list');
      } else onToast?.(res.data.message || 'Failed to send.');
    } catch { onToast?.('Send failed.'); }
    setSending(false);
  };

  return (
    <Modal large onClose={onClose}>
      <div className="qz-modal-head">
        <h2 className="qz-modal-title">Invites · {quiz.name}</h2>
        <button className="qz-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>

      <div className="qz-modal-body">
        <div className="qz-tabs">
          {[
            { key: 'send', label: 'Send invites', icon: <RiSendPlaneLine size={12}/> },
            { key: 'list', label: 'Invited list',  icon: <RiListUnordered size={12}/> },
          ].map(t => (
            <button key={t.key} className={`qz-tab ${tab === t.key ? 'qz-tab--active' : ''}`}
                    onClick={() => setTab(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'send' ? (
          <>
            <div className="inv-input-row">
              <input className="qz-input" type="email" placeholder="Enter email address"
                     value={emailInput}
                     onChange={e => setEmailInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && addEmail()}/>
              <button className="qz-btn qz-btn--primary" onClick={addEmail}>Add</button>
            </div>
            {emails.length > 0 && (
              <div className="inv-chips">
                {emails.map(e => (
                  <span key={e} className="inv-chip">
                    <RiMailLine size={11}/>{e}
                    <button onClick={() => setEmails(p => p.filter(x => x !== e))}>
                      <RiCloseLine size={11}/>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="qz-modal-foot" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 16, background: 'transparent', borderTop: 'none' }}>
              <button className="qz-btn qz-btn--ghost" onClick={onClose}>Cancel</button>
              <button className="qz-btn qz-btn--primary" onClick={sendInvites} disabled={sending || !emails.length}>
                <RiSendPlaneLine size={13}/>
                {sending ? 'Sending…' : `Send to ${emails.length} email${emails.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        ) : loadingList ? (
          <div className="qz-state">Loading…</div>
        ) : invList.length === 0 ? (
          <div className="qz-state">No invites sent yet.</div>
        ) : (
          <>
            {/* Quick stats above the list */}
            <div className="inv-stats">
              {(() => {
                const total = invList.length;
                const completed = invList.filter(i => i.status == 1).length;
                const passed = invList.filter(i => i.has_result && i.pass == 1).length;
                const failed = invList.filter(i => i.has_result && i.pass == 0).length;
                return (
                  <>
                    <div className="inv-stat"><span className="inv-stat-num">{total}</span><span className="inv-stat-lbl">Invited</span></div>
                    <div className="inv-stat"><span className="inv-stat-num">{completed}</span><span className="inv-stat-lbl">Completed</span></div>
                    <div className="inv-stat inv-stat--ok"><span className="inv-stat-num">{passed}</span><span className="inv-stat-lbl">Passed</span></div>
                    <div className="inv-stat inv-stat--fail"><span className="inv-stat-num">{failed}</span><span className="inv-stat-lbl">Failed</span></div>
                  </>
                );
              })()}
            </div>

            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Sent on</th>
                    <th>Email status</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Result</th>
                    <th>Submitted on</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invList.map(inv => (
                    <tr key={inv.id}>
                      <td>{inv.email}</td>
                      <td>{inv.sent_on ? new Date(inv.sent_on).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <span className={`inv-st inv-st--${inv.sent_status == 1 ? 'ok' : inv.sent_status == 2 ? 'fail' : 'pend'}`}>
                          {inv.sent_status == 1 ? 'Sent' : inv.sent_status == 2 ? 'Failed' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span className={`inv-st inv-st--${inv.status == 1 ? 'ok' : 'pend'}`}>
                          {inv.status == 1 ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {inv.has_result ? (
                          <span className="inv-score">
                            <span className="inv-score-num">{inv.percentage}%</span>
                            <span className="inv-score-frac">{inv.correct}/{inv.total_qs}</span>
                          </span>
                        ) : <span className="inv-muted">—</span>}
                      </td>
                      <td>
                        {inv.has_result ? (
                          <span className={`inv-st inv-st--${inv.pass == 1 ? 'ok' : 'fail'}`}>
                            {inv.pass == 1 ? 'Pass' : 'Fail'}
                          </span>
                        ) : <span className="inv-muted">—</span>}
                      </td>
                      <td>{inv.answered_on ? new Date(inv.answered_on).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        {inv.has_result && (
                          <button
                            className="qz-btn qz-btn--ghost qz-btn--sm"
                            onClick={() => setViewDetailInv(inv)}
                            title="View detailed answers"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {viewDetailInv && (
        <SubmissionDetailModal
          inviteId={viewDetailInv.id}
          email={viewDetailInv.email}
          onClose={() => setViewDetailInv(null)}
        />
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUBMISSION DETAIL MODAL — Per-candidate detailed answer breakdown
   Shows each question with the candidate's selected answer + correct
   answer marked. Used by Admin to review individual submissions.
   ═══════════════════════════════════════════════════════════════════ */
function SubmissionDetailModal({ inviteId, email, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get(`/Webservice/quiz/submission/${inviteId}`);
        if (cancelled) return;
        if (res.data.code === 1) {
          setData(res.data.data);
        } else {
          setError(res.data.message || 'Failed to load submission.');
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [inviteId]);

  return (
    <Modal large onClose={onClose}>
      <div className="qz-modal-head">
        <h2 className="qz-modal-title">Submission · {email}</h2>
        <button className="qz-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>

      <div className="qz-modal-body">
        {loading && <div className="qz-state">Loading submission…</div>}
        {error && <div className="qz-state qz-state--error">{error}</div>}

        {data && data.status === 'not_submitted' && (
          <div className="qz-state">
            This candidate has not yet submitted the quiz.
          </div>
        )}

        {data && data.status === 'submitted' && (
          <>
            {/* Result summary card */}
            <div className={`sub-summary ${data.answer.pass ? 'sub-summary--pass' : 'sub-summary--fail'}`}>
              <div className="sub-summary-icon">
                {data.answer.pass ? <RiCheckLine size={28}/> : <RiCloseLine size={28}/>}
              </div>
              <div className="sub-summary-main">
                <div className="sub-summary-result">{data.answer.pass ? 'Passed' : 'Failed'}</div>
                <div className="sub-summary-meta">
                  Passing: {data.quiz.passing_percentage}% ·
                  Submitted on {data.answer.answered_on ? new Date(data.answer.answered_on).toLocaleString('en-IN') : '—'}
                </div>
              </div>
              <div className="sub-summary-score">
                <div className="sub-summary-pct">{data.answer.percentage}%</div>
                <div className="sub-summary-frac">{data.answer.correct} / {data.answer.total_qs} correct</div>
              </div>
            </div>

            {/* Quick stats strip */}
            <div className="sub-stats">
              <div className="sub-stat">
                <span className="sub-stat-lbl">Points</span>
                <span className="sub-stat-val">{data.answer.points}/{data.answer.total_points}</span>
              </div>
              <div className="sub-stat">
                <span className="sub-stat-lbl">Time up</span>
                <span className="sub-stat-val">{data.answer.time_up === 1 ? 'Yes (auto-submit)' : 'No'}</span>
              </div>
              <div className="sub-stat">
                <span className="sub-stat-lbl">Tab switches</span>
                <span className="sub-stat-val">{data.answer.switch_tabs === 1 ? 'Flagged (>3)' : 'Normal'}</span>
              </div>
              <div className="sub-stat">
                <span className="sub-stat-lbl">IP</span>
                <span className="sub-stat-val sub-stat-val--mono">{data.answer.ip || '—'}</span>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="sub-section-title">Question-by-question breakdown</div>

            <div className="sub-questions">
              {data.breakdown.map((q, idx) => (
                <article key={q.question_id} className={`sub-q sub-q--${q.result === 1 ? 'correct' : q.answered ? 'wrong' : 'skipped'}`}>
                  <header className="sub-q-head">
                    <div className="sub-q-num">Q{idx + 1}</div>
                    <div className="sub-q-text">{q.question}</div>
                    <div className="sub-q-result">
                      {q.result === 1 ? (
                        <span className="sub-q-badge sub-q-badge--ok"><RiCheckLine size={11}/> Correct</span>
                      ) : q.answered ? (
                        <span className="sub-q-badge sub-q-badge--fail"><RiCloseLine size={11}/> Wrong</span>
                      ) : (
                        <span className="sub-q-badge sub-q-badge--skip">Skipped</span>
                      )}
                    </div>
                  </header>

                  <div className="sub-q-options">
                    {q.options.map(opt => {
                      const isSelected = q.selected_option?.id === opt.id;
                      const isCorrect  = opt.is_correct;
                      let cls = 'sub-q-opt';
                      if (isSelected && isCorrect)       cls += ' sub-q-opt--selected-correct';
                      else if (isSelected && !isCorrect) cls += ' sub-q-opt--selected-wrong';
                      else if (isCorrect)                cls += ' sub-q-opt--correct-unselected';

                      return (
                        <div key={opt.id} className={cls}>
                          <span className="sub-q-opt-marker">
                            {isSelected ? '●' : '○'}
                          </span>
                          <span className="sub-q-opt-text">{opt.option}</span>
                          {isCorrect && <span className="sub-q-opt-tag sub-q-opt-tag--correct">Correct answer</span>}
                          {isSelected && !isCorrect && <span className="sub-q-opt-tag sub-q-opt-tag--wrong">Their answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS MODAL
   ═══════════════════════════════════════════════════════════════════ */
function ChartsModal({ quiz, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    API.get('/Webservice/getOverViewChartsQuiz', { params: { quizID: quiz.id } })
      .then(r => { if (r.data.code === 1) setData(r.data.data); })
      .catch(() => {});
  }, []);

  const passRate = data && data.completed > 0 ? Math.round((data.passed / data.completed) * 100) : 0;
  const pending = data ? (data.total - data.completed) : 0;

  return (
    <Modal large onClose={onClose}>
      <div className="qz-modal-head">
        <h2 className="qz-modal-title">Analytics · {quiz.name}</h2>
        <button className="qz-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>
      <div className="qz-modal-body">
        {!data ? (
          <div className="qz-state">Loading…</div>
        ) : (
          <div className="chart-grid">
            {[
              { num: data.total,                       lbl: 'Invited',     c1: '#06B6D4', c2: '#0EA5E9' },
              { num: data.completed,                   lbl: 'Completed',   c1: '#10B981', c2: '#059669' },
              { num: pending,                          lbl: 'Pending',     c1: '#F59E0B', c2: '#EF4444' },
              { num: data.passed,                      lbl: 'Passed',      c1: '#10B981', c2: '#059669' },
              { num: data.failed,                      lbl: 'Failed',      c1: '#EF4444', c2: '#DC2626' },
              { num: passRate + '%',                   lbl: 'Pass rate',   c1: '#A78BFA', c2: '#8B5CF6' },
              { num: (data.avgPct || 0).toFixed(1) + '%', lbl: 'Avg score', c1: '#EC4899', c2: '#F43F5E' },
            ].map(c => (
              <div key={c.lbl} className="chart-card" style={{ '--c1': c.c1, '--c2': c.c2 }}>
                <div className="chart-num">{c.num}</div>
                <div className="chart-lbl">{c.lbl}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="qz-modal-foot">
        <button className="qz-btn qz-btn--ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */
function Modal({ children, onClose, large, small }) {
  return (
    <div className="qz-overlay" onClick={onClose}>
      <div
        className={`qz-modal ${large ? 'qz-modal--lg' : ''} ${small ? 'qz-modal--sm' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="qz-field">
      <label className="qz-label">{label}{required && <span className="qz-req">*</span>}</label>
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
   ─────────────────────────────────────────────────────────────────────
   Quiz tab is visible only to Admin / Quiz Master / HR Recruiter.
   Page is purely management: create, edit, send invites, view results.
   Quiz-taking happens via PUBLIC INVITE LINK only — no in-app attempt.
   ═══════════════════════════════════════════════════════════════════ */
export default function Quiz() {
  const [quizzes,    setQuizzes]    = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editQuiz,   setEditQuiz]   = useState(null);
  const [qMgrQuiz,   setQMgrQuiz]   = useState(null);
  const [invQuiz,    setInvQuiz]    = useState(null);
  const [chartQuiz,  setChartQuiz]  = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const { toast, show } = useToast();

  useEffect(() => { loadQuizzes(); }, []);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservices/getAllQuizList');
      if (res.data.code === 1) setQuizzes(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  const toggleVisibility = async (q) => {
    try {
      await API.post('/Webservice/visibilityStatusQuiz', {
        quizID: q.id, visibility: q.visibility == 1 ? 0 : 1,
      });
      loadQuizzes();
    } catch { show('Action failed.'); }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const q = confirmDel; setConfirmDel(null);
    try { await API.post('/Webservice/updateQuizDetail', { quizID: q.id, status: 0 }); loadQuizzes(); }
    catch { show('Delete failed.'); }
  };

  const filtered = quizzes.filter(q =>
    (q.title || q.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* Hero */}
      <header className="qz-hero">
        <div>
          <div className="qz-eyebrow">Manage quizzes</div>
          <h1 className="qz-title">Quizzes.</h1>
          <p className="qz-sub">
            {loading
              ? 'Loading…'
              : `${quizzes.length} ${quizzes.length === 1 ? 'quiz' : 'quizzes'} in the catalog. Send invite links to candidates by email.`}
          </p>
        </div>
        <button className="qz-btn qz-btn--primary" onClick={() => setShowAdd(true)}>
          <RiAddLine size={14}/>New quiz
        </button>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`qz-toast qz-toast--${toast.type}`}>
          {toast.type === 'ok' ? <RiCheckLine size={14}/> : <RiAlertLine size={14}/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Search */}
      <div className="qz-toolbar">
        <div className="qz-search">
          <RiSearchLine size={14}/>
          <input placeholder="Search quizzes…" value={search}
                 onChange={e => setSearch(e.target.value)}/>
          {search && (
            <button className="qz-search-clear" onClick={() => setSearch('')}>
              <RiCloseLine size={13}/>
            </button>
          )}
        </div>
        <button className="qz-btn qz-btn--ghost qz-btn--sm" onClick={loadQuizzes}>
          <RiRefreshLine size={13}/>Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="qz-state">Loading quizzes…</div>
      ) : filtered.length === 0 ? (
        <div className="qz-empty">
          <div className="qz-empty-icon"><RiBrainLine size={26}/></div>
          <div className="qz-empty-title">No quizzes found</div>
          <div className="qz-empty-sub">
            {search ? 'Try a different search term.' : 'New quizzes will appear here.'}
          </div>
          {!search && (
            <button className="qz-btn qz-btn--primary" onClick={() => setShowAdd(true)} style={{ marginTop: 16 }}>
              <RiAddLine size={14}/>Create first quiz
            </button>
          )}
        </div>
      ) : (
        <div className="qz-grid">
          {filtered.map((q, i) => {
            return (
              <article key={q.id} className="qz-card" style={{ animationDelay: `${i * 50}ms` }}>
                <header className="qz-card-head">
                  <div className="qz-card-icon">
                    <span className="qz-card-icon-bg"/>
                    <RiBrainLine size={18}/>
                  </div>
                  <span className={`qz-pill qz-pill--${q.status == 2 ? 'live' : 'draft'}`}>
                    {q.status == 2 ? 'Live' : 'Draft'}
                  </span>
                </header>
                <h3 className="qz-card-title">{q.title || q.name}</h3>
                {q.description && <p className="qz-card-desc">{q.description}</p>}
                <div className="qz-card-meta">
                  <span><RiTimeLine size={11}/>{q.time_limit ?? q.time ?? 30} min</span>
                  <span><RiAwardLine size={11}/>Pass {q.pass_percentage ?? q.passing_percentage ?? 75}%</span>
                </div>

                <div className="qz-card-actions">
                  <button className="qz-action" onClick={() => setEditQuiz(q)} title="Edit">
                    <RiEdit2Line size={12}/>
                  </button>
                  <button className="qz-action" onClick={() => setQMgrQuiz(q)} title="Questions">
                    <RiListUnordered size={12}/>
                  </button>
                  <button className="qz-action qz-action--primary" onClick={() => setInvQuiz(q)} title="Send invites & view results">
                    <RiMailLine size={12}/>
                  </button>
                  <button className="qz-action" onClick={() => setChartQuiz(q)} title="Analytics">
                    <RiPieChartLine size={12}/>
                  </button>
                  <button className="qz-action" onClick={() => toggleVisibility(q)}
                          title={q.visibility == 1 ? 'Hide' : 'Show'}>
                    {q.visibility == 1 ? <RiEyeOffLine size={12}/> : <RiEyeLine size={12}/>}
                  </button>
                  <button className="qz-action qz-action--danger"
                          onClick={() => setConfirmDel(q)} title="Delete">
                    <RiDeleteBin6Line size={12}/>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <QuizFormModal onClose={() => setShowAdd(false)}
                       onSaved={() => { setShowAdd(false); loadQuizzes(); show('Quiz created', 'ok'); }}
                       onToast={show}/>
      )}
      {editQuiz && (
        <QuizFormModal quiz={editQuiz}
                       onClose={() => setEditQuiz(null)}
                       onSaved={() => { setEditQuiz(null); loadQuizzes(); show('Quiz updated', 'ok'); }}
                       onToast={show}/>
      )}
      {qMgrQuiz  && <QuestionsModal quiz={qMgrQuiz}  onClose={() => setQMgrQuiz(null)} onToast={show}/>}
      {invQuiz   && <InviteModal    quiz={invQuiz}   onClose={() => setInvQuiz(null)}  onToast={show}/>}
      {chartQuiz && <ChartsModal    quiz={chartQuiz} onClose={() => setChartQuiz(null)}/>}

      {confirmDel && (
        <Modal small onClose={() => setConfirmDel(null)}>
          <h3 className="qz-modal-title">Delete quiz?</h3>
          <p className="qz-modal-msg">"{confirmDel.name}" will be removed. This cannot be undone.</p>
          <div className="qz-modal-foot">
            <button className="qz-btn qz-btn--ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="qz-btn qz-btn--danger" onClick={doDelete}>
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
.qz-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--s-4); margin-bottom: var(--s-5); flex-wrap: wrap; animation: qzFadeUp 600ms var(--ease-out); }
.qz-eyebrow { font-size: var(--text-sm); color: var(--text-3); font-weight: 500; margin-bottom: 6px; }
.qz-title { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 400; letter-spacing: -0.03em; color: var(--text); margin: 0 0 6px; line-height: 1; }
.qz-sub { font-size: var(--text-md); color: var(--text-2); margin: 0; line-height: 1.5; }

/* ── Toast ── */
.qz-toast { position: fixed; top: 80px; right: 28px; display: flex; align-items: center; gap: var(--s-2); padding: 11px 16px; border-radius: var(--r-md); font-size: var(--text-sm); font-weight: 600; box-shadow: var(--shadow-lg); z-index: 1000; animation: qzSlide 280ms var(--ease-bounce); }
.qz-toast--ok  { background: var(--accent); color: var(--accent-text); }
.qz-toast--err { background: var(--danger); color: #fff; }
@keyframes qzSlide { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* ── Tabs ── */
.qz-tabs { display: inline-flex; gap: 2px; background: var(--surface-2); border-radius: var(--r-md); padding: 3px; }
.qz-tabs--page { margin-bottom: var(--s-3); animation: qzFadeUp 500ms var(--ease-out) 100ms both; }
.qz-tab { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; background: transparent; border: none; border-radius: 7px; font-family: inherit; font-size: var(--text-base); font-weight: 600; color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); letter-spacing: -0.005em; }
.qz-tab:hover { color: var(--text-2); }
.qz-tab--active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-xs); }

/* ── Toolbar ── */
.qz-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); margin-bottom: var(--s-4); flex-wrap: wrap; }
.qz-search { display: flex; align-items: center; gap: var(--s-2); padding: 9px 12px; background: var(--surface); border-radius: var(--r-md); box-shadow: var(--shadow-sm), var(--ring); flex: 1; max-width: 480px; color: var(--text-3); transition: box-shadow var(--duration-fast) var(--ease); }
.qz-search:focus-within { box-shadow: var(--ring-focus); }
.qz-search input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: var(--text-base); color: var(--text); }
.qz-search input::placeholder { color: var(--text-3); }
.qz-search-clear { background: none; border: none; padding: 2px; display: grid; place-items: center; color: var(--text-3); border-radius: 4px; cursor: pointer; }
.qz-search-clear:hover { background: var(--surface-2); color: var(--text); }

/* ── Buttons ── */
.qz-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; cursor: pointer; letter-spacing: -0.005em; transition: all var(--duration-fast) var(--ease); }
.qz-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.qz-btn:active:not(:disabled) { transform: scale(0.97); }
.qz-btn--sm { padding: 7px 11px; font-size: var(--text-xs); }
.qz-btn--lg { padding: 11px 22px; font-size: var(--text-md); }
.qz-btn--primary { background: var(--accent); color: var(--accent-text); box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent); }
.qz-btn--primary:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
.qz-btn--ghost { background: var(--surface); border-color: var(--border-strong); color: var(--text); }
.qz-btn--ghost:hover:not(:disabled) { background: var(--surface-2); }
.qz-btn--danger { background: var(--danger); color: #fff; }
.qz-btn--danger:hover:not(:disabled) { background: color-mix(in srgb, var(--danger) 85%, black); }

/* ── States ── */
.qz-state { text-align: center; padding: var(--s-9) var(--s-4); color: var(--text-3); font-size: var(--text-sm); }
.qz-empty { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm), var(--ring); padding: var(--s-9) var(--s-4); text-align: center; }
.qz-empty-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; margin: 0 auto var(--s-3); }
.qz-empty-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; color: var(--text); letter-spacing: -0.025em; margin-bottom: 4px; }
.qz-empty-sub { font-size: var(--text-sm); color: var(--text-3); max-width: 340px; margin: 0 auto; }

/* ── Card grid ── */
.qz-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
.qz-card { background: var(--surface); border-radius: var(--r-lg); padding: var(--s-5); box-shadow: var(--shadow-sm), var(--ring); display: flex; flex-direction: column; gap: var(--s-3); opacity: 0; animation: qzFadeUp 500ms var(--ease-out) forwards; transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease); }
.qz-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md), var(--ring); }

.qz-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-3); }
.qz-card-icon { position: relative; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; color: #fff; }
.qz-card-icon-bg { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(135deg, #F59E0B, #EF4444); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.30); }
.qz-card-icon > svg { position: relative; z-index: 1; }

.qz-card-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.02em; color: var(--text); margin: 0; line-height: 1.2; }
.qz-card-desc { font-size: var(--text-xs); color: var(--text-3); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.qz-card-meta { display: flex; gap: var(--s-3); flex-wrap: wrap; font-size: var(--text-xs); color: var(--text-3); font-weight: 500; }
.qz-card-meta span { display: inline-flex; align-items: center; gap: 4px; }
.qz-card-score { font-weight: 700; }
.qz-card-score--ok { color: var(--success); }
.qz-card-score--fail { color: var(--danger); }

.qz-card-cta { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: var(--accent); color: var(--accent-text); border: none; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; cursor: pointer; letter-spacing: -0.005em; transition: all var(--duration-fast) var(--ease); box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent); margin-top: auto; }
.qz-card-cta:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
.qz-card-cta:disabled { opacity: 0.55; cursor: not-allowed; background: var(--surface-2); color: var(--text-3); box-shadow: none; }

.qz-card-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; }
.qz-action { width: 32px; height: 32px; display: grid; place-items: center; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); color: var(--text-2); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.qz-action:hover { background: var(--surface-3); color: var(--text); }
.qz-action--danger:hover { background: var(--danger-soft); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 30%, transparent); }

/* ── Pills ── */
.qz-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; letter-spacing: 0.02em; }
.qz-pill--ok    { background: var(--success-soft); color: var(--success); }
.qz-pill--fail  { background: var(--danger-soft); color: var(--danger); }
.qz-pill--live  { background: var(--warning-soft); color: var(--warning); }
.qz-pill--draft { background: var(--surface-2); color: var(--text-3); }

/* ═══ Quiz attempt view ═══ */
.qa-state { text-align: center; padding: var(--s-9); color: var(--text-3); }
.qa-header { display: flex; align-items: center; gap: var(--s-3); padding: var(--s-3) 0; flex-wrap: wrap; border-bottom: 1px solid var(--border); margin-bottom: 0; position: sticky; top: var(--topbar-h); background: var(--bg); z-index: 50; }
.qa-h-title { flex: 1; min-width: 0; }
.qa-h-name { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); line-height: 1.1; }
.qa-h-sub { font-size: var(--text-xs); color: var(--text-3); margin-top: 2px; font-weight: 500; }
.qa-h-right { display: flex; align-items: center; gap: var(--s-2); }
.qa-warn { display: flex; align-items: center; gap: 5px; font-size: var(--text-xs); color: var(--danger); background: var(--danger-soft); padding: 5px 10px; border-radius: 99px; font-weight: 600; }
.qa-timer { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--surface-2); border-radius: var(--r-md); font-family: var(--font-mono); font-weight: 600; font-size: var(--text-md); color: var(--text); font-variant-numeric: tabular-nums; }
.qa-timer--red { background: var(--danger-soft); color: var(--danger); animation: qzPulse 1.5s ease-in-out infinite; }
@keyframes qzPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }

.qa-bar { height: 3px; background: var(--surface-2); border-radius: 99px; margin: var(--s-3) 0; overflow: hidden; }
.qa-bar-fill { height: 100%; background: linear-gradient(90deg, #F59E0B, #EF4444); transition: width 400ms var(--ease); }

.qa-questions { display: flex; flex-direction: column; gap: var(--s-3); padding-bottom: 100px; }
.qa-q { background: var(--surface); border-radius: var(--r-lg); padding: var(--s-5); box-shadow: var(--shadow-sm), var(--ring); }
.qa-q-num { display: inline-block; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 700; color: var(--accent); margin-bottom: 8px; letter-spacing: 0.04em; }
.qa-q-text { font-size: var(--text-md); font-weight: 600; color: var(--text); margin: 0 0 var(--s-3); line-height: 1.5; letter-spacing: -0.005em; }
.qa-options { display: flex; flex-direction: column; gap: 8px; }
.qa-opt { display: flex; align-items: center; gap: var(--s-3); padding: 11px 14px; background: var(--surface-2); border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); color: var(--text); text-align: left; cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.qa-opt:hover { background: var(--surface-3); }
.qa-opt--sel { background: var(--accent-soft); border-color: var(--accent); color: var(--text); font-weight: 600; }
.qa-opt-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border-strong); background: var(--surface); display: grid; place-items: center; flex-shrink: 0; }
.qa-opt--sel .qa-opt-radio { border-color: var(--accent); }
.qa-opt-radio-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }

.qa-foot { position: fixed; bottom: 0; left: var(--sidebar-w); right: 0; padding: var(--s-4) var(--s-7); background: color-mix(in srgb, var(--surface) 90%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; z-index: 100; }
@media (max-width: 1024px) { .qa-foot { left: 0; padding: var(--s-3) var(--s-4); } }

.qa-result { background: var(--surface); border-radius: var(--r-lg); padding: var(--s-9) var(--s-5); text-align: center; box-shadow: var(--shadow-sm), var(--ring); margin: var(--s-7) auto; max-width: 480px; }
.qa-result-icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto var(--s-3); color: #fff; }
.qa-result-icon--ok { background: linear-gradient(135deg, #10B981, #059669); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.30); }
.qa-result-icon--fail { background: linear-gradient(135deg, #EF4444, #DC2626); box-shadow: 0 8px 24px rgba(239, 68, 68, 0.30); }
.qa-result-title { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0 0 var(--s-2); line-height: 1.1; }
.qa-result-score { font-family: var(--font-display); font-size: var(--text-display); font-weight: 400; color: var(--accent); letter-spacing: -0.03em; line-height: 1; margin: var(--s-3) 0; font-variant-numeric: tabular-nums; }
.qa-result-meta { font-size: var(--text-md); color: var(--text-2); font-weight: 600; }
.qa-result-msg { font-size: var(--text-sm); color: var(--text-3); margin: var(--s-2) 0 var(--s-5); }

/* ═══ Modal ═══ */
.qz-overlay { position: fixed; inset: 0; background: var(--overlay); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: grid; place-items: center; padding: var(--s-4); z-index: 2000; animation: qzFadeIn 200ms var(--ease-out); }
.qz-modal { width: 100%; max-width: 480px; max-height: 90vh; background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-xl); display: flex; flex-direction: column; overflow: hidden; animation: qzModalIn 280ms var(--ease-bounce); }
.qz-modal--lg { max-width: 720px; }
.qz-modal--sm { max-width: 380px; }
@keyframes qzModalIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes qzFadeIn { from { opacity: 0; } to { opacity: 1; } }

.qz-modal-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); flex-shrink: 0; }
.qz-modal-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 400; letter-spacing: -0.025em; color: var(--text); margin: 0; line-height: 1.1; }
.qz-modal-close { background: transparent; border: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.qz-modal-close:hover { background: var(--surface-2); color: var(--text); }
.qz-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.qz-modal-msg { font-size: var(--text-sm); color: var(--text-2); margin: 0 0 16px; line-height: 1.5; padding: 0 20px; }
.qz-modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
.qz-modal-foot { padding: 12px 20px; border-top: 1px solid var(--border); background: var(--surface-2); display: flex; justify-content: flex-end; gap: var(--s-2); flex-shrink: 0; }

.qz-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.qz-label { font-size: var(--text-xs); font-weight: 600; color: var(--text-2); letter-spacing: -0.005em; }
.qz-req { color: var(--danger); margin-left: 3px; }

.qz-input { width: 100%; padding: 9px 12px; background: var(--surface-2); border: 1px solid transparent; border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); color: var(--text); outline: none; transition: all var(--duration-fast) var(--ease); resize: vertical; }
.qz-input:hover { background: var(--surface-3); }
.qz-input:focus { background: var(--surface); border-color: var(--accent); box-shadow: var(--ring-focus); }

/* ═══ Questions manager ═══ */
.qmgr-q { background: var(--surface-2); border-radius: var(--r-md); padding: 12px 14px; margin-bottom: 8px; border: 1px solid var(--border); }
.qmgr-q--new { background: var(--accent-soft); border-color: var(--accent); }
.qmgr-q-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-3); }
.qmgr-q-text { flex: 1; font-size: var(--text-base); color: var(--text); font-weight: 500; line-height: 1.5; }
.qmgr-q-num { display: inline-block; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 700; color: var(--accent); margin-right: 6px; }
.qmgr-q-pts { font-size: var(--text-xs); color: var(--text-3); margin-left: 6px; font-weight: 500; }
.qmgr-q-actions { display: flex; gap: 4px; flex-shrink: 0; }
.qz-icon-btn { background: transparent; border: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-3); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.qz-icon-btn:hover { background: var(--surface-3); color: var(--text); }
.qz-icon-btn--danger { color: var(--danger); }
.qz-icon-btn--danger:hover { background: var(--danger-soft); }
.qmgr-opts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
.qmgr-opt { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--surface); border-radius: 99px; font-size: var(--text-xs); color: var(--text-2); border: 1px solid var(--border); }
.qmgr-opt--ok { background: var(--success-soft); color: var(--success); border-color: color-mix(in srgb, var(--success) 30%, transparent); font-weight: 600; }
.qmgr-opt-row { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.qmgr-opt-row input[type=radio] { accent-color: var(--accent); flex-shrink: 0; }
.qmgr-add { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--r-md); font-family: inherit; font-size: var(--text-base); font-weight: 600; color: var(--text-2); cursor: pointer; transition: all var(--duration-fast) var(--ease); }
.qmgr-add:hover { background: var(--surface-3); color: var(--text); border-color: var(--accent); }

/* ═══ Invite modal ═══ */
.inv-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
.inv-input-row .qz-input { flex: 1; }
.inv-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.inv-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: var(--info-soft); color: var(--info); border-radius: 99px; font-size: var(--text-xs); font-weight: 600; }
.inv-chip button { background: none; border: none; padding: 0; display: grid; place-items: center; cursor: pointer; color: currentColor; opacity: 0.7; }
.inv-chip button:hover { opacity: 1; }

.inv-table-wrap { overflow-x: auto; }
.inv-table { width: 100%; border-collapse: collapse; font-size: var(--text-base); }
.inv-table th { text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-3); padding: 8px 10px; border-bottom: 1px solid var(--border); }
.inv-table td { padding: 9px 10px; border-bottom: 1px solid var(--border); color: var(--text-2); }
.inv-st { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; letter-spacing: 0.02em; }
.inv-st--ok   { background: var(--success-soft); color: var(--success); }
.inv-st--fail { background: var(--danger-soft); color: var(--danger); }
.inv-st--pend { background: var(--surface-2); color: var(--text-3); }

/* ═══ Score column + per-row stats ═══ */
.inv-score { display: inline-flex; flex-direction: column; gap: 1px; align-items: flex-start; line-height: 1.1; }
.inv-score-num { font-size: 13px; font-weight: 700; color: var(--text-1); font-variant-numeric: tabular-nums; }
.inv-score-frac { font-size: 10px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.inv-muted { color: var(--text-3); font-size: 12px; }

.qz-btn--sm { padding: 4px 10px !important; font-size: 11px !important; min-height: 0 !important; }

/* ═══ Stats strip above invited list ═══ */
.inv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.inv-stat { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.inv-stat--ok   { border-left: 3px solid var(--success); }
.inv-stat--fail { border-left: 3px solid var(--danger);  }
.inv-stat-num { font-size: 18px; font-weight: 700; color: var(--text-1); font-variant-numeric: tabular-nums; line-height: 1.2; }
.inv-stat-lbl { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

/* ═══ Submission detail modal ═══ */
.qz-state--error { color: var(--danger); }

.sub-summary { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: var(--r-md); margin-bottom: 16px; }
.sub-summary--pass { background: var(--success-soft); border: 1px solid var(--success); }
.sub-summary--fail { background: var(--danger-soft);  border: 1px solid var(--danger);  }
.sub-summary-icon { width: 44px; height: 44px; border-radius: 50%; background: var(--surface-1); display: grid; place-items: center; flex-shrink: 0; }
.sub-summary--pass .sub-summary-icon { color: var(--success); }
.sub-summary--fail .sub-summary-icon { color: var(--danger); }
.sub-summary-main { flex: 1; }
.sub-summary-result { font-size: 16px; font-weight: 700; color: var(--text-1); }
.sub-summary-meta { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.sub-summary-score { text-align: right; }
.sub-summary-pct { font-size: 28px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; color: var(--text-1); letter-spacing: -0.02em; }
.sub-summary-frac { font-size: 11px; color: var(--text-3); margin-top: 4px; font-variant-numeric: tabular-nums; }

/* Stats strip in submission */
.sub-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }
.sub-stat { background: var(--surface-2); border-radius: var(--r-sm); padding: 10px; display: flex; flex-direction: column; gap: 2px; }
.sub-stat-lbl { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.sub-stat-val { font-size: 13px; font-weight: 600; color: var(--text-1); font-variant-numeric: tabular-nums; }
.sub-stat-val--mono { font-family: var(--font-mono); font-size: 11px; }

.sub-section-title { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; margin: 8px 0 12px; }

/* Per-question breakdown cards */
.sub-questions { display: flex; flex-direction: column; gap: 10px; }
.sub-q { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-md); padding: 14px 16px; }
.sub-q--correct { border-left: 3px solid var(--success); }
.sub-q--wrong   { border-left: 3px solid var(--danger);  }
.sub-q--skipped { border-left: 3px solid var(--text-3); opacity: 0.85; }

.sub-q-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.sub-q-num { background: var(--surface-2); color: var(--text-2); padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.sub-q-text { flex: 1; font-size: 14px; line-height: 1.4; color: var(--text-1); font-weight: 500; }
.sub-q-result { flex-shrink: 0; }
.sub-q-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 99px; letter-spacing: 0.02em; }
.sub-q-badge--ok   { background: var(--success-soft); color: var(--success); }
.sub-q-badge--fail { background: var(--danger-soft);  color: var(--danger);  }
.sub-q-badge--skip { background: var(--surface-2);    color: var(--text-3);  }

.sub-q-options { display: flex; flex-direction: column; gap: 6px; padding-left: 36px; }
.sub-q-opt { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; font-size: 13px; color: var(--text-2); }
.sub-q-opt--correct-unselected { background: var(--success-soft); border-color: var(--success); color: var(--success); }
.sub-q-opt--selected-correct   { background: var(--success-soft); border-color: var(--success); color: var(--success); font-weight: 600; }
.sub-q-opt--selected-wrong     { background: var(--danger-soft);  border-color: var(--danger);  color: var(--danger);  font-weight: 600; }
.sub-q-opt-marker { font-size: 14px; flex-shrink: 0; }
.sub-q-opt-text { flex: 1; }
.sub-q-opt-tag { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }
.sub-q-opt-tag--correct { background: var(--success); color: white; }
.sub-q-opt-tag--wrong   { background: var(--danger);  color: white; }

/* Mobile */
@media (max-width: 640px) {
  .inv-stats { grid-template-columns: repeat(2, 1fr); }
  .sub-stats { grid-template-columns: repeat(2, 1fr); }
  .sub-summary { flex-direction: column; text-align: center; gap: 10px; }
  .sub-summary-score { text-align: center; }
  .sub-q-options { padding-left: 0; }
  .sub-q-head { flex-wrap: wrap; }
  .inv-table-wrap { font-size: 12px; }
}

/* ═══ Charts ═══ */
.chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s-3); }
.chart-card { background: var(--surface-2); border-radius: var(--r-md); padding: var(--s-4); text-align: center; border: 1px solid var(--border); transition: transform var(--duration) var(--ease); position: relative; overflow: hidden; }
.chart-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--c1), var(--c2)); }
.chart-card:hover { transform: translateY(-2px); }
.chart-num { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400; letter-spacing: -0.025em; line-height: 1; background: linear-gradient(135deg, var(--c1), var(--c2)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-variant-numeric: tabular-nums; }
.chart-lbl { font-size: var(--text-xs); color: var(--text-3); margin-top: 6px; font-weight: 500; }

/* ═══ Animations ═══ */
@keyframes qzFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ═══ Responsive ═══ */
@media (max-width: 1100px) { .qz-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) {
  .qz-grid { grid-template-columns: 1fr; }
  .qz-title { font-size: var(--text-3xl); }
  .qz-modal-row { grid-template-columns: 1fr; }
}
`;