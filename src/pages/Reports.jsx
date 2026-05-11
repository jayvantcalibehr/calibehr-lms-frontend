import { useState, useEffect, useRef } from 'react';
import {
  RiDownload2Line, RiBookOpenLine, RiAwardLine, RiUser3Line,
  RiGridLine, RiFileTextLine, RiFilterLine, RiChat3Line,
  RiInformationLine, RiAlertLine, RiLoader4Line, RiArrowDownSLine,
  RiCloseLine, RiSearchLine, RiCheckLine, RiVideoLine,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';

/* ═══════════════════════════════════════════════════════════════════
   FILTERS HOOK — fetches all dropdown options once
   FIX: now uses 4 dedicated ECR-backed endpoints (not getCourseType / getAllRoles)
   ═══════════════════════════════════════════════════════════════════ */
function useFilters() {
  const [data, setData] = useState({
    courses: [], companies: [], departments: [], verticals: [], branches: [],
    quizzes: [],
    loading: true,
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

/* ── Toast helper ── */
function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show: (text, type = 'err') => setToast({ text, type }) };
}

/* ── Download helper ── */
async function downloadFile(endpoint, params, filename) {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null && v.length !== 0))
  );
  // For arrays (multi-select), append each value separately
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

/* ═══════════════════════════════════════════════════════════════════
   MULTI-SELECT — like old report's company/dept dropdown
   ═══════════════════════════════════════════════════════════════════ */
