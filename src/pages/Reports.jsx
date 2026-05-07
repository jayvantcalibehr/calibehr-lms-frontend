import { useState, useEffect, useRef } from 'react';
import {
  RiDownload2Line, RiBookOpenLine, RiAwardLine, RiUser3Line,
  RiGridLine, RiFileTextLine, RiFilterLine, RiChat3Line,
  RiInformationLine, RiAlertLine, RiLoader4Line, RiArrowDownSLine,
  RiCloseLine, RiSearchLine, RiCheckLine, RiBarChartLine,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';

function useFilters() {
  const [data, setData] = useState({
    courses: [], companies: [], departments: [], verticals: [], branches: [],
    quizzes: [], loading: true,
  });
  useEffect(() => {
    const wrap = (p) => p.then(r => r?.data?.code === 1 ? r.data.data : []).catch(() => []);
    Promise.all([
      wrap(API.get('/Webservice/getCatalogCourseList')),
      wrap(API.get('/Webservices/getCompanyList')),
      wrap(API.get('/Webservices/getDepartmentList')),
      wrap(API.get('/Webservices/getVerticalList')),
      wrap(API.get('/Webservices/getBranchList')),
      wrap(API.get('/Webservices/getAllQuizList')),
    ]).then(([courses, companies, departments, verticals, branches, quizzes]) => {
      setData({ courses, companies, departments, verticals, branches, quizzes, loading: false });
    });
  }, []);
  return data;
}

function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show: (text, type = 'err') => setToast({ text, type }) };
}

