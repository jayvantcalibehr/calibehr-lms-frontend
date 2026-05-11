/**
 * AdminCourses.jsx — Admin/Trainer course management
 *   View 1: Course List (search, filter, add, edit, publish, disable)
 *   View 2: Course Builder (chapters + topics CRUD)
 *
 * All API endpoints preserved from original.
 */
import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  RiAddLine, RiEdit2Line, RiSearchLine, RiCloseLine, RiCheckLine,
  RiArrowDownSLine, RiArrowRightSLine, RiEyeLine, RiEyeOffLine,
  RiPlayFill, RiFileTextLine, RiLinkM, RiDeleteBin6Line, RiArrowLeftLine,
  RiGlobalLine, RiLockLine, RiFlashlightLine, RiBookOpenLine, RiAlertLine,
  RiInboxLine, RiQuestionLine,
} from 'react-icons/ri';
import { HiOutlineAcademicCap } from 'react-icons/hi2';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import { can } from '../../utils/permissions';

/* ── Constants ── */
const STATUS_LABELS = { 0: 'Disabled', 1: 'Draft', 2: 'Live' };
const STATUS_PILL = { 0: 'ac-pill--off', 1: 'ac-pill--draft', 2: 'ac-pill--live' };
const TOPIC_TYPE = { 1: 'Video', 2: 'PDF', 3: 'Resource', 4: 'Test' };
const TOPIC_ICON = (t) => {
  if (t === 1) return { icon: <RiPlayFill size={13}/>,             c1: '#6366F1', c2: '#8B5CF6' };
  if (t === 2) return { icon: <RiFileTextLine size={13}/>,         c1: '#EF4444', c2: '#DC2626' };
  if (t === 3) return { icon: <RiLinkM size={13}/>,                c1: '#10B981', c2: '#059669' };
  if (t === 4) return { icon: <HiOutlineAcademicCap size={13}/>,   c1: '#F59E0B', c2: '#EF4444' };
  return       { icon: <RiBookOpenLine size={13}/>,                 c1: '#94A3B8', c2: '#64748B' };
};
const COURSE_TYPES = [
  { id: 1, name: 'E-Learning' }, { id: 2, name: 'Classroom' }, { id: 3, name: 'Blended' },
];

/* ── Primitives ── */
function Modal({ children, onClose, large, small, medium }) {
  return (
    <div className="ac-overlay" onClick={onClose}>
      <div className={`ac-modal ${large ? 'ac-modal--lg' : ''} ${medium ? 'ac-modal--md' : ''} ${small ? 'ac-modal--sm' : ''}`}
           onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="ac-field">
      <label className="ac-label">{label}{required && <span className="ac-req">*</span>}</label>
      {children}
      {error && <div className="ac-err"><RiAlertLine size={12}/>{error}</div>}
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
  return { toast, show: (text, type = 'ok') => setToast({ text, type }) };
}

/* ═══ MAIN ORCHESTRATOR ═══ */
export default function AdminCourses() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace/>;
  if (!can('courses.manage')) return <Navigate to="/dashboard" replace/>;

  const [view, setView] = useState('list');
  const [builderCourse, setBuilderCourse] = useState(null);
  const openBuilder  = (c) => { setBuilderCourse(c); setView('builder'); };
  const closeBuilder = () => { setBuilderCourse(null); setView('list'); };

  return (
    <AppShell>
      <style>{CSS}</style>
      {view === 'list'
        ? <CourseList onOpenBuilder={openBuilder}/>
        : <CourseBuilder course={builderCourse} onBack={closeBuilder}/>}
    </AppShell>
  );
}