function MultiSelect({ options = [], value = [], onChange, placeholder = 'All' }) {
  const [open,    setOpen]    = useState(false);
  const [search,  setSearch]  = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  };

  const selectAll   = () => onChange(filtered.map(o => o.id));
  const deselectAll = () => onChange([]);

  const labelText =
    value.length === 0
      ? placeholder
      : value.length === options.length
      ? `All ${options.length} selected`
      : value.length === 1
      ? value[0]
      : `${value.length} selected`;

  return (
    <div className="ms" ref={ref}>
      <button
        type="button"
        className={`ms-trigger ${open ? 'ms-trigger--open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className={`ms-text ${value.length === 0 ? 'ms-text--placeholder' : ''}`}>
          {labelText}
        </span>
        <RiArrowDownSLine size={15} className={`ms-chev ${open ? 'ms-chev--open' : ''}`}/>
      </button>

      {open && (
        <div className="ms-pop">
          <div className="ms-search">
            <RiSearchLine size={13}/>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button type="button" className="ms-search-clear" onClick={() => setSearch('')}>
                <RiCloseLine size={12}/>
              </button>
            )}
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
                <button
                  type="button"
                  key={o.id}
                  className={`ms-item ${checked ? 'ms-item--checked' : ''}`}
                  onClick={() => toggle(o.id)}
                >
                  <span className="ms-checkbox">
                    {checked && <RiCheckLine size={12}/>}
                  </span>
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

/* ═══════════════════════════════════════════════════════════════════
   SINGLE SELECT (course / quiz dropdowns where 1 must be picked)
   ═══════════════════════════════════════════════════════════════════ */
function SingleSelect({ value, onChange, placeholder, options }) {
  return (
    <div className="ss">
      <select
        className="ss-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <RiArrowDownSLine size={15} className="ss-chev"/>
    </div>
  );
}

/* ─────── COURSE REPORT ─────── */
function CourseReport({ courses, companies, departments, onToast }) {
  const [courseID,    setCourseID]    = useState('');
  const [companyList, setCompanyList] = useState([]);
  const [deptList,    setDeptList]    = useState([]);
  const [loading,     setLoading]     = useState('');
  const [count,       setCount]       = useState(null);
  const [counting,    setCounting]    = useState(false);

  const params = () => ({
    courseID,
    companyCode: companyList,
    department:  deptList,
  });

  const getCount = async () => {
    if (!courseID) return;
    setCounting(true);
    try {
      const r = await API.get('/reports/course', { params: params() });
      if (r.data.code === 1) setCount(r.data.data?.total ?? r.data.data?.report?.length ?? 0);
    } catch { onToast?.('Could not preview count.'); }
    setCounting(false);
  };

  const download = async (type) => {
    if (!courseID) { onToast?.('Please select a course first.'); return; }
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    const filename = `Course_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`;
    try { await downloadFile(`/reports/course/${type}`, params(), filename); }
    catch { onToast?.('Download failed. Please try again.'); }
    setLoading('');
  };

  return (
    <ReportCard icon={<RiBookOpenLine size={18}/>} iconC1="#6366F1" iconC2="#8B5CF6"
                title="Courses report" desc="Learner completion data per course">
      <Field label="Course" required>
        <SingleSelect value={courseID} onChange={(v) => { setCourseID(v); setCount(null); }}
                      placeholder="— Select course —"
                      options={courses.map(c => ({ value: c.id, label: c.name }))}/>
      </Field>
      {/* <Field label="Companies">
        <MultiSelect options={companies} value={companyList} onChange={setCompanyList}
                     placeholder="All companies"/>
      </Field>
      <Field label="Departments">
        <MultiSelect options={departments} value={deptList} onChange={setDeptList}
                     placeholder="All departments"/>
      </Field> */}

      {courseID && (
        <button className="rpt-count-btn" onClick={getCount} disabled={counting}>
          <RiFilterLine size={13}/>
          {counting ? 'Counting…' : count !== null ? `${count.toLocaleString('en-IN')} records found` : 'Preview count'}
        </button>
      )}

      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ─────── QUIZ REPORT ─────── */
function QuizReport({ quizzes, companies, onToast }) {
  const [quizID,      setQuizID]      = useState('');
  const [companyList, setCompanyList] = useState([]);
  const [loading,     setLoading]     = useState('');
  const [count,       setCount]       = useState(null);
  const [counting,    setCounting]    = useState(false);

  const params = () => ({ quizID, companyCode: companyList });

  const getCount = async () => {
    if (!quizID) return;
    setCounting(true);
    try {
      const r = await API.get('/reports/quiz', { params: params() });
      if (r.data.code === 1) setCount(r.data.data?.total ?? r.data.data?.report?.length ?? 0);
    } catch { onToast?.('Could not preview count.'); }
    setCounting(false);
  };

  const download = async (type) => {
    if (!quizID) { onToast?.('Please select a quiz first.'); return; }
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    const filename = `Quiz_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`;
    try { await downloadFile(`/reports/quiz/${type}`, params(), filename); }
    catch { onToast?.('Download failed. Please try again.'); }
    setLoading('');
  };

  return (
    <ReportCard icon={<RiAwardLine size={18}/>} iconC1="#F59E0B" iconC2="#EF4444"
                title="Quiz report" desc="Quiz scores and performance">
      <Field label="Quiz" required>
        <SingleSelect value={quizID} onChange={(v) => { setQuizID(v); setCount(null); }}
                      placeholder="— Select quiz —"
                      options={quizzes.map(q => ({ value: q.id, label: q.title || q.name }))}/>
      </Field>
      {/* <Field label="Companies">
        <MultiSelect options={companies} value={companyList} onChange={setCompanyList}
                     placeholder="All companies"/>
      </Field> */}

      {quizID && (
        <button className="rpt-count-btn" onClick={getCount} disabled={counting}>
          <RiFilterLine size={13}/>
          {counting ? 'Counting…' : count !== null ? `${count.toLocaleString('en-IN')} records found` : 'Preview count'}
        </button>
      )}

      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ─────── FEEDBACK REPORT ─────── */
function FeedbackReport({ courses, onToast }) {
  const [courseID, setCourseID] = useState('');
  const [loading,  setLoading]  = useState('');

  const download = async (type) => {
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    const filename = `Feedback_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`;
    try { await downloadFile(`/reports/feedback/${type}`, { courseID }, filename); }
    catch { onToast?.('Download failed. Please try again.'); }
    setLoading('');
  };

  return (
    <ReportCard icon={<RiChat3Line size={18}/>} iconC1="#A78BFA" iconC2="#8B5CF6"
                title="Feedback report" desc="Course ratings and learner comments">
      <Field label="Course">
        <SingleSelect value={courseID} onChange={setCourseID}
                      placeholder="All courses"
                      options={courses.map(c => ({ value: c.id, label: c.name }))}/>
      </Field>
      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ─────── INTERVIEW REPORT ─────── */
function InterviewReport({ onToast }) {
  const [interviews, setInterviews] = useState([]);
  const [interviewID, setInterviewID] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/Webservice/getInterviewDetails');
        if (res.data.code === 1) setInterviews(res.data.data || []);
      } catch {}
    })();
  }, []);

  const download = async (type) => {
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    const filename = `Interview_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`;
    try { await downloadFile(`/reports/interview/${type}`, { interviewID }, filename); }
    catch { onToast?.('Download failed. Please try again.'); }
    setLoading('');
  };

  // return (
  //   <ReportCard icon={<RiVideoLine size={18}/>} iconC1="#06B6D4" iconC2="#0891B2"
  //               title="Interview report" desc="Video interview submissions and response tracking">
  //     <Field label="Interview">
  //       <SingleSelect value={interviewID} onChange={setInterviewID}
  //                     placeholder="All interviews"
  //                     options={interviews.map(i => ({ value: i.id, label: i.name }))}/>
  //     </Field>
  //     <DownloadButtons loading={loading} onDownload={download}/>
  //   </ReportCard>
  // );
}

/* ─────── LEARNER REPORT ─────── */
function LearnerReport({ companies, departments, onToast }) {
  const [companyList, setCompanyList] = useState([]);
  const [deptList,    setDeptList]    = useState([]);
  const [loading,     setLoading]     = useState('');
  const [count,       setCount]       = useState(null);
  const [counting,    setCounting]    = useState(false);

  const params = () => ({ companyCode: companyList, department: deptList });

  const getCount = async () => {
    setCounting(true);
    try {
      const r = await API.get('/reports/learner', { params: params() });
      if (r.data.code === 1) setCount(r.data.data?.total ?? r.data.data?.report?.length ?? 0);
    } catch { onToast?.('Could not preview count.'); }
    setCounting(false);
  };

  const download = async (type) => {
    setLoading(type);
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    const filename = `Learner_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`;
    try { await downloadFile(`/reports/learner/${type}`, params(), filename); }
    catch { onToast?.('Download failed. Please try again.'); }
    setLoading('');
  };

  // return (
  //   <ReportCard icon={<RiUser3Line size={18}/>} iconC1="#06B6D4" iconC2="#0EA5E9"
  //               title="Learner report" desc="Individual learner progress across all courses" wide>
  //     <div className="rpt-fields rpt-fields--2">
  //       <Field label="Companies">
  //         <MultiSelect options={companies} value={companyList}
  //                      onChange={(v) => { setCompanyList(v); setCount(null); }}
  //                      placeholder="All companies"/>
  //       </Field>
  //       <Field label="Departments">
  //         <MultiSelect options={departments} value={deptList}
  //                      onChange={(v) => { setDeptList(v); setCount(null); }}
  //                      placeholder="All departments"/>
  //       </Field>
  //     </div>

  //     <button className="rpt-count-btn" onClick={getCount} disabled={counting}>
  //       <RiFilterLine size={13}/>
  //       {counting ? 'Counting…' : count !== null ? `${count.toLocaleString('en-IN')} records found` : 'Preview count'}
  //     </button>

  //     <DownloadButtons loading={loading} onDownload={download}/>
  //   </ReportCard>
  // );
}

/* ─────── MATRIX REPORT (THE BIG ONE — like old code) ─────── */
function MatrixReport({ courses, companies, departments, verticals, branches, onToast }) {
  const [courseList,  setCourseList]  = useState([]);
  const [companyList, setCompanyList] = useState([]);
  const [deptList,    setDeptList]    = useState([]);
  const [verticalList,setVerticalList]= useState([]);
  const [branchList,  setBranchList]  = useState([]);
  const [loading,     setLoading]     = useState('');

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
    const ext      = type === 'excel' ? 'xlsx' : 'pdf';
    const filename = `Candidate_Courses_Matrix_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.${ext}`;
    try { await downloadFile(endpoint, params(), filename); }
    catch { onToast?.('Download failed. Please try again.'); }
    setLoading('');
  };

  const courseOptions = courses.map(c => ({ id: String(c.id), name: c.name }));

  return (
    <ReportCard icon={<RiGridLine size={18}/>} iconC1="#10B981" iconC2="#059669"
                title="Matrix report" desc="Candidate × Courses matrix — ECR live data" wide featured>
      {/* <div className="rpt-info">
        <RiInformationLine size={14}/>
        <span>EmpCode · Name · Email · Company · Vertical · Dept · DOJ · Location · Designation · RM · FH · Course · Mode · Completion · Score</span>
      </div> */}

      <div className="rpt-fields rpt-fields--3">
        <Field label="Courses">
          <MultiSelect options={courseOptions} value={courseList} onChange={setCourseList}
                       placeholder="All courses"/>
        </Field>
        <Field label="Companies">
          <MultiSelect options={companies} value={companyList} onChange={setCompanyList}
                       placeholder="All companies"/>
        </Field>
        <Field label="Departments">
          <MultiSelect options={departments} value={deptList} onChange={setDeptList}
                       placeholder="All departments"/>
        </Field>
        <Field label="Verticals">
          <MultiSelect options={verticals} value={verticalList} onChange={setVerticalList}
                       placeholder="All verticals"/>
        </Field>
        <Field label="Branches / Locations">
          <MultiSelect options={branches} value={branchList} onChange={setBranchList}
                       placeholder="All branches"/>
        </Field>
      </div>

      <DownloadButtons loading={loading} onDownload={download}/>
    </ReportCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */
function ReportCard({ icon, iconC1, iconC2, title, desc, children, wide, featured }) {
  return (
    <article className={`rpt-card ${wide ? 'rpt-card--wide' : ''} ${featured ? 'rpt-card--featured' : ''}`}
             style={{ '--c1': iconC1, '--c2': iconC2 }}>
      <header className="rpt-head">
        <div className="rpt-icon">
          <span className="rpt-icon-bg"/>
          {icon}
        </div>
        <div>
          <h3 className="rpt-title">{title}</h3>
          <p className="rpt-desc">{desc}</p>
        </div>
      </header>
      {children}
    </article>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="rpt-field">
      <label className="rpt-label">
        {label}
        {required && <span className="rpt-req">*</span>}
      </label>
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

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const { courses, companies, departments, verticals, branches, quizzes, loading } = useFilters();
  const { toast, show } = useToast();

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* Hero */}
      <header className="rpt-hero">
        <div className="rpt-eyebrow">Insights</div>
        <h1 className="rpt-h1">Reports.</h1>
        <p className="rpt-sub">
          {loading
            ? 'Loading filter options from ECR…'
            : (companies.length === 0 && departments.length === 0)
              ? 'ECR is unreachable — filters may not load. Reports can still be downloaded.'
              : `${courses.length} courses · ${companies.length} companies · ${departments.length} departments · ${verticals.length} verticals.`
          }
        </p>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`rpt-toast rpt-toast--${toast.type}`}>
          <RiAlertLine size={14}/>
          <span>{toast.text}</span>
        </div>
      )}

      {/* ECR status warning */}
      {!loading && companies.length === 0 && (
        <div className="rpt-warn rpt-warn--page">
          <RiAlertLine size={14}/>
          <span>Could not load filters from ECR. Multi-select dropdowns will be empty. Downloads still work — server-side will use all data.</span>
        </div>
      )}

      {/* Reports grid */}
      <div className="rpt-grid">
        <CourseReport   courses={courses}   companies={companies} departments={departments} onToast={show}/>
        <QuizReport     quizzes={quizzes}   companies={companies} onToast={show}/>
        <FeedbackReport courses={courses}   onToast={show}/>
        <InterviewReport onToast={show}/>
      </div>

      <div className="rpt-spacer"/>
      <LearnerReport companies={companies} departments={departments} onToast={show}/>

      <div className="rpt-spacer"/>
      <MatrixReport
        courses={courses}
        companies={companies}
        departments={departments}
        verticals={verticals}
        branches={branches}
        onToast={show}
      />
    </AppShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════ */
const CSS = `
/* ── Hero ── */
.rpt-hero {
  margin-bottom: var(--s-7);
  animation: rptFadeUp 600ms var(--ease-out);
}
.rpt-eyebrow { font-size: var(--text-sm); color: var(--text-3); font-weight: 500; margin-bottom: 6px; }
.rpt-h1 {
  font-family: var(--font-display);
  font-size: var(--text-4xl); font-weight: 400;
  letter-spacing: -0.03em; color: var(--text);
  margin: 0 0 8px; line-height: 1;
}
.rpt-sub { font-size: var(--text-md); color: var(--text-2); margin: 0; max-width: 600px; line-height: 1.5; }

/* ── Toast ── */
.rpt-toast {
  display: flex; align-items: center; gap: var(--s-2);
  padding: 11px var(--s-4); border-radius: var(--r-md);
  font-size: var(--text-sm); font-weight: 500;
  margin-bottom: var(--s-4);
  animation: rptFadeUp 300ms var(--ease-out);
}
.rpt-toast--err { background: var(--danger-soft); color: var(--danger); }
.rpt-toast--ok  { background: var(--success-soft); color: var(--success); }

.rpt-warn {
  display: flex; align-items: center; gap: var(--s-2);
  padding: 9px 12px; background: var(--warning-soft); color: var(--warning);
  border-radius: var(--r-md); font-size: var(--text-xs); font-weight: 500;
}
.rpt-warn--page { margin-bottom: var(--s-4); }

/* ── Cards ── */
.rpt-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
.rpt-card {
  background: var(--surface); border-radius: var(--r-lg);
  padding: var(--s-5); box-shadow: var(--shadow-sm), var(--ring);
  display: flex; flex-direction: column; gap: var(--s-3);
  animation: rptFadeUp 500ms var(--ease-out) both;
  transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
}
.rpt-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md), var(--ring); }
.rpt-card--wide { grid-column: 1 / -1; }
.rpt-card--featured {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 4%, var(--surface)), var(--surface));
  box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--accent-soft-2);
}
.rpt-spacer { height: var(--s-4); }