async function downloadFile(endpoint, params, filename) {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null && v.length !== 0))
  );
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v) && v.length) {
      query.delete(k);
      v.forEach(item => query.append(`${k}[]`, item));
    }
  });
  const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  const url  = `${base}${endpoint}${query.toString() ? '?' + query.toString() : ''}`;
  const res  = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function MultiSelect({ options = [], value = [], onChange, placeholder = 'All' }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase().trim()));
  const toggle = (id) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  const selectAll   = () => onChange(filtered.map(o => o.id));
  const deselectAll = () => onChange([]);
  const labelText = value.length === 0 ? placeholder
    : value.length === options.length ? `All ${options.length} selected`
    : value.length === 1 ? options.find(o => o.id === value[0])?.name || value[0]
    : `${value.length} selected`;
  return (
    <div className="ms" ref={ref}>
      <button type="button" className={`ms-trigger ${open ? 'ms-trigger--open' : ''}`} onClick={() => setOpen(!open)}>
        <span className={`ms-text ${value.length === 0 ? 'ms-text--placeholder' : ''}`}>{labelText}</span>
        <RiArrowDownSLine size={15} className={`ms-chev ${open ? 'ms-chev--open' : ''}`}/>
      </button>
      {open && (
        <div className="ms-pop">
          <div className="ms-search">
            <RiSearchLine size={13}/>
            <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus/>
            {search && <button type="button" className="ms-search-clear" onClick={() => setSearch('')}><RiCloseLine size={12}/></button>}
          </div>
          <div className="ms-actions">
            <button type="button" className="ms-action" onClick={selectAll}>Select all</button>
            <button type="button" className="ms-action" onClick={deselectAll}>Clear</button>
          </div>
          <div className="ms-list">
            {filtered.length === 0 ? (
              <div className="ms-empty">No matches.</div>
            ) : filtered.map(o => {
              const checked = value.includes(o.id);
              return (
                <button type="button" key={o.id} className={`ms-item ${checked ? 'ms-item--checked' : ''}`} onClick={() => toggle(o.id)}>
                  <span className="ms-checkbox">{checked && <RiCheckLine size={12}/>}</span>
                  <span className="ms-name">{o.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SingleSelect({ value, onChange, placeholder, options }) {
  return (
    <div className="ss">
      <select className="ss-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <RiArrowDownSLine size={15} className="ss-chev"/>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="rpt-field">
      <label className="rpt-label">{label}{required && <span className="rpt-req">*</span>}</label>
      {children}
    </div>
  );
}

function DownloadButtons({ loading, onDownload }) {
  return (
    <div className="rpt-actions">
      <button className="rpt-btn rpt-btn--excel" onClick={() => onDownload('excel')} disabled={!!loading}>
        <RiDownload2Line size={14}/>
        {loading === 'excel' ? 'Downloading…' : 'Excel'}
      </button>
      <button className="rpt-btn rpt-btn--pdf" onClick={() => onDownload('pdf')} disabled={!!loading}>
        <RiFileTextLine size={14}/>
        {loading === 'pdf' ? 'Downloading…' : 'PDF'}
      </button>
    </div>
  );
}

function ReportCard({ icon, gradient, title, desc, children, wide, badge }) {
  return (
    <article className={`rpt-card ${wide ? 'rpt-card--wide' : ''}`} style={{ '--grad': gradient }}>
      <div className="rpt-card-accent"/>
      <header className="rpt-head">
        <div className="rpt-icon">{icon}</div>
        <div className="rpt-head-text">
          <div className="rpt-head-top">
            <h3 className="rpt-title">{title}</h3>
            {badge && <span className="rpt-badge">{badge}</span>}
          </div>
          <p className="rpt-desc">{desc}</p>
        </div>
      </header>
      <div className="rpt-body">{children}</div>
    </article>
  );
}

/* ─────── COURSE REPORT ─────── */
function CourseReport({ courses, companies, departments, onToast }) {
  const [courseID, setCourseID] = useState('');
  const [companyList, setCompanyList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [loading, setLoading] = useState('');
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(false);
  const params = () => ({ courseID, companyCode: companyList, department: deptList });
  const getCount = async () => {
    if (!courseID) return; setCounting(true);
    try { const r = await API.get('/reports/course', { params: params() }); if (r.data.code === 1) setCount(r.data.data?.total ?? r.data.data?.report?.length ?? 0); }
    catch { onToast?.('Could not preview count.'); } setCounting(false);
  };
  const download = async (type) => {
    if (!courseID) { onToast?.('Please select a course first.'); return; }
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    try { await downloadFile(`/reports/course/${type}`, params(), `Course_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`); }
    catch { onToast?.('Download failed. Please try again.'); } setLoading('');
  };
  return (
    <ReportCard icon={<RiBookOpenLine size={20}/>} gradient="135deg, #6366F1, #8B5CF6"
                title="Courses Report" desc="Learner completion data per course">
      <Field label="Course" required>
        <SingleSelect value={courseID} onChange={(v) => { setCourseID(v); setCount(null); }}
                      placeholder="— Select course —" options={courses.map(c => ({ value: c.id, label: c.name }))}/>
      </Field>
      <div className="rpt-row">
        <Field label="Companies">
          <MultiSelect options={companies} value={companyList} onChange={setCompanyList} placeholder="All companies"/>
        </Field>
        <Field label="Departments">
          <MultiSelect options={departments} value={deptList} onChange={setDeptList} placeholder="All departments"/>
        </Field>
      </div>
      {courseID && (
        <button className="rpt-count-btn" onClick={getCount} disabled={counting}>
          <RiFilterLine size={13}/>
          {counting ? 'Counting…' : count !== null ? `${count.toLocaleString('en-IN')} records` : 'Preview count'}
        </button>
      )}
      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ─────── QUIZ REPORT ─────── */
function QuizReport({ quizzes, companies, onToast }) {
  const [quizID, setQuizID] = useState('');
  const [companyList, setCompanyList] = useState([]);
  const [loading, setLoading] = useState('');
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(false);
  const params = () => ({ quizID, companyCode: companyList });
  const getCount = async () => {
    if (!quizID) return; setCounting(true);
    try { const r = await API.get('/reports/quiz', { params: params() }); if (r.data.code === 1) setCount(r.data.data?.total ?? r.data.data?.report?.length ?? 0); }
    catch { onToast?.('Could not preview count.'); } setCounting(false);
  };
  const download = async (type) => {
    if (!quizID) { onToast?.('Please select a quiz first.'); return; }
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    try { await downloadFile(`/reports/quiz/${type}`, params(), `Quiz_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`); }
    catch { onToast?.('Download failed. Please try again.'); } setLoading('');
  };
  return (
    <ReportCard icon={<RiAwardLine size={20}/>} gradient="135deg, #F59E0B, #EF4444"
                title="Quiz Report" desc="Quiz scores and performance">
      <Field label="Quiz" required>
        <SingleSelect value={quizID} onChange={(v) => { setQuizID(v); setCount(null); }}
                      placeholder="— Select quiz —" options={quizzes.map(q => ({ value: q.id, label: q.title || q.name }))}/>
      </Field>
      <Field label="Companies">
        <MultiSelect options={companies} value={companyList} onChange={setCompanyList} placeholder="All companies"/>
      </Field>
      {quizID && (
        <button className="rpt-count-btn" onClick={getCount} disabled={counting}>
          <RiFilterLine size={13}/>
          {counting ? 'Counting…' : count !== null ? `${count.toLocaleString('en-IN')} records` : 'Preview count'}
        </button>
      )}
      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ─────── FEEDBACK REPORT ─────── */
function FeedbackReport({ courses, onToast }) {
  const [courseID, setCourseID] = useState('');
  const [loading, setLoading] = useState('');
  const download = async (type) => {
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    try { await downloadFile(`/reports/feedback/${type}`, { courseID }, `Feedback_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`); }
    catch { onToast?.('Download failed. Please try again.'); } setLoading('');
  };
  return (
    <ReportCard icon={<RiChat3Line size={20}/>} gradient="135deg, #A78BFA, #8B5CF6"
                title="Feedback Report" desc="Course ratings and learner comments">
      <Field label="Course">
        <SingleSelect value={courseID} onChange={setCourseID} placeholder="All courses"
                      options={courses.map(c => ({ value: c.id, label: c.name }))}/>
      </Field>
      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ─────── LEARNER REPORT ─────── */
function LearnerReport({ companies, departments, onToast }) {
  const [companyList, setCompanyList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [loading, setLoading] = useState('');
  const [count, setCount] = useState(null);
  const [counting, setCounting] = useState(false);
  const params = () => ({ companyCode: companyList, department: deptList });
  const getCount = async () => {
    setCounting(true);
    try { const r = await API.get('/reports/learner', { params: params() }); if (r.data.code === 1) setCount(r.data.data?.total ?? r.data.data?.report?.length ?? 0); }
    catch { onToast?.('Could not preview count.'); } setCounting(false);
  };
  const download = async (type) => {
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    try { await downloadFile(`/reports/learner/${type}`, params(), `Learner_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`); }
    catch { onToast?.('Download failed. Please try again.'); } setLoading('');
  };
  return (
    <ReportCard icon={<RiUser3Line size={20}/>} gradient="135deg, #06B6D4, #0EA5E9"
                title="Learner Report" desc="Individual learner progress across all courses" wide>
      <div className="rpt-row">
        <Field label="Companies">
          <MultiSelect options={companies} value={companyList} onChange={(v) => { setCompanyList(v); setCount(null); }} placeholder="All companies"/>
        </Field>
        <Field label="Departments">
          <MultiSelect options={departments} value={deptList} onChange={(v) => { setDeptList(v); setCount(null); }} placeholder="All departments"/>
        </Field>
      </div>
      <div className="rpt-bottom">
        <button className="rpt-count-btn" onClick={getCount} disabled={counting}>
          <RiFilterLine size={13}/>
          {counting ? 'Counting…' : count !== null ? `${count.toLocaleString('en-IN')} records found` : 'Preview count'}
        </button>
        <DownloadButtons loading={loading} onDownload={download}/>
      </div>
    </ReportCard>
  );
}

/* ─────── MATRIX REPORT ─────── */
function MatrixReport({ courses, companies, departments, verticals, branches, onToast }) {
  const [courseList,   setCourseList]   = useState([]);
  const [companyList,  setCompanyList]  = useState([]);
  const [deptList,     setDeptList]     = useState([]);
  const [verticalList, setVerticalList] = useState([]);
  const [branchList,   setBranchList]   = useState([]);
  const [loading,      setLoading]      = useState('');
  const params = () => ({
    ...(courseList.length   && { courseIDs: courseList }),
    ...(companyList.length  && { companies: companyList }),
    ...(deptList.length     && { departments: deptList }),
    ...(verticalList.length && { verticals: verticalList }),
    ...(branchList.length   && { branches: branchList }),
  });
  const download = async (type) => {
    setLoading(type);
    const endpoint = type === 'excel' ? '/reports/matrix/courses/excel' : '/reports/matrix/pdf';
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    try { await downloadFile(endpoint, params(), `Candidate_Courses_Matrix_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`); }
    catch { onToast?.('Download failed. Please try again.'); } setLoading('');
  };
  const courseOptions = courses.map(c => ({ id: String(c.id), name: c.name }));
  return (
    <ReportCard icon={<RiGridLine size={20}/>} gradient="135deg, #10B981, #059669"
                title="Matrix Report" desc="Candidate × Courses matrix — ECR live data" wide badge="ECR Live">
      <div className="rpt-info-strip">
        <RiInformationLine size={13}/>
        <span>EmpCode · Name · Email · Company · Vertical · Dept · DOJ · Location · Designation · RM · FH · Course · Mode · Completion · Score</span>
      </div>
      <div className="rpt-grid-3">
        <Field label="Courses"><MultiSelect options={courseOptions} value={courseList} onChange={setCourseList} placeholder="All courses"/></Field>
        <Field label="Companies"><MultiSelect options={companies} value={companyList} onChange={setCompanyList} placeholder="All companies"/></Field>
        <Field label="Departments"><MultiSelect options={departments} value={deptList} onChange={setDeptList} placeholder="All departments"/></Field>
        <Field label="Verticals"><MultiSelect options={verticals} value={verticalList} onChange={setVerticalList} placeholder="All verticals"/></Field>
        <Field label="Branches / Locations"><MultiSelect options={branches} value={branchList} onChange={setBranchList} placeholder="All branches"/></Field>
      </div>
      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const { courses, companies, departments, verticals, branches, quizzes, loading } = useFilters();
  const { toast, show } = useToast();
  return (
    <AppShell>
      <style>{CSS}</style>
      <div className="rpt-page">
        {/* Header */}
        <div className="rpt-header">
          <div className="rpt-header-left">
            <div className="rpt-header-icon"><RiBarChartLine size={22}/></div>
            <div>
              <h1 className="rpt-h1">Reports & Analytics</h1>
              <p className="rpt-sub">
                {loading ? 'Loading filter options…'
                  : (companies.length === 0 && departments.length === 0)
                    ? 'ECR unreachable — filters may be empty. Downloads still work.'
                    : `${courses.length} courses · ${companies.length} companies · ${departments.length} departments`}
              </p>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`rpt-toast rpt-toast--${toast.type}`}>
            <RiAlertLine size={14}/><span>{toast.text}</span>
          </div>
        )}

        {/* ECR warning */}
        {!loading && companies.length === 0 && (
          <div className="rpt-warn">
            <RiAlertLine size={14}/>
            <span>Could not load filters from ECR. Multi-select dropdowns will be empty. Downloads still work — server-side will use all data.</span>
          </div>
        )}

        {/* Section: Standard Reports */}
        <div className="rpt-section-label">Standard Reports</div>
        <div className="rpt-grid">
          <CourseReport   courses={courses}   companies={companies} departments={departments} onToast={show}/>
          <QuizReport     quizzes={quizzes}   companies={companies} onToast={show}/>
          <FeedbackReport courses={courses}   onToast={show}/>
        </div>

        {/* Section: Full Reports */}
        <div className="rpt-section-label" style={{marginTop:'var(--s-6)'}}>Full Reports</div>
        <LearnerReport companies={companies} departments={departments} onToast={show}/>
        <div style={{height:'var(--s-4)'}}/>
        <MatrixReport courses={courses} companies={companies} departments={departments}
                      verticals={verticals} branches={branches} onToast={show}/>
      </div>
    </AppShell>
  );
}

const CSS = `
.rpt-page { padding-bottom: var(--s-8); }

/* ── Header ── */
.rpt-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--s-6);
  padding-bottom: var(--s-5);
  border-bottom: 1px solid var(--border);
}
.rpt-header-left { display: flex; align-items: center; gap: var(--s-4); }
.rpt-header-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #000));
  display: grid; place-items: center; color: #fff; flex-shrink: 0;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 35%, transparent);
}
.rpt-h1 {
  font-size: var(--text-2xl); font-weight: 700;
  color: var(--text); margin: 0 0 3px; letter-spacing: -0.02em;
}
.rpt-sub { font-size: var(--text-sm); color: var(--text-3); margin: 0; }

/* ── Section label ── */
.rpt-section-label {
  font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--text-3);
  margin-bottom: var(--s-3);
}

/* ── Toast / Warn ── */
.rpt-toast {
  display: flex; align-items: center; gap: var(--s-2);
  padding: 10px var(--s-4); border-radius: var(--r-md);
  font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--s-4);
}
.rpt-toast--err { background: var(--danger-soft); color: var(--danger); }
.rpt-toast--ok  { background: var(--success-soft); color: var(--success); }
.rpt-warn {
  display: flex; align-items: center; gap: var(--s-2);
  padding: 10px 14px; background: var(--warning-soft); color: var(--warning);
  border-radius: var(--r-md); font-size: var(--text-xs); font-weight: 500;
  margin-bottom: var(--s-4);
}

/* ── Grid ── */
.rpt-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }

/* ── Card ── */
.rpt-card {
  background: var(--surface); border-radius: 16px;
  border: 1px solid var(--border);
  padding: var(--s-5);
  display: flex; flex-direction: column; gap: var(--s-4);
  position: relative; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.rpt-card:hover { transform: translateY(-2px); box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
.rpt-card--wide { grid-column: 1 / -1; }

.rpt-card-accent {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--grad);
}

/* ── Card Header ── */
.rpt-head { display: flex; align-items: center; gap: var(--s-3); }
.rpt-icon {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  background: var(--grad);
  display: grid; place-items: center; color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.rpt-head-text { flex: 1; min-width: 0; }
.rpt-head-top { display: flex; align-items: center; gap: var(--s-2); }
.rpt-title { font-size: var(--text-base); font-weight: 700; color: var(--text); margin: 0; }
.rpt-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
  padding: 2px 7px; border-radius: 99px;
  background: var(--success-soft); color: var(--success);
}
.rpt-desc { font-size: var(--text-xs); color: var(--text-3); margin: 3px 0 0; }

/* ── Card Body ── */
.rpt-body { display: flex; flex-direction: column; gap: var(--s-3); }

/* ── Layout helpers ── */
.rpt-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
.rpt-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-3); }
.rpt-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--s-3); }

/* ── Field ── */
.rpt-field { display: flex; flex-direction: column; gap: 5px; }
.rpt-label { font-size: 11px; font-weight: 700; color: var(--text-2); letter-spacing: 0.02em; text-transform: uppercase; }
.rpt-req { color: var(--danger); margin-left: 2px; }

/* ── Info strip ── */
.rpt-info-strip {
  display: flex; align-items: flex-start; gap: var(--s-2);
  padding: 9px 12px; background: var(--info-soft); color: var(--info);
  border-radius: var(--r-md); font-size: var(--text-xs); font-weight: 500; line-height: 1.6;
}

/* ── Single Select ── */
.ss { position: relative; }
.ss-select {
  width: 100%; padding: 9px 32px 9px 12px;
  background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: var(--r-md);
  font-family: inherit; font-size: var(--text-base); color: var(--text);
  cursor: pointer; outline: none; appearance: none;
  transition: all 150ms ease;
}
.ss-select:hover { background: var(--surface-3); border-color: var(--border-strong); }
.ss-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
.ss-chev { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: var(--text-3); pointer-events: none; }

/* ── Multi Select ── */
.ms { position: relative; }
.ms-trigger {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  gap: var(--s-2); padding: 9px 12px;
  background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: var(--r-md); cursor: pointer;
  font-family: inherit; font-size: var(--text-base); color: var(--text);
  outline: none; transition: all 150ms ease; text-align: left;
}
.ms-trigger:hover { background: var(--surface-3); border-color: var(--border-strong); }
.ms-trigger--open { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
.ms-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.ms-text--placeholder { color: var(--text-3); font-weight: 400; }
.ms-chev { color: var(--text-3); transition: transform 150ms ease; flex-shrink: 0; }
.ms-chev--open { transform: rotate(180deg); color: var(--accent); }
.ms-pop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--surface); border: 1.5px solid var(--border-strong);
  border-radius: var(--r-md); box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  z-index: 50; max-height: 300px; display: flex; flex-direction: column; overflow: hidden;
}
.ms-search {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 11px; border-bottom: 1px solid var(--border); color: var(--text-3);
}
.ms-search input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: var(--text-base); color: var(--text); }
.ms-search input::placeholder { color: var(--text-3); }
.ms-search-clear { background: none; border: none; padding: 2px; color: var(--text-3); display: grid; place-items: center; cursor: pointer; border-radius: 4px; }
.ms-search-clear:hover { color: var(--text); background: var(--surface-2); }
.ms-actions { display: flex; padding: 6px 8px; border-bottom: 1px solid var(--border); }
.ms-action { flex: 1; padding: 5px 10px; background: transparent; border: none; font-family: inherit; font-size: var(--text-xs); font-weight: 700; color: var(--accent); border-radius: 6px; cursor: pointer; transition: background 150ms ease; }
.ms-action:hover { background: var(--accent-soft); }
.ms-list { flex: 1; overflow-y: auto; padding: 4px; }
.ms-empty { padding: var(--s-4); text-align: center; color: var(--text-3); font-size: var(--text-xs); }
.ms-item { width: 100%; display: flex; align-items: center; gap: var(--s-2); padding: 7px 8px; background: transparent; border: none; font-family: inherit; font-size: var(--text-base); color: var(--text); text-align: left; cursor: pointer; border-radius: 6px; transition: background 150ms ease; }
.ms-item:hover { background: var(--surface-2); }
.ms-item--checked { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.ms-checkbox { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border-strong); background: var(--surface); display: grid; place-items: center; color: #fff; flex-shrink: 0; transition: all 150ms ease; }
.ms-item--checked .ms-checkbox { background: var(--accent); border-color: var(--accent); }
.ms-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Count button ── */
.rpt-count-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: var(--r-md); font-family: inherit; font-size: var(--text-xs); font-weight: 600;
  color: var(--text-2); cursor: pointer; align-self: flex-start;
  transition: all 150ms ease;
}
.rpt-count-btn:hover:not(:disabled) { background: var(--surface-3); border-color: var(--border-strong); color: var(--text); }
.rpt-count-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Action buttons ── */
.rpt-actions { display: flex; gap: var(--s-2); flex-wrap: wrap; }
.rpt-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border: 1.5px solid transparent; border-radius: var(--r-md);
  font-family: inherit; font-size: var(--text-sm); font-weight: 700;
  cursor: pointer; transition: all 150ms ease; letter-spacing: -0.01em;
}
.rpt-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.rpt-btn:active:not(:disabled) { transform: scale(0.97); }
.rpt-btn--excel {
  background: var(--accent); color: var(--accent-text);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent);
}
.rpt-btn--excel:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.rpt-btn--pdf { background: var(--surface-2); color: var(--text); border-color: var(--border-strong); }
.rpt-btn--pdf:hover:not(:disabled) { background: var(--surface-3); transform: translateY(-1px); }

/* ── Responsive ── */
@media (max-width: 1100px) { .rpt-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 780px) {
  .rpt-grid { grid-template-columns: 1fr; }
  .rpt-row, .rpt-grid-3 { grid-template-columns: 1fr; }
  .rpt-h1 { font-size: var(--text-xl); }
  .rpt-bottom { flex-direction: column; align-items: flex-start; }
}
`;