/* ═══ COURSE LIST ═══ */
function CourseList({ onOpenBuilder }) {
  const [courses,    setCourses]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterStat, setFilterStat] = useState('all');
  const [filterCat,  setFilterCat]  = useState('all');
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const { toast, show } = useToast();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, catRes] = await Promise.all([
        API.get('/Webservice/getCourseList'),
        API.get('/Webservice/getCategories', { params: { all: 1 } }),
      ]);
      if (cRes.data.code === 1) setCourses(cRes.data.data || []);
      if (catRes.data.code === 1) setCategories(catRes.data.data || []);
    } catch { show('Could not load courses', 'err'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    let list = [...courses];
    const s = search.trim().toLowerCase();
    if (s) list = list.filter(c => (c.name || '').toLowerCase().includes(s));
    if (filterStat !== 'all') list = list.filter(c => String(c.status) === filterStat);
    if (filterCat  !== 'all') list = list.filter(c => String(c.category_id) === filterCat);
    setFiltered(list);
  }, [courses, search, filterStat, filterCat]);

  const openAdd  = () => { setEditing(null); setShowForm(true); };
  const openEdit = (c) => { setEditing(c);   setShowForm(true); };

  const askToggleVisibility = (c) => setConfirmDlg({
    type: 'visibility', course: c,
    title: 'Change visibility?',
    msg: `Set "${c.name}" to ${c.visibility === 0 ? 'Private' : 'Public'}?`,
  });
  const askPublish = (c) => setConfirmDlg({
    type: 'publish', course: c, title: 'Publish course?',
    msg: `"${c.name}" will become visible to learners.`,
  });
  const askDisable = (c) => setConfirmDlg({
    type: 'disable', course: c, title: 'Disable course?',
    msg: `"${c.name}" will be hidden from all learners.`, danger: true,
  });

  const confirmAction = async () => {
    if (!confirmDlg) return;
    const { type, course } = confirmDlg;
    setConfirmDlg(null);
    try {
      if (type === 'visibility') {
        const newVis = course.visibility === 0 ? 1 : 0;
        await API.post('/Webservice/visibilityStatus', { courseID: course.id, visibility: newVis });
        show(`Course set to ${newVis === 0 ? 'Public' : 'Private'}`);
      } else if (type === 'publish') {
        await API.post('/Webservice/makeCourseLive', { courseID: course.id });
        show('Course published!');
      } else if (type === 'disable') {
        await API.post('/Webservice/disableCourse', { courseID: course.id });
        show('Course disabled');
      }
      loadAll();
    } catch { show('Action failed', 'err'); }
  };

  const counts = {
    total: courses.length,
    live: courses.filter(c => c.status === 2).length,
    draft: courses.filter(c => c.status === 1).length,
    disabled: courses.filter(c => c.status === 0).length,
  };

  return (
    <>
      <header className="ac-hero">
        <div>
          <div className="ac-eyebrow">Admin · Catalog</div>
          <h1 className="ac-title">Courses.</h1>
          <p className="ac-sub">
            {loading ? 'Loading…'
              : `${counts.total} ${counts.total === 1 ? 'course' : 'courses'} · ${counts.live} live · ${counts.draft} draft · ${counts.disabled} disabled.`}
          </p>
        </div>
        <button className="ac-btn ac-btn--primary" onClick={openAdd}>
          <RiAddLine size={14}/>New course
        </button>
      </header>

      {toast && (
        <div className={`ac-toast ac-toast--${toast.type}`}>
          {toast.type === 'ok' ? <RiCheckLine size={14}/> : <RiAlertLine size={14}/>}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="ac-stats">
        {[
          { lbl: 'Total',    val: counts.total,    c1: '#6366F1', c2: '#8B5CF6' },
          { lbl: 'Live',     val: counts.live,     c1: '#10B981', c2: '#059669' },
          { lbl: 'Draft',    val: counts.draft,    c1: '#F59E0B', c2: '#EF4444' },
          { lbl: 'Disabled', val: counts.disabled, c1: '#EF4444', c2: '#DC2626' },
        ].map(s => (
          <div key={s.lbl} className="ac-stat" style={{ '--c1': s.c1, '--c2': s.c2 }}>
            <div className="ac-stat-num">{s.val}</div>
            <div className="ac-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="ac-toolbar">
        <div className="ac-search">
          <RiSearchLine size={14}/>
          <input placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <button className="ac-search-clear" onClick={() => setSearch('')}><RiCloseLine size={13}/></button>}
        </div>
        <select className="ac-select" value={filterStat} onChange={e => setFilterStat(e.target.value)}>
          <option value="all">All status</option>
          <option value="1">Draft</option>
          <option value="2">Live</option>
          <option value="0">Disabled</option>
        </select>
        <select className="ac-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="ac-state">Loading courses…</div>
      ) : filtered.length === 0 ? (
        <div className="ac-empty">
          <div className="ac-empty-icon"><RiInboxLine size={26}/></div>
          <div className="ac-empty-title">
            {search || filterStat !== 'all' || filterCat !== 'all' ? 'No matches' : 'No courses yet'}
          </div>
          <div className="ac-empty-sub">
            {search || filterStat !== 'all' || filterCat !== 'all'
              ? 'Try clearing filters.' : 'Create your first course to get started.'}
          </div>
          {!search && filterStat === 'all' && filterCat === 'all' && (
            <button className="ac-btn ac-btn--primary" onClick={openAdd} style={{ marginTop: 16 }}>
              <RiAddLine size={14}/>Create course
            </button>
          )}
        </div>
      ) : (
        <article className="ac-card">
          <table className="ac-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}/>
                <th>Course</th>
                <th style={{ width: 130 }}>Category</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 110 }}>Visibility</th>
                <th style={{ width: 240, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}>
                  <td>
                    {c.image_url
                      ? <img src={c.image_url} alt={c.name} className="ac-thumb"
                             onError={e => { e.target.style.display = 'none'; }}/>
                      : <div className="ac-thumb ac-thumb--empty"><RiBookOpenLine size={16}/></div>}
                  </td>
                  <td>
                    <div className="ac-course-name">{c.name}</div>
                    <div className="ac-course-meta">{c.type_name || 'E-Learning'} · {c.points || 0} pts</div>
                  </td>
                  <td className="ac-cat-cell">{c.category_name || '—'}</td>
                  <td>
                    <span className={`ac-pill ${STATUS_PILL[c.status]}`}>
                      <span className="ac-pill-dot"/>{STATUS_LABELS[c.status] ?? '—'}
                    </span>
                  </td>
                  <td>
                    <button className="ac-vis" onClick={() => askToggleVisibility(c)}>
                      {c.visibility === 0
                        ? <><RiGlobalLine size={11}/>Public</>
                        : <><RiLockLine size={11}/>Private</>}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="ac-action" onClick={() => openEdit(c)}>
                      <RiEdit2Line size={11}/>Edit
                    </button>
                    <button className="ac-action ac-action--build" onClick={() => onOpenBuilder(c)}>
                      <RiFlashlightLine size={11}/>Builder
                    </button>
                    {c.status === 1 && (
                      <button className="ac-action ac-action--publish" onClick={() => askPublish(c)}>
                        <RiFlashlightLine size={11}/>Publish
                      </button>
                    )}
                    {c.status === 2 && (
                      <button className="ac-action ac-action--danger" onClick={() => askDisable(c)}>
                        <RiEyeOffLine size={11}/>Disable
                      </button>
                    )}
                    {c.status === 0 && (
                      <button className="ac-action ac-action--success" onClick={() => askPublish(c)}>
                        <RiEyeLine size={11}/>Re-publish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      {showForm && (
        <CourseFormModal editing={editing} categories={categories}
                         onClose={() => setShowForm(false)}
                         onSaved={(msg) => { show(msg); loadAll(); setShowForm(false); }}
                         onToast={show}/>
      )}

      {confirmDlg && (
        <Modal small onClose={() => setConfirmDlg(null)}>
          <div className="ac-modal-body" style={{ paddingTop: 24 }}>
            <h3 className="ac-modal-title">{confirmDlg.title}</h3>
            <p className="ac-modal-msg">{confirmDlg.msg}</p>
          </div>
          <div className="ac-modal-foot">
            <button className="ac-btn ac-btn--ghost" onClick={() => setConfirmDlg(null)}>Cancel</button>
            <button className={`ac-btn ${confirmDlg.danger ? 'ac-btn--danger' : 'ac-btn--primary'}`} onClick={confirmAction}>
              <RiCheckLine size={13}/>Confirm
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ═══ COURSE FORM MODAL ═══ */
function CourseFormModal({ editing, categories, onClose, onSaved, onToast }) {
  const isEdit = !!editing;
  const blank = { name: '', description: '', what_will_you_learn: '', pre_requisites: '',
    trainer_details: '', image_url: '', category_id: '', type: 1, points: 1, visibility: 0 };
  const [form, setForm] = useState(isEdit ? {
    name: editing.name || '', description: editing.description || '',
    what_will_you_learn: editing.what_will_you_learn || editing.whatWillYouLearn || '',
    pre_requisites: editing.pre_requisites || editing.preRequisites || '',
    trainer_details: editing.trainer_details || editing.trainerDetails || '',
    image_url: editing.image_url || editing.imageURL || '',
    category_id: editing.category_id || editing.categoryID || '',
    type: editing.type || 1, points: editing.points || 1, visibility: editing.visibility ?? 0,
  } : blank);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Course name is required.';
    if (!form.category_id) e.category_id = 'Please select a category.';
    if (!form.points || form.points < 0) e.points = 'Points must be ≥ 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = isEdit
        ? await API.post('/Webservice/updateCourseDetail', { ...form, courseID: editing.id })
        : await API.post('/Webservice/addCourse', form);
      if (res.data.code === 1) onSaved(isEdit ? 'Course updated' : 'Course created');
      else onToast?.(res.data.message || 'Save failed', 'err');
    } catch { onToast?.('Save failed — try again', 'err'); }
    setSaving(false);
  };

  return (
    <Modal large onClose={() => !saving && onClose()}>
      <div className="ac-modal-head">
        <h2 className="ac-modal-title">{isEdit ? `Edit · ${editing.name}` : 'New course'}</h2>
        <button className="ac-modal-close" onClick={onClose} disabled={saving}><RiCloseLine size={16}/></button>
      </div>
      <div className="ac-modal-body ac-form-grid">
        <div className="ac-grid-full">
          <Field label="Course name" required error={errors.name}>
            <input className={`ac-input ${errors.name ? 'ac-input--err' : ''}`} autoFocus
                   value={form.name} onChange={e => set('name', e.target.value)}
                   placeholder="e.g. Advanced Excel for HR"/>
          </Field>
        </div>
        <Field label="Category" required error={errors.category_id}>
          <select className={`ac-input ${errors.category_id ? 'ac-input--err' : ''}`}
                  value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">— Select category —</option>
            {categories.filter(c => c.status === 1).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Course type">
          <select className="ac-input" value={form.type} onChange={e => set('type', Number(e.target.value))}>
            {COURSE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Completion points" error={errors.points}>
          <input className={`ac-input ${errors.points ? 'ac-input--err' : ''}`} type="number" min="0"
                 value={form.points} onChange={e => set('points', Number(e.target.value))} placeholder="1"/>
        </Field>
        <Field label="Visibility">
          <select className="ac-input" value={form.visibility} onChange={e => set('visibility', Number(e.target.value))}>
            <option value={0}>Public (catalog)</option>
            <option value={1}>Private (assigned only)</option>
          </select>
        </Field>
        <div className="ac-grid-full">
          <Field label="Description">
            <textarea className="ac-input" rows={3} value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Brief overview of the course…"/>
          </Field>
        </div>
        <div className="ac-grid-full">
          <Field label="What will you learn">
            <textarea className="ac-input" rows={3} value={form.what_will_you_learn}
                      onChange={e => set('what_will_you_learn', e.target.value)}
                      placeholder="Learning outcomes, skills gained…"/>
          </Field>
        </div>
        <div className="ac-grid-full">
          <Field label="Prerequisites">
            <textarea className="ac-input" rows={2} value={form.pre_requisites}
                      onChange={e => set('pre_requisites', e.target.value)}
                      placeholder="Prior knowledge needed…"/>
          </Field>
        </div>
        <div className="ac-grid-full">
          <Field label="Trainer / instructor details">
            <textarea className="ac-input" rows={2} value={form.trainer_details}
                      onChange={e => set('trainer_details', e.target.value)}
                      placeholder="Trainer name, bio, LinkedIn…"/>
          </Field>
        </div>
        <div className="ac-grid-full">
          <Field label="Cover image URL">
            <input className="ac-input" value={form.image_url}
                   onChange={e => set('image_url', e.target.value)}
                   placeholder="https://your-bucket.s3.amazonaws.com/course.jpg"/>
            {form.image_url && (
              <div className="ac-img-preview">
                <img src={form.image_url} alt="preview" onError={e => { e.target.style.opacity = 0.2; }}/>
                <span>Preview</span>
              </div>
            )}
          </Field>
        </div>
      </div>
      <div className="ac-modal-foot">
        <button className="ac-btn ac-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="ac-btn ac-btn--primary" onClick={save}
                disabled={saving || !form.name.trim() || !form.category_id}>
          <RiCheckLine size={14}/>{saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </Modal>
  );
}

/* ═══ COURSE BUILDER (chapters + topics) ═══ */
function CourseBuilder({ course, onBack }) {
  const [chapters,   setChapters]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState({});
  const [chModal,    setChModal]    = useState(false);
  const [chEditing,  setChEditing]  = useState(null);
  const [tpModal,    setTpModal]    = useState(false);
  const [tpChapter,  setTpChapter]  = useState(null);
  const [tpEditing,  setTpEditing]  = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [qsModal,    setQsModal]    = useState(null); // topic for Questions modal
  const [rlModal,    setRlModal]    = useState(null); // topic for Resource Links modal
  const { toast, show } = useToast();

  const loadChapters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservice/getCourseChapterDetails', { params: { courseID: course.id } });
      if (res.data.code === 1) {
        const chs = res.data.data || [];
        setChapters(chs);
        if (chs.length > 0) setExpanded(prev => ({ ...prev, [chs[0].id]: true }));
      }
    } catch { show('Could not load chapters', 'err'); }
    setLoading(false);
  }, [course.id]);

  useEffect(() => { loadChapters(); }, [loadChapters]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const askToggleChapter = (ch) => setConfirmDlg({
    type: 'chapter-toggle', target: ch,
    title: ch.status === 1 ? 'Disable chapter?' : 'Enable chapter?',
    msg: `"${ch.name}" will be ${ch.status === 1 ? 'hidden from learners' : 'visible to learners'}.`,
    danger: ch.status === 1,
  });
  const askRemoveTopic = (topic, chapter) => setConfirmDlg({
    type: 'topic-remove', target: topic, chapter,
    title: 'Remove topic?', msg: `"${topic.name}" will be permanently removed.`, danger: true,
  });

  const confirmAction = async () => {
    if (!confirmDlg) return;
    const { type, target, chapter } = confirmDlg;
    setConfirmDlg(null);
    try {
      if (type === 'chapter-toggle') {
        const endpoint = target.status === 1 ? 'disableChapter' : 'enableChapter';
        await API.post(`/Webservice/${endpoint}`, { chapterID: target.id, courseID: course.id });
        show(`Chapter ${target.status === 1 ? 'disabled' : 'enabled'}`);
      } else if (type === 'topic-remove') {
        await API.post('/Webservice/removeTopic', {
          topicID: target.id, chapterID: chapter.id, courseID: course.id,
        });
        show('Topic removed');
      }
      loadChapters();
    } catch { show('Action failed', 'err'); }
  };

  return (
    <>
      <header className="ac-builder-head">
        <button className="ac-btn ac-btn--ghost" onClick={onBack}>
          <RiArrowLeftLine size={13}/>Back
        </button>
        <div className="ac-builder-title">
          <div className="ac-builder-name">
            <h1 className="ac-title ac-title--sm">{course.name}</h1>
            <span className={`ac-pill ${STATUS_PILL[course.status]}`}>
              <span className="ac-pill-dot"/>{STATUS_LABELS[course.status]}
            </span>
          </div>
          <div className="ac-builder-meta">
            {course.category_name} · {course.type_name || 'E-Learning'} · {course.points} pts
          </div>
        </div>
        <button className="ac-btn ac-btn--primary" onClick={() => { setChEditing(null); setChModal(true); }}>
          <RiAddLine size={13}/>Add chapter
        </button>
      </header>

      {toast && (
        <div className={`ac-toast ac-toast--${toast.type}`}>
          {toast.type === 'ok' ? <RiCheckLine size={14}/> : <RiAlertLine size={14}/>}
          <span>{toast.text}</span>
        </div>
      )}

      {loading ? (
        <div className="ac-state">Loading chapters…</div>
      ) : chapters.length === 0 ? (
        <div className="ac-empty">
          <div className="ac-empty-icon"><RiBookOpenLine size={26}/></div>
          <div className="ac-empty-title">No chapters yet</div>
          <div className="ac-empty-sub">Build your course structure by adding chapters.</div>
          <button className="ac-btn ac-btn--primary"
                  onClick={() => { setChEditing(null); setChModal(true); }}
                  style={{ marginTop: 16 }}>
            <RiAddLine size={13}/>Add first chapter
          </button>
        </div>
      ) : (
        <div className="ac-chapters">
          {chapters.map((ch, idx) => {
            const isExpanded = !!expanded[ch.id];
            const isDisabled = ch.status !== 1;
            const visibleTopics = (ch.topics || []).filter(t => t.status === 1);
            return (
              <article key={ch.id} className={`ac-chapter ${isDisabled ? 'ac-chapter--off' : ''}`}>
                <header className="ac-ch-head">
                  <button className="ac-ch-toggle" onClick={() => toggleExpand(ch.id)}>
                    {isExpanded ? <RiArrowDownSLine size={16}/> : <RiArrowRightSLine size={16}/>}
                  </button>
                  <div className="ac-ch-num">Ch {idx + 1}</div>
                  <div className="ac-ch-info">
                    <div className="ac-ch-name">
                      {ch.name}
                      {isDisabled && <span className="ac-ch-disabled-tag">Disabled</span>}
                    </div>
                    {ch.description && <div className="ac-ch-desc">{ch.description}</div>}
                  </div>
                  <div className="ac-ch-count">
                    {visibleTopics.length} {visibleTopics.length === 1 ? 'topic' : 'topics'}
                  </div>
                  <div className="ac-ch-actions">
                    <button className="ac-action" onClick={() => { setChEditing(ch); setChModal(true); }}>
                      <RiEdit2Line size={11}/>Edit
                    </button>
                    <button className={`ac-action ${ch.status === 1 ? 'ac-action--danger' : 'ac-action--success'}`}
                            onClick={() => askToggleChapter(ch)}>
                      {ch.status === 1 ? <><RiEyeOffLine size={11}/>Disable</> : <><RiEyeLine size={11}/>Enable</>}
                    </button>
                    <button className="ac-action ac-action--add"
                            onClick={() => { setTpChapter(ch); setTpEditing(null); setTpModal(true); }}>
                      <RiAddLine size={11}/>Topic
                    </button>
                  </div>
                </header>
                {isExpanded && (
                  <div className="ac-topics">
                    {visibleTopics.length === 0 ? (
                      <div className="ac-topics-empty">No topics yet — click "+ Topic" to add one.</div>
                    ) : visibleTopics.map(t => {
                      const ti = TOPIC_ICON(t.type);
                      return (
                        <div key={t.id} className="ac-topic">
                          <div className="ac-topic-icon" style={{ '--c1': ti.c1, '--c2': ti.c2 }}>
                            <span className="ac-topic-icon-bg"/>
                            {ti.icon}
                          </div>
                          <div className="ac-topic-info">
                            <div className="ac-topic-name">{t.name}</div>
                            <div className="ac-topic-meta">
                              {TOPIC_TYPE[t.type] || 'Topic'}
                              {t.duration > 0 && ` · ${t.duration} min`}
                              {t.passing_percentage > 0 && ` · Pass: ${t.passing_percentage}%`}
                            </div>
                          </div>
                          <div className="ac-topic-actions">
                            <button className="ac-action"
                                    onClick={() => { setTpChapter(ch); setTpEditing(t); setTpModal(true); }}>
                              <RiEdit2Line size={11}/>Edit
                            </button>
                            {t.type === 4 && (
                              <button className="ac-action ac-action--build"
                                      onClick={() => { setQsModal(t); }}>
                                <HiOutlineAcademicCap size={11}/>Questions
                              </button>
                            )}
                            {t.type === 3 && (
                              <button className="ac-action ac-action--add"
                                      onClick={() => { setRlModal(t); }}>
                                <RiLinkM size={11}/>Links
                              </button>
                            )}
                            <button className="ac-action ac-action--danger" onClick={() => askRemoveTopic(t, ch)}>
                              <RiDeleteBin6Line size={11}/>Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {chModal && (
        <ChapterModal courseId={course.id} editing={chEditing}
                      onClose={() => setChModal(false)}
                      onSaved={(msg) => { show(msg); loadChapters(); setChModal(false); }}
                      onToast={show}/>
      )}
      {tpModal && (
        <TopicModal courseId={course.id} chapter={tpChapter} editing={tpEditing}
                    onClose={() => setTpModal(false)}
                    onSaved={(msg) => { show(msg); loadChapters(); setTpModal(false); }}
                    onToast={show}/>
      )}
      {qsModal && (
        <TestQuestionsModal
          topic={qsModal} courseId={course.id}
          onClose={() => setQsModal(null)}
          onToast={show}/>
      )}
      {rlModal && (
        <ResourceLinksModal
          topic={rlModal} courseId={course.id}
          onClose={() => setRlModal(null)}
          onToast={show}/>
      )}
      {confirmDlg && (
        <Modal small onClose={() => setConfirmDlg(null)}>
          <div className="ac-modal-body" style={{ paddingTop: 24 }}>
            <h3 className="ac-modal-title">{confirmDlg.title}</h3>
            <p className="ac-modal-msg">{confirmDlg.msg}</p>
          </div>
          <div className="ac-modal-foot">
            <button className="ac-btn ac-btn--ghost" onClick={() => setConfirmDlg(null)}>Cancel</button>
            <button className={`ac-btn ${confirmDlg.danger ? 'ac-btn--danger' : 'ac-btn--primary'}`}
                    onClick={confirmAction}>
              <RiCheckLine size={13}/>Confirm
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ═══ CHAPTER MODAL ═══ */
function ChapterModal({ courseId, editing, onClose, onSaved, onToast }) {
  const isEdit = !!editing;
  const [name,    setName]    = useState(editing?.name        || '');
  const [desc,    setDesc]    = useState(editing?.description || '');
  const [saving,  setSaving]  = useState(false);
  const [nameErr, setNameErr] = useState('');

  const save = async () => {
    if (!name.trim()) { setNameErr('Chapter name is required.'); return; }
    setSaving(true);
    try {
      const res = isEdit
        ? await API.post('/Webservice/updateChapter', {
            chapterID: editing.id, courseID: courseId, name: name.trim(), description: desc.trim(),
          })
        : await API.post('/Webservice/addChapter', {
            courseID: courseId, name: name.trim(), description: desc.trim(),
          });
      if (res.data.code === 1) onSaved(isEdit ? 'Chapter updated' : 'Chapter added');
      else onToast?.(res.data.message || 'Save failed', 'err');
    } catch { onToast?.('Save failed — try again', 'err'); }
    setSaving(false);
  };

  return (
    <Modal medium onClose={() => !saving && onClose()}>
      <div className="ac-modal-head">
        <h2 className="ac-modal-title">{isEdit ? 'Edit chapter' : 'New chapter'}</h2>
        <button className="ac-modal-close" onClick={onClose} disabled={saving}><RiCloseLine size={16}/></button>
      </div>
      <div className="ac-modal-body">
        <Field label="Chapter name" required error={nameErr}>
          <input className={`ac-input ${nameErr ? 'ac-input--err' : ''}`} autoFocus
                 value={name} onChange={e => { setName(e.target.value); setNameErr(''); }}
                 placeholder="e.g. Introduction, Module 1, Advanced Topics"/>
        </Field>
        <Field label="Description">
          <textarea className="ac-input" rows={3} value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="What this chapter covers…"/>
        </Field>
      </div>
      <div className="ac-modal-foot">
        <button className="ac-btn ac-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="ac-btn ac-btn--primary" onClick={save} disabled={saving || !name.trim()}>
          <RiCheckLine size={14}/>{saving ? 'Saving…' : isEdit ? 'Update' : 'Add chapter'}
        </button>
      </div>
    </Modal>
  );
}

/* ═══ TOPIC MODAL ═══ */
function TopicModal({ courseId, chapter, editing, onClose, onSaved, onToast }) {
  const isEdit = !!editing;
  const [type,     setType]     = useState(editing?.type             || 1);
  const [name,     setName]     = useState(editing?.name             || '');
  const [desc,     setDesc]     = useState(editing?.description      || '');
  const [fileUrl,  setFileUrl]  = useState(editing?.file_url         || editing?.fileURL  || '');
  const [vidType,  setVidType]  = useState(editing?.video_type       || editing?.videoType || 1);
  const [dur,      setDur]      = useState(editing?.duration         || 0);
  const [passing,  setPassing]  = useState(editing?.passing_percentage || 75);
  const [attempts, setAttempts] = useState(editing?.number_of_attempt  || 0);
  const [saving,   setSaving]   = useState(false);
  const [nameErr,  setNameErr]  = useState('');

  const save = async () => {
    if (!name.trim()) { setNameErr('Topic name is required.'); return; }
    setSaving(true);
    try {
      const base = { courseID: courseId, chapterID: chapter.id, name: name.trim(), description: desc.trim() };
      let res;
      if (isEdit) {
        if (type === 1) res = await API.post('/Webservice/updateVideoTopic', { ...base, topicID: editing.id, file_url: fileUrl, video_type: vidType, duration: dur });
        else if (type === 2) res = await API.post('/Webservice/updatePDFTopic', { ...base, topicID: editing.id, file_url: fileUrl });
        else if (type === 3) res = await API.post('/Webservice/updateResourceTopic', { ...base, topicID: editing.id });
        else res = await API.post('/Webservice/testDetailUpdate', { ...base, topicID: editing.id, passing_percentage: passing, number_of_attempt: attempts });
      } else {
        if (type === 1) res = await API.post('/Webservice/newVideoTopic', { ...base, file_url: fileUrl, video_type: vidType, duration: dur });
        else if (type === 2) res = await API.post('/Webservice/newPDFTopic', { ...base, file_url: fileUrl });
        else if (type === 3) res = await API.post('/Webservice/newResourceTopic', { ...base });
        else res = await API.post('/Webservice/newTestTopic', { ...base, passing_percentage: passing, number_of_attempt: attempts });
      }
      if (res && res.data.code === 1) onSaved(isEdit ? 'Topic updated' : 'Topic added');
      else onToast?.(res?.data?.message || 'Save failed', 'err');
    } catch { onToast?.('Save failed — try again', 'err'); }
    setSaving(false);
  };

  return (
    <Modal medium onClose={() => !saving && onClose()}>
      <div className="ac-modal-head">
        <h2 className="ac-modal-title">{isEdit ? 'Edit topic' : `New topic · ${chapter.name}`}</h2>
        <button className="ac-modal-close" onClick={onClose} disabled={saving}><RiCloseLine size={16}/></button>
      </div>
      <div className="ac-modal-body">
        {!isEdit && (
          <>
            <label className="ac-label">Topic type</label>
            <div className="ac-type-grid">
              {[
                { id: 1, icon: <RiPlayFill size={16}/>,            label: 'Video',    c1: '#6366F1', c2: '#8B5CF6' },
                { id: 2, icon: <RiFileTextLine size={16}/>,        label: 'PDF',      c1: '#EF4444', c2: '#DC2626' },
                { id: 3, icon: <RiLinkM size={16}/>,               label: 'Resource', c1: '#10B981', c2: '#059669' },
                { id: 4, icon: <HiOutlineAcademicCap size={16}/>,  label: 'Test',     c1: '#F59E0B', c2: '#EF4444' },
              ].map(t => (
                <button key={t.id} type="button"
                        className={`ac-type-btn ${type === t.id ? 'ac-type-btn--active' : ''}`}
                        onClick={() => setType(t.id)}
                        style={{ '--c1': t.c1, '--c2': t.c2 }}>
                  <div className="ac-type-icon">{t.icon}</div>
                  <span className="ac-type-label">{t.label}</span>
                </button>
              ))}
            </div>
            <div style={{ height: 14 }}/>
          </>
        )}
        <Field label="Topic name" required error={nameErr}>
          <input className={`ac-input ${nameErr ? 'ac-input--err' : ''}`}
                 value={name} onChange={e => { setName(e.target.value); setNameErr(''); }}
                 placeholder="e.g. Introduction to the topic"/>
        </Field>
        <Field label="Description">
          <textarea className="ac-input" rows={2} value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Brief overview of what this topic covers…"/>
        </Field>
        {type === 1 && (
          <>
            <Field label="Video URL / S3 path">
              <input className="ac-input" value={fileUrl} onChange={e => setFileUrl(e.target.value)}
                     placeholder="https://your-bucket.s3.amazonaws.com/video.mp4"/>
            </Field>
            <div className="ac-modal-row">
              <Field label="Video type">
                <select className="ac-input" value={vidType} onChange={e => setVidType(Number(e.target.value))}>
                  <option value={1}>Upload (S3 / URL)</option>
                  <option value={2}>YouTube</option>
                  <option value={3}>Vimeo</option>
                </select>
              </Field>
              <Field label="Duration (minutes)">
                <input className="ac-input" type="number" min="0" value={dur}
                       onChange={e => setDur(Number(e.target.value))} placeholder="0"/>
              </Field>
            </div>
          </>
        )}
        {type === 2 && (
          <Field label="PDF URL / S3 path">
            <input className="ac-input" value={fileUrl} onChange={e => setFileUrl(e.target.value)}
                   placeholder="https://your-bucket.s3.amazonaws.com/document.pdf"/>
          </Field>
        )}
        {type === 4 && (
          <div className="ac-modal-row">
            <Field label="Passing percentage (%)">
              <input className="ac-input" type="number" min="0" max="100" value={passing}
                     onChange={e => setPassing(Number(e.target.value))}/>
            </Field>
            <Field label="Max attempts (0 = unlimited)">
              <input className="ac-input" type="number" min="0" value={attempts}
                     onChange={e => setAttempts(Number(e.target.value))}/>
            </Field>
          </div>
        )}
        {type === 3 && (
          <div className="ac-info-banner">
            <RiQuestionLine size={14}/>
            <span>After saving, use the "Links" button on this topic to add external resource links.</span>
          </div>
        )}
      </div>
      <div className="ac-modal-foot">
        <button className="ac-btn ac-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="ac-btn ac-btn--primary" onClick={save} disabled={saving || !name.trim()}>
          <RiCheckLine size={14}/>{saving ? 'Saving…' : isEdit ? 'Update' : 'Add topic'}
        </button>
      </div>
    </Modal>
  );
}

/* ═══ TEST QUESTIONS MODAL ═══ */
function TestQuestionsModal({ topic, courseId, onClose, onToast }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [adding,    setAdding]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [newQ,      setNewQ]      = useState({ text: '', point: 1, options: ['', '', '', ''], correct: 0 });

  const loadQ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservice/getQuestionsListWS', { params: { topicID: topic.id } });
      if (res.data.code === 1) setQuestions(res.data.data || []);
    } catch { onToast?.('Could not load questions', 'err'); }
    setLoading(false);
  }, [topic.id]);

  useEffect(() => { loadQ(); }, [loadQ]);

  const addQuestion = async () => {
    if (!newQ.text.trim()) { onToast?.('Question text required'); return; }
    const filledOpts = newQ.options.filter(o => o.trim());
    if (filledOpts.length < 2) { onToast?.('At least 2 options are required'); return; }
    setSaving(true);
    try {
      const qRes = await API.post('/Webservice/addTestQuestion', {
        courseID: courseId, chapterID: topic.chapter_id, topicID: topic.id,
        question_text: newQ.text.trim(), point: newQ.point,
      });
      if (qRes.data.code === 1) {
        const qID = qRes.data.data.questionID;
        const opts = newQ.options
          .filter(o => o.trim())
          .map((o, i) => ({ option_text: o.trim(), answer: i === newQ.correct ? 1 : 0, value: i === newQ.correct ? newQ.point : 0 }));
        await API.post('/Webservice/addTestQuestionOptions', { questionID: qID, options: opts });
        await API.post('/Webservice/sendTestQuestion', { questionID: qID });
        setNewQ({ text: '', point: 1, options: ['', '', '', ''], correct: 0 });
        setAdding(false);
        loadQ();
      } else { onToast?.(qRes.data.message || 'Failed', 'err'); }
    } catch { onToast?.('Save failed', 'err'); }
    setSaving(false);
  };

  const deleteQ = async (qID) => {
    try {
      await API.post('/Webservice/deleteQuestion', { questionID: qID });
      loadQ();
    } catch { onToast?.('Delete failed', 'err'); }
  };

  const setOption = (i, val) => setNewQ(q => { const o = [...q.options]; o[i] = val; return { ...q, options: o }; });

  return (
    <Modal large onClose={onClose}>
      <div className="ac-modal-head">
        <h2 className="ac-modal-title">Questions · {topic.name}</h2>
        <button className="ac-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>
      <div className="ac-modal-body">
        <div className="ac-qs-meta">
          Pass: {topic.passing_percentage || topic.passingPercentage || 75}% ·
          Max attempts: {topic.number_of_attempt || topic.numberOfAttempt || 0} (0 = unlimited)
        </div>

        {loading ? (
          <div className="ac-state">Loading…</div>
        ) : (
          <div className="ac-qs-list">
            {questions.length === 0 && !adding && (
              <div className="ac-qs-empty">No questions yet — click "Add question" below.</div>
            )}
            {questions.map((q, qi) => (
              <div key={q.id} className="ac-qs-item">
                <div className="ac-qs-item-head">
                  <span className="ac-qs-num">Q{qi + 1}</span>
                  <span className="ac-qs-text">{q.question_text}</span>
                  <span className="ac-qs-pts">{q.point} pt</span>
                  <button className="ac-action ac-action--danger" onClick={() => deleteQ(q.id)}>
                    <RiDeleteBin6Line size={11}/>
                  </button>
                </div>
                <div className="ac-qs-opts">
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className={`ac-qs-opt ${opt.answer ? 'ac-qs-opt--correct' : ''}`}>
                      <span className="ac-qs-opt-dot">{opt.answer ? '✓' : String.fromCharCode(65 + oi)}</span>
                      {opt.option_text}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {adding && (
              <div className="ac-qs-add-form">
                <div className="ac-qs-add-head">New question</div>
                <Field label="Question text" required>
                  <textarea className="ac-input" rows={2} autoFocus
                            value={newQ.text} onChange={e => setNewQ(q => ({ ...q, text: e.target.value }))}
                            placeholder="Type question here…"/>
                </Field>
                <Field label="Points">
                  <input className="ac-input" type="number" min="1" style={{ width: 90 }}
                         value={newQ.point} onChange={e => setNewQ(q => ({ ...q, point: Number(e.target.value) }))}/>
                </Field>
                <div className="ac-qs-opts-label">Options — select the correct answer</div>
                {newQ.options.map((opt, i) => (
                  <div key={i} className="ac-qs-opt-row">
                    <input type="radio" name="correct" checked={newQ.correct === i}
                           onChange={() => setNewQ(q => ({ ...q, correct: i }))}/>
                    <input className="ac-input" value={opt}
                           onChange={e => setOption(i, e.target.value)}
                           placeholder={`Option ${String.fromCharCode(65 + i)}`}/>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="ac-btn ac-btn--ghost" onClick={() => setAdding(false)} disabled={saving}>Cancel</button>
                  <button className="ac-btn ac-btn--primary" onClick={addQuestion} disabled={saving || !newQ.text.trim()}>
                    <RiCheckLine size={13}/>{saving ? 'Saving…' : 'Add question'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ac-modal-foot">
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
        {!adding && (
          <button className="ac-btn ac-btn--primary" onClick={() => setAdding(true)}>
            <RiAddLine size={13}/>Add question
          </button>
        )}
      </div>
    </Modal>
  );
}

/* ═══ RESOURCE LINKS MODAL ═══ */
function ResourceLinksModal({ topic, courseId, onClose, onToast }) {
  const [links,   setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [newLink, setNewLink] = useState({ name: '', description: '', link: '' });

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservice/getCourseChapterResourceList', { params: { topicID: topic.id } });
      if (res.data.code === 1) setLinks(res.data.data || []);
    } catch { onToast?.('Could not load links', 'err'); }
    setLoading(false);
  }, [topic.id]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const addLink = async () => {
    if (!newLink.name.trim() || !newLink.link.trim()) { onToast?.('Name and URL are required'); return; }
    setSaving(true);
    try {
      const res = await API.post('/Webservice/addResourceLinks', {
        courseID: courseId, chapterID: topic.chapter_id, topicID: topic.id,
        links: [{ name: newLink.name.trim(), description: newLink.description.trim(), link: newLink.link.trim() }],
      });
      if (res.data.code === 1) {
        setNewLink({ name: '', description: '', link: '' });
        setAdding(false);
        loadLinks();
      } else { onToast?.(res.data.message || 'Failed', 'err'); }
    } catch { onToast?.('Save failed', 'err'); }
    setSaving(false);
  };

  const removeLink = async (linkID) => {
    try {
      await API.post('/Webservice/removeResourseLink', { linkID });
      loadLinks();
    } catch { onToast?.('Remove failed', 'err'); }
  };

  return (
    <Modal large onClose={onClose}>
      <div className="ac-modal-head">
        <h2 className="ac-modal-title">Resource Links · {topic.name}</h2>
        <button className="ac-modal-close" onClick={onClose}><RiCloseLine size={16}/></button>
      </div>
      <div className="ac-modal-body">
        {loading ? (
          <div className="ac-state">Loading…</div>
        ) : (
          <div className="ac-qs-list">
            {links.length === 0 && !adding && (
              <div className="ac-qs-empty">No links yet — click "Add link" below.</div>
            )}
            {links.map((l) => (
              <div key={l.id} className="ac-rl-item">
                <div className="ac-rl-icon"><RiLinkM size={14}/></div>
                <div className="ac-rl-info">
                  <div className="ac-rl-name">{l.name}</div>
                  {l.description && <div className="ac-rl-desc">{l.description}</div>}
                  <a className="ac-rl-url" href={l.link} target="_blank" rel="noopener noreferrer">{l.link}</a>
                </div>
                <button className="ac-action ac-action--danger" onClick={() => removeLink(l.id)}>
                  <RiDeleteBin6Line size={11}/>
                </button>
              </div>
            ))}

            {adding && (
              <div className="ac-qs-add-form">
                <div className="ac-qs-add-head">New link</div>
                <Field label="Link name" required>
                  <input className="ac-input" autoFocus value={newLink.name}
                         onChange={e => setNewLink(l => ({ ...l, name: e.target.value }))}
                         placeholder="e.g. Official Documentation"/>
                </Field>
                <Field label="URL" required>
                  <input className="ac-input" value={newLink.link}
                         onChange={e => setNewLink(l => ({ ...l, link: e.target.value }))}
                         placeholder="https://..."/>
                </Field>
                <Field label="Description (optional)">
                  <input className="ac-input" value={newLink.description}
                         onChange={e => setNewLink(l => ({ ...l, description: e.target.value }))}
                         placeholder="About this link…"/>
                </Field>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="ac-btn ac-btn--ghost" onClick={() => setAdding(false)} disabled={saving}>Cancel</button>
                  <button className="ac-btn ac-btn--primary" onClick={addLink}
                          disabled={saving || !newLink.name.trim() || !newLink.link.trim()}>
                    <RiCheckLine size={13}/>{saving ? 'Saving…' : 'Add link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ac-modal-foot">
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{links.length} link{links.length !== 1 ? 's' : ''}</span>
        {!adding && (
          <button className="ac-btn ac-btn--primary" onClick={() => setAdding(true)}>
            <RiAddLine size={13}/>Add link
          </button>
        )}
      </div>
    </Modal>
  );
}

/* ═══ STYLES (compact) ═══ */
const CSS = `
.ac-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s-4);margin-bottom:var(--s-5);flex-wrap:wrap;animation:acFadeUp 600ms var(--ease-out)}
.ac-eyebrow{font-size:var(--text-sm);color:var(--text-3);font-weight:500;margin-bottom:6px}
.ac-title{font-family:var(--font-display);font-size:var(--text-4xl);font-weight:400;letter-spacing:-0.03em;color:var(--text);margin:0 0 6px;line-height:1}
.ac-title--sm{font-size:var(--text-2xl);margin:0;line-height:1.2}
.ac-sub{font-size:var(--text-md);color:var(--text-2);margin:0;line-height:1.5}
.ac-toast{position:fixed;top:80px;right:28px;display:flex;align-items:center;gap:var(--s-2);padding:11px 16px;border-radius:var(--r-md);font-size:var(--text-sm);font-weight:600;box-shadow:var(--shadow-lg);z-index:1000;animation:acSlide 280ms var(--ease-bounce)}
.ac-toast--ok{background:var(--accent);color:var(--accent-text)}
.ac-toast--err{background:var(--danger);color:#fff}
@keyframes acSlide{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.ac-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s-3);margin-bottom:var(--s-4);animation:acFadeUp 500ms var(--ease-out) 100ms both}
.ac-stat{background:var(--surface);border-radius:var(--r-md);padding:var(--s-4);text-align:center;box-shadow:var(--shadow-sm),var(--ring);position:relative;overflow:hidden;transition:transform var(--duration) var(--ease)}
.ac-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--c1),var(--c2))}
.ac-stat:hover{transform:translateY(-2px)}
.ac-stat-num{font-family:var(--font-display);font-size:var(--text-3xl);font-weight:400;letter-spacing:-0.025em;line-height:1;background:linear-gradient(135deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-variant-numeric:tabular-nums}
.ac-stat-lbl{font-size:var(--text-xs);color:var(--text-3);margin-top:6px;font-weight:500}
.ac-toolbar{display:flex;gap:var(--s-2);margin-bottom:var(--s-4);flex-wrap:wrap;align-items:center}
.ac-search{display:flex;align-items:center;gap:var(--s-2);padding:9px 12px;background:var(--surface);border-radius:var(--r-md);box-shadow:var(--shadow-sm),var(--ring);flex:1;min-width:240px;max-width:480px;color:var(--text-3)}
.ac-search:focus-within{box-shadow:var(--ring-focus)}
.ac-search input{flex:1;background:transparent;border:none;outline:none;font-family:inherit;font-size:var(--text-base);color:var(--text)}
.ac-search input::placeholder{color:var(--text-3)}
.ac-search-clear{background:none;border:none;padding:2px;display:grid;place-items:center;color:var(--text-3);border-radius:4px;cursor:pointer}
.ac-search-clear:hover{background:var(--surface-2);color:var(--text)}
.ac-select{padding:9px 12px;background:var(--surface);border:1px solid transparent;border-radius:var(--r-md);box-shadow:var(--shadow-sm),var(--ring);font-family:inherit;font-size:var(--text-base);color:var(--text);cursor:pointer;outline:none;min-width:140px}
.ac-select:hover{background:var(--surface-2)}
.ac-select:focus{border-color:var(--accent);box-shadow:var(--ring-focus)}
.ac-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border:1px solid transparent;border-radius:var(--r-md);font-family:inherit;font-size:var(--text-base);font-weight:600;cursor:pointer;letter-spacing:-0.005em;transition:all var(--duration-fast) var(--ease)}
.ac-btn:disabled{opacity:.55;cursor:not-allowed}
.ac-btn:active:not(:disabled){transform:scale(.97)}
.ac-btn--primary{background:var(--accent);color:var(--accent-text);box-shadow:0 2px 8px color-mix(in srgb,var(--accent) 35%,transparent)}
.ac-btn--primary:hover:not(:disabled){background:var(--accent-hover);transform:translateY(-1px)}
.ac-btn--ghost{background:var(--surface);border-color:var(--border-strong);color:var(--text)}
.ac-btn--ghost:hover:not(:disabled){background:var(--surface-2)}
.ac-btn--danger{background:var(--danger);color:#fff}
.ac-btn--danger:hover:not(:disabled){background:color-mix(in srgb,var(--danger) 85%,black)}
.ac-action{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-sm);font-family:inherit;font-size:11px;font-weight:600;color:var(--text-2);cursor:pointer;margin-left:4px;transition:all var(--duration-fast) var(--ease)}
.ac-action:hover{background:var(--surface-3);color:var(--text)}
.ac-action--build:hover{background:color-mix(in srgb,#6366F1 12%,transparent);color:#6366F1;border-color:color-mix(in srgb,#6366F1 30%,transparent)}
.ac-action--publish{background:var(--success-soft);color:var(--success);border-color:color-mix(in srgb,var(--success) 25%,transparent)}
.ac-action--publish:hover{background:color-mix(in srgb,var(--success) 18%,transparent)}
.ac-action--success{background:var(--success-soft);color:var(--success);border-color:color-mix(in srgb,var(--success) 25%,transparent)}
.ac-action--success:hover{background:color-mix(in srgb,var(--success) 18%,transparent)}
.ac-action--danger{background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 25%,transparent)}
.ac-action--danger:hover{background:color-mix(in srgb,var(--danger) 18%,transparent)}
.ac-action--add{background:var(--accent-soft);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 25%,transparent)}
.ac-action--add:hover{background:color-mix(in srgb,var(--accent) 18%,transparent)}
.ac-state{text-align:center;padding:var(--s-9) var(--s-4);color:var(--text-3);font-size:var(--text-sm)}
.ac-empty{background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow-sm),var(--ring);padding:var(--s-9) var(--s-4);text-align:center;animation:acFadeUp 500ms var(--ease-out)}
.ac-empty-icon{width:56px;height:56px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin:0 auto var(--s-3)}
.ac-empty-title{font-family:var(--font-display);font-size:var(--text-xl);font-weight:400;color:var(--text);letter-spacing:-0.025em;margin-bottom:4px}
.ac-empty-sub{font-size:var(--text-sm);color:var(--text-3);max-width:340px;margin:0 auto}
.ac-card{background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow-sm),var(--ring);overflow:hidden;animation:acFadeUp 600ms var(--ease-out) 200ms both}
.ac-table{width:100%;border-collapse:collapse}
.ac-table thead{background:var(--surface-2)}
.ac-table th{text-align:left;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-3);padding:10px var(--s-4);border-bottom:1px solid var(--border)}
.ac-table td{padding:12px var(--s-4);border-bottom:1px solid var(--border);font-size:var(--text-base);color:var(--text);vertical-align:middle}
.ac-table tbody tr{opacity:0;animation:acFadeIn 400ms var(--ease-out) forwards;transition:background var(--duration-fast) var(--ease)}
.ac-table tbody tr:hover{background:var(--surface-2)}
.ac-table tbody tr:last-child td{border-bottom:none}
.ac-thumb{width:44px;height:30px;object-fit:cover;border-radius:var(--r-sm);box-shadow:inset 0 0 0 1px var(--border)}
.ac-thumb--empty{background:var(--surface-2);color:var(--text-3);display:grid;place-items:center}
.ac-course-name{font-weight:600;color:var(--text);letter-spacing:-0.005em;margin-bottom:2px}
.ac-course-meta{font-size:11px;color:var(--text-3);font-weight:500}
.ac-cat-cell{font-size:var(--text-xs);color:var(--text-2);text-transform:capitalize}
.ac-pill{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;letter-spacing:0.02em}
.ac-pill-dot{width:6px;height:6px;border-radius:50%}
.ac-pill--live{background:var(--success-soft);color:var(--success)}
.ac-pill--live .ac-pill-dot{background:var(--success)}
.ac-pill--draft{background:var(--warning-soft);color:var(--warning)}
.ac-pill--draft .ac-pill-dot{background:var(--warning)}
.ac-pill--off{background:var(--danger-soft);color:var(--danger)}
.ac-pill--off .ac-pill-dot{background:var(--danger)}
.ac-vis{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--surface-2);border:1px solid var(--border);border-radius:99px;font-family:inherit;font-size:11px;font-weight:600;color:var(--text-2);cursor:pointer;transition:all var(--duration-fast) var(--ease)}
.ac-vis:hover{background:var(--surface-3);color:var(--text)}
.ac-builder-head{display:flex;align-items:center;gap:var(--s-3);margin-bottom:var(--s-4);flex-wrap:wrap;animation:acFadeUp 500ms var(--ease-out)}
.ac-builder-title{flex:1;min-width:0}
.ac-builder-name{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ac-builder-meta{font-size:var(--text-xs);color:var(--text-3);margin-top:4px;font-weight:500}
.ac-chapters{display:flex;flex-direction:column;gap:var(--s-2)}
.ac-chapter{background:var(--surface);border-radius:var(--r-md);box-shadow:var(--shadow-sm),var(--ring);overflow:hidden;animation:acFadeUp 500ms var(--ease-out) both}
.ac-chapter--off{opacity:.65}
.ac-ch-head{display:flex;align-items:center;gap:10px;padding:12px 14px;flex-wrap:wrap}
.ac-ch-toggle{background:transparent;border:none;width:28px;height:28px;display:grid;place-items:center;border-radius:var(--r-sm);color:var(--text-3);cursor:pointer;transition:all var(--duration-fast) var(--ease)}
.ac-ch-toggle:hover{background:var(--surface-2);color:var(--text)}
.ac-ch-num{padding:3px 10px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:700;border-radius:99px;letter-spacing:0.04em;flex-shrink:0}
.ac-ch-info{flex:1;min-width:0}
.ac-ch-name{font-size:var(--text-base);font-weight:600;color:var(--text);letter-spacing:-0.005em;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ac-ch-disabled-tag{font-size:9px;font-weight:700;padding:1px 7px;background:var(--danger-soft);color:var(--danger);border-radius:99px;letter-spacing:0.04em;text-transform:uppercase}
.ac-ch-desc{font-size:11px;color:var(--text-3);margin-top:2px;font-weight:500}
.ac-ch-count{font-size:11px;color:var(--text-3);font-weight:500;margin-right:6px}
.ac-ch-actions{display:flex;gap:4px;flex-shrink:0}
.ac-topics{padding:6px;border-top:1px solid var(--border);background:var(--surface-2)}
.ac-topics-empty{padding:14px;text-align:center;font-size:var(--text-xs);color:var(--text-3);font-weight:500}
.ac-topic{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface);border-radius:var(--r-sm);margin-bottom:4px;transition:all var(--duration-fast) var(--ease)}
.ac-topic:hover{box-shadow:var(--shadow-sm)}
.ac-topic-icon{position:relative;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:#fff;flex-shrink:0}
.ac-topic-icon-bg{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,var(--c1),var(--c2))}
.ac-topic-icon>svg{position:relative;z-index:1}
.ac-topic-info{flex:1;min-width:0}
.ac-topic-name{font-size:var(--text-base);font-weight:500;color:var(--text);letter-spacing:-0.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-topic-meta{font-size:11px;color:var(--text-3);margin-top:2px;font-weight:500}
.ac-topic-actions{display:flex;gap:4px;flex-shrink:0}
.ac-overlay{position:fixed;inset:0;background:var(--overlay);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-items:center;padding:var(--s-4);z-index:2000;animation:acFadeIn 200ms var(--ease-out)}
.ac-modal{width:100%;max-width:480px;max-height:90vh;background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--shadow-xl);display:flex;flex-direction:column;overflow:hidden;animation:acModalIn 280ms var(--ease-bounce)}
.ac-modal--lg{max-width:680px}
.ac-modal--md{max-width:520px}
.ac-modal--sm{max-width:380px}
@keyframes acModalIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes acFadeIn{from{opacity:0}to{opacity:1}}
.ac-modal-head{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:var(--s-3);flex-shrink:0}
.ac-modal-title{font-family:var(--font-display);font-size:var(--text-xl);font-weight:400;letter-spacing:-0.025em;color:var(--text);margin:0;line-height:1.1}
.ac-modal-close{background:transparent;border:none;width:28px;height:28px;display:grid;place-items:center;border-radius:var(--r-sm);color:var(--text-3);cursor:pointer;transition:all var(--duration-fast) var(--ease)}
.ac-modal-close:hover{background:var(--surface-2);color:var(--text)}
.ac-modal-body{padding:20px;overflow-y:auto;flex:1}
.ac-modal-msg{font-size:var(--text-sm);color:var(--text-2);margin:0;line-height:1.5}
.ac-modal-row{display:grid;grid-template-columns:1fr 1fr;gap:var(--s-3)}
.ac-modal-foot{padding:12px 20px;border-top:1px solid var(--border);background:var(--surface-2);display:flex;justify-content:flex-end;gap:var(--s-2);flex-shrink:0}
.ac-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--s-3)}
.ac-grid-full{grid-column:1 / -1}
.ac-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
.ac-label{font-size:var(--text-xs);font-weight:600;color:var(--text-2);letter-spacing:-0.005em}
.ac-req{color:var(--danger);margin-left:3px}
.ac-input{width:100%;padding:9px 12px;background:var(--surface-2);border:1px solid transparent;border-radius:var(--r-md);font-family:inherit;font-size:var(--text-base);color:var(--text);outline:none;transition:all var(--duration-fast) var(--ease);resize:vertical}
.ac-input:hover{background:var(--surface-3)}
.ac-input:focus{background:var(--surface);border-color:var(--accent);box-shadow:var(--ring-focus)}
.ac-input--err{background:var(--danger-soft);border-color:var(--danger)}
.ac-err{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--danger);margin-top:2px;font-weight:500}
.ac-img-preview{display:flex;align-items:center;gap:10px;margin-top:8px;padding:8px;background:var(--surface-2);border-radius:var(--r-sm)}
.ac-img-preview img{width:64px;height:42px;border-radius:var(--r-sm);object-fit:cover;box-shadow:inset 0 0 0 1px var(--border)}
.ac-img-preview span{font-size:var(--text-xs);color:var(--text-3);font-weight:500}
.ac-type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.ac-type-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);font-family:inherit;cursor:pointer;transition:all var(--duration-fast) var(--ease)}
.ac-type-btn:hover{background:var(--surface-3);transform:translateY(-1px)}
.ac-type-btn--active{background:var(--accent-soft);border-color:var(--accent)}
.ac-type-icon{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 4px 10px color-mix(in srgb,var(--c1) 30%,transparent)}
.ac-type-label{font-size:11px;font-weight:600;color:var(--text-2);letter-spacing:-0.005em}
.ac-type-btn--active .ac-type-label{color:var(--text)}
.ac-info-banner{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:var(--info-soft);color:var(--info);border-radius:var(--r-md);font-size:11px;font-weight:500;line-height:1.5;margin-top:8px}
@keyframes acFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:780px){
  .ac-stats{grid-template-columns:repeat(2,1fr)}
  .ac-form-grid{grid-template-columns:1fr}
  .ac-modal-row{grid-template-columns:1fr}
  .ac-type-grid{grid-template-columns:repeat(2,1fr)}
  .ac-title{font-size:var(--text-3xl)}
}
.ac-qs-meta{font-size:11px;color:var(--text-3);font-weight:500;margin-bottom:14px;padding:8px 12px;background:var(--surface-2);border-radius:var(--r-sm)}
.ac-qs-list{display:flex;flex-direction:column;gap:10px}
.ac-qs-empty{text-align:center;padding:28px 16px;font-size:var(--text-sm);color:var(--text-3)}
.ac-qs-item{background:var(--surface-2);border-radius:var(--r-md);padding:12px 14px;border:1px solid var(--border)}
.ac-qs-item-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
.ac-qs-num{flex-shrink:0;font-size:10px;font-weight:700;padding:2px 8px;background:var(--accent-soft);color:var(--accent);border-radius:99px}
.ac-qs-text{flex:1;font-size:var(--text-base);font-weight:500;color:var(--text);line-height:1.4}
.ac-qs-pts{font-size:10px;color:var(--text-3);font-weight:600;white-space:nowrap}
.ac-qs-opts{display:flex;flex-direction:column;gap:4px;margin-left:36px}
.ac-qs-opt{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2);padding:5px 10px;border-radius:var(--r-sm);background:var(--surface)}
.ac-qs-opt--correct{background:var(--success-soft);color:var(--success);font-weight:600}
.ac-qs-opt-dot{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;flex-shrink:0;background:var(--surface-3)}
.ac-qs-opt--correct .ac-qs-opt-dot{background:var(--success);color:#fff}
.ac-qs-add-form{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:16px}
.ac-qs-add-head{font-size:var(--text-sm);font-weight:600;color:var(--text);margin-bottom:12px}
.ac-qs-opts-label{font-size:var(--text-xs);font-weight:600;color:var(--text-2);margin-bottom:6px}
.ac-qs-opt-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ac-qs-opt-row input[type=radio]{flex-shrink:0;accent-color:var(--accent);width:15px;height:15px;cursor:pointer}
.ac-rl-item{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:var(--surface-2);border-radius:var(--r-md);border:1px solid var(--border)}
.ac-rl-icon{width:30px;height:30px;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0;margin-top:2px}
.ac-rl-info{flex:1;min-width:0}
.ac-rl-name{font-size:var(--text-base);font-weight:600;color:var(--text);margin-bottom:2px}
.ac-rl-desc{font-size:11px;color:var(--text-3);margin-bottom:4px}
.ac-rl-url{font-size:11px;color:var(--info);word-break:break-all}
.ac-rl-url:hover{text-decoration:underline}
`;