/* ── Card head ── */
.rpt-head { display: flex; align-items: flex-start; gap: var(--s-3); }
.rpt-icon {
  position: relative; width: 36px; height: 36px;
  border-radius: 10px; display: grid; place-items: center;
  flex-shrink: 0; color: #fff;
}
.rpt-icon-bg {
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(135deg, var(--c1), var(--c2));
  box-shadow: 0 4px 12px color-mix(in srgb, var(--c1) 30%, transparent);
}
.rpt-icon > svg { position: relative; z-index: 1; }
.rpt-title {
  font-family: var(--font-display); font-size: var(--text-xl);
  font-weight: 400; letter-spacing: -0.025em;
  color: var(--text); margin: 0; line-height: 1.1;
}
.rpt-desc { font-size: var(--text-xs); color: var(--text-3); margin: 4px 0 0; line-height: 1.5; font-weight: 500; }

/* ── Fields ── */
.rpt-fields { display: flex; flex-direction: column; gap: var(--s-3); }
.rpt-fields--2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
.rpt-fields--3 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s-3); }
.rpt-field { display: flex; flex-direction: column; gap: 5px; }
.rpt-label { font-size: var(--text-xs); font-weight: 600; color: var(--text-2); }
.rpt-req { color: var(--danger); margin-left: 3px; }

/* ── Single Select ── */
.ss { position: relative; }
.ss-select {
  width: 100%; padding: 9px 32px 9px 12px;
  background: var(--surface-2); border: 1px solid transparent;
  border-radius: var(--r-md);
  font-family: inherit; font-size: var(--text-base); color: var(--text);
  cursor: pointer; outline: none; appearance: none;
  transition: all var(--duration-fast) var(--ease);
}
.ss-select:hover  { background: var(--surface-3); }
.ss-select:focus  { background: var(--surface); border-color: var(--accent); box-shadow: var(--ring-focus); }
.ss-chev { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: var(--text-3); pointer-events: none; }

/* ═══ MULTI-SELECT ═══ */
.ms { position: relative; z-index: 1; }
.ms:focus-within { z-index: 100; }
.ms-trigger {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  gap: var(--s-2); padding: 9px 12px;
  background: var(--surface-2); border: 1px solid transparent;
  border-radius: var(--r-md); cursor: pointer;
  font-family: inherit; font-size: var(--text-base); color: var(--text);
  outline: none; transition: all var(--duration-fast) var(--ease);
  text-align: left;
}
.ms-trigger:hover { background: var(--surface-3); }
.ms-trigger--open {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: var(--ring-focus);
}
.ms-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.ms-text--placeholder { color: var(--text-3); font-weight: 400; }
.ms-chev { color: var(--text-3); transition: transform var(--duration-fast) var(--ease); flex-shrink: 0; }
.ms-chev--open { transform: rotate(180deg); color: var(--accent); }

/* Popover */
.ms-pop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border-strong);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  animation: msPop 150ms var(--ease-out);
  max-height: 320px; display: flex; flex-direction: column;
  overflow: hidden;
}
@keyframes msPop {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ms-search {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 11px; border-bottom: 1px solid var(--border);
  color: var(--text-3);
}
.ms-search input {
  flex: 1; background: transparent; border: none; outline: none;
  font-family: inherit; font-size: var(--text-base); color: var(--text);
}
.ms-search input::placeholder { color: var(--text-3); }
.ms-search-clear {
  background: none; border: none; padding: 2px; color: var(--text-3);
  display: grid; place-items: center; cursor: pointer; border-radius: 4px;
}
.ms-search-clear:hover { color: var(--text); background: var(--surface-2); }

.ms-actions {
  display: flex; gap: 0;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.ms-action {
  flex: 1;
  padding: 5px 10px;
  background: transparent; border: none;
  font-family: inherit; font-size: var(--text-xs); font-weight: 600;
  color: var(--accent);
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: -0.005em;
  transition: background var(--duration-fast) var(--ease);
}
.ms-action:hover { background: var(--accent-soft); }

.ms-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.ms-empty {
  padding: var(--s-5) var(--s-4); text-align: center;
  color: var(--text-3); font-size: var(--text-xs);
}

.ms-item {
  width: 100%; display: flex; align-items: center; gap: var(--s-2);
  padding: 7px 8px; background: transparent; border: none;
  font-family: inherit; font-size: var(--text-base); color: var(--text);
  text-align: left; cursor: pointer; border-radius: 6px;
  transition: background var(--duration-fast) var(--ease);
}
.ms-item:hover { background: var(--surface-2); }
.ms-item--checked { background: var(--accent-soft); color: var(--accent); font-weight: 600; }

.ms-checkbox {
  width: 16px; height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--border-strong);
  background: var(--surface);
  display: grid; place-items: center;
  color: #fff;
  flex-shrink: 0;
  transition: all var(--duration-fast) var(--ease);
}
.ms-item--checked .ms-checkbox {
  background: var(--accent);
  border-color: var(--accent);
}

.ms-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Info / state strips ── */
.rpt-info {
  display: flex; align-items: center; gap: var(--s-2);
  padding: 9px 12px; background: var(--info-soft); color: var(--info);
  border-radius: var(--r-md); font-size: var(--text-xs); font-weight: 500; line-height: 1.5;
}

/* ── Count button ── */
.rpt-count-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--r-md);
  font-family: inherit; font-size: var(--text-xs); font-weight: 600;
  color: var(--text); cursor: pointer; align-self: flex-start;
  transition: all var(--duration-fast) var(--ease);
}
.rpt-count-btn:hover:not(:disabled) { background: var(--surface-3); border-color: var(--border-strong); }
.rpt-count-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Action buttons ── */
.rpt-actions { display: flex; gap: var(--s-2); flex-wrap: wrap; margin-top: 4px; }
.rpt-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border: 1px solid transparent; border-radius: var(--r-md);
  font-family: inherit; font-size: var(--text-base); font-weight: 600;
  cursor: pointer; transition: all var(--duration-fast) var(--ease);
}
.rpt-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.rpt-btn:active:not(:disabled) { transform: scale(0.98); }

.rpt-btn--excel {
  background: var(--accent); color: var(--accent-text);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent);
}
.rpt-btn--excel:hover:not(:disabled) {
  background: var(--accent-hover); transform: translateY(-1px);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 45%, transparent);
}
.rpt-btn--pdf {
  background: var(--surface-2); color: var(--text); border-color: var(--border-strong);
}
.rpt-btn--pdf:hover:not(:disabled) { background: var(--surface-3); transform: translateY(-1px); }

/* ── Animations ── */
@keyframes rptFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.rpt-grid > .rpt-card:nth-child(1) { animation-delay: 0ms; }
.rpt-grid > .rpt-card:nth-child(2) { animation-delay: 80ms; }
.rpt-grid > .rpt-card:nth-child(3) { animation-delay: 160ms; }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .rpt-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 780px) {
  .rpt-grid { grid-template-columns: 1fr; }
  .rpt-fields--2, .rpt-fields--3 { grid-template-columns: 1fr; }
  .rpt-h1 { font-size: var(--text-3xl); }
}
`;
