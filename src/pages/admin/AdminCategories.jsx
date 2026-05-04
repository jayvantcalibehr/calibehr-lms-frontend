import { useEffect, useState } from 'react';
import {
  RiAddLine, RiEdit2Line, RiEyeLine, RiEyeOffLine, RiCloseLine,
  RiCheckLine, RiSearchLine, RiFolderLine, RiInboxLine,
} from 'react-icons/ri';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import { can } from '../../utils/permissions';
import { Navigate } from 'react-router-dom';

export default function AdminCategories() {
  /* ── Permission guard ── */
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace/>;
  if (!can('categories.manage')) return <Navigate to="/dashboard" replace/>;

  const [categories, setCategories] = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [formName,   setFormName]   = useState('');
  const [formImage,  setFormImage]  = useState('');
  const [toast,      setToast]      = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null); // {cat, action, message}

  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    const s = search.trim().toLowerCase();
    setFiltered(s
      ? categories.filter(c => (c.name || '').toLowerCase().includes(s))
      : categories);
  }, [categories, search]);

  const showToast = (text, type = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await API.get('/Webservice/getCategories', { params: { all: 1 } });
      if (res.data.code === 1) setCategories(res.data.data || []);
    } catch { showToast('Could not load categories', 'err'); }
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormImage('');
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setFormName(cat.name || '');
    setFormImage(cat.image_url || '');
    setShowForm(true);
  };

  const save = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        image_url: formImage.trim(),
      };
      const res = editing
        ? await API.post('/Webservice/updateCategory', { ...payload, id: editing.id })
        : await API.post('/Webservice/addCategory',    payload);

      if (res.data.code === 1) {
        setShowForm(false);
        showToast(editing ? 'Category updated' : 'Category added');
        loadCategories();
      } else {
        showToast(res.data.message || 'Save failed', 'err');
      }
    } catch { showToast('Save failed — try again', 'err'); }
    setSaving(false);
  };

  const askToggleStatus = (cat) => {
    setConfirmDlg({
      cat,
      action: cat.status === 1 ? 'disable' : 'enable',
      message: cat.status === 1
        ? `Disable "${cat.name}"? Courses under it will be hidden from learners.`
        : `Enable "${cat.name}"?`,
    });
  };

  const doToggleStatus = async () => {
    if (!confirmDlg) return;
    const { cat, action } = confirmDlg;
    const endpoint = action === 'disable' ? 'disableCategory' : 'enableCategory';
    setConfirmDlg(null);
    try {
      const res = await API.post(`/Webservice/${endpoint}`, { id: cat.id });
      if (res.data.code === 1) {
        showToast(action === 'disable' ? 'Category disabled' : 'Category enabled');
        loadCategories();
      }
    } catch { showToast('Action failed', 'err'); }
  };

  const activeCount   = categories.filter(c => c.status === 1).length;
  const disabledCount = categories.length - activeCount;

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* Hero */}
      <header className="cat-hero">
        <div>
          <div className="cat-eyebrow">Admin · Catalog</div>
          <h1 className="cat-title">Categories.</h1>
          <p className="cat-sub">
            {loading
              ? 'Loading…'
              : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'} · ${activeCount} active · ${disabledCount} disabled.`
            }
          </p>
        </div>
        <button className="cat-add-btn" onClick={openAdd}>
          <RiAddLine size={15}/>
          New category
        </button>
      </header>

      {/* Search */}
      <div className="cat-search">
        <RiSearchLine size={14}/>
        <input
          type="text"
          placeholder="Search categories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="cat-search-clear" onClick={() => setSearch('')}>
            <RiCloseLine size={13}/>
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`cat-toast cat-toast--${toast.type}`}>
          {toast.type === 'ok' ? <RiCheckLine size={14}/> : <RiCloseLine size={14}/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* States / Table */}
      {loading ? (
        <div className="cat-state">Loading categories…</div>
      ) : filtered.length === 0 ? (
        <div className="cat-empty">
          <div className="cat-empty-icon">
            {search ? <RiSearchLine size={26}/> : <RiInboxLine size={26}/>}
          </div>
          <div className="cat-empty-title">
            {search ? 'No matches found' : 'No categories yet'}
          </div>
          <div className="cat-empty-sub">
            {search ? 'Try a different search term.' : 'Create your first category to organize courses.'}
          </div>
          {!search && (
            <button className="cat-add-btn cat-add-btn--inline" onClick={openAdd}>
              <RiAddLine size={14}/>
              Create category
            </button>
          )}
        </div>
      ) : (
        <article className="cat-card">
          <table className="cat-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}/>
                <th>Name</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 180, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat, i) => (
                <tr key={cat.id} style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}>
                  <td>
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="cat-img"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="cat-img cat-img--empty">
                        <RiFolderLine size={16}/>
                      </div>
                    )}
                  </td>
                  <td className="cat-name">{cat.name}</td>
                  <td>
                    <span className={`cat-pill cat-pill--${cat.status === 1 ? 'on' : 'off'}`}>
                      <span className="cat-pill-dot"/>
                      {cat.status === 1 ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="cat-action" onClick={() => openEdit(cat)}>
                      <RiEdit2Line size={12}/>
                      Edit
                    </button>
                    <button
                      className={`cat-action ${cat.status === 1 ? 'cat-action--danger' : 'cat-action--success'}`}
                      onClick={() => askToggleStatus(cat)}
                    >
                      {cat.status === 1
                        ? <><RiEyeOffLine size={12}/>Disable</>
                        : <><RiEyeLine size={12}/>Enable</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal onClose={() => !saving && setShowForm(false)}>
          <div className="cat-modal-head">
            <h2 className="cat-modal-title">
              {editing ? 'Edit category' : 'New category'}
            </h2>
            <button
              className="cat-modal-close"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              <RiCloseLine size={16}/>
            </button>
          </div>

          <div className="cat-modal-body">
            <label className="cat-label">
              Category name <span className="cat-req">*</span>
            </label>
            <input
              type="text"
              className="cat-input"
              autoFocus
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Technology, Soft Skills, Compliance"
            />

            <label className="cat-label">Image URL <span className="cat-opt">optional</span></label>
            <input
              type="text"
              className="cat-input"
              value={formImage}
              onChange={e => setFormImage(e.target.value)}
              placeholder="https://example.com/category.png"
            />

            {formImage && (
              <div className="cat-preview">
                <img
                  src={formImage}
                  alt="preview"
                  onError={e => { e.target.style.opacity = 0.3; }}
                />
                <span>Preview</span>
              </div>
            )}

            <p className="cat-hint">
              Upload an image to your S3 bucket and paste the URL here.
            </p>
          </div>

          <div className="cat-modal-foot">
            <button
              className="cat-btn cat-btn--ghost"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="cat-btn cat-btn--primary"
              onClick={save}
              disabled={saving || !formName.trim()}
            >
              {saving
                ? 'Saving…'
                : (<><RiCheckLine size={14}/>{editing ? 'Update' : 'Add'}</>)
              }
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm dialog */}
      {confirmDlg && (
        <Modal onClose={() => setConfirmDlg(null)} small>
          <div className="cat-modal-body" style={{ paddingTop: 24 }}>
            <h3 className="cat-confirm-title">
              {confirmDlg.action === 'disable' ? 'Disable category?' : 'Enable category?'}
            </h3>
            <p className="cat-confirm-msg">{confirmDlg.message}</p>
          </div>
          <div className="cat-modal-foot">
            <button className="cat-btn cat-btn--ghost" onClick={() => setConfirmDlg(null)}>
              Cancel
            </button>
            <button
              className={`cat-btn ${confirmDlg.action === 'disable' ? 'cat-btn--danger' : 'cat-btn--primary'}`}
              onClick={doToggleStatus}
            >
              {confirmDlg.action === 'disable' ? 'Disable' : 'Enable'}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

/* ── Reusable Modal ── */
function Modal({ children, onClose, small }) {
  return (
    <div className="cat-overlay" onClick={onClose}>
      <div
        className={`cat-modal ${small ? 'cat-modal--small' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

const CSS = `
/* ── Hero ── */
.cat-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-4);
  margin-bottom: var(--s-5);
  flex-wrap: wrap;
  animation: catFadeUp 600ms var(--ease-out);
}
.cat-eyebrow {
  font-size: var(--text-sm);
  color: var(--text-3);
  font-weight: 500;
  margin-bottom: 6px;
}
.cat-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 400;
  letter-spacing: -0.03em;
  color: var(--text);
  margin: 0 0 6px;
  line-height: 1;
}
.cat-sub {
  font-size: var(--text-md);
  color: var(--text-2);
  margin: 0;
  line-height: 1.5;
}

.cat-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  border-radius: var(--r-md);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent);
  transition: all var(--duration-fast) var(--ease);
}
.cat-add-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 45%, transparent);
}
.cat-add-btn:active { transform: scale(0.98); }
.cat-add-btn--inline { margin-top: var(--s-3); }

/* ── Search ── */
.cat-search {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 10px 14px;
  background: var(--surface);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm), var(--ring);
  margin-bottom: var(--s-4);
  color: var(--text-3);
  max-width: 480px;
  animation: catFadeUp 500ms var(--ease-out) 100ms both;
}
.cat-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
}
.cat-search input::placeholder { color: var(--text-3); }
.cat-search-clear {
  background: none;
  border: none;
  padding: 2px;
  display: grid;
  place-items: center;
  color: var(--text-3);
  border-radius: 4px;
  cursor: pointer;
}
.cat-search-clear:hover { background: var(--surface-2); color: var(--text); }

/* ── Toast ── */
.cat-toast {
  position: fixed;
  top: 80px;
  right: 28px;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 11px 16px;
  border-radius: var(--r-md);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: -0.005em;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: catSlideIn 300ms var(--ease-bounce);
}
.cat-toast--ok  { background: var(--accent); color: var(--accent-text); }
.cat-toast--err { background: var(--danger); color: #fff; }
@keyframes catSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* ── States ── */
.cat-state {
  text-align: center;
  padding: var(--s-9) var(--s-4);
  color: var(--text-3);
  font-size: var(--text-sm);
}
.cat-empty {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm), var(--ring);
  padding: var(--s-9) var(--s-4);
  text-align: center;
  animation: catFadeUp 500ms var(--ease-out);
}
.cat-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-3);
  display: grid;
  place-items: center;
  margin: 0 auto var(--s-3);
}
.cat-empty-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text);
  letter-spacing: -0.025em;
  margin-bottom: 4px;
}
.cat-empty-sub {
  font-size: var(--text-sm);
  color: var(--text-3);
  max-width: 340px;
  margin: 0 auto;
}

/* ── Table ── */
.cat-card {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm), var(--ring);
  overflow: hidden;
  animation: catFadeUp 600ms var(--ease-out) 200ms both;
}
.cat-table {
  width: 100%;
  border-collapse: collapse;
}
.cat-table thead {
  background: var(--surface-2);
}
.cat-table th {
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  padding: 10px var(--s-4);
  border-bottom: 1px solid var(--border);
}
.cat-table td {
  padding: 12px var(--s-4);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-base);
  color: var(--text);
  vertical-align: middle;
}
.cat-table tbody tr {
  opacity: 0;
  animation: catFadeIn 400ms var(--ease-out) forwards;
  transition: background var(--duration-fast) var(--ease);
}
.cat-table tbody tr:hover { background: var(--surface-2); }
.cat-table tbody tr:last-child td { border-bottom: none; }

.cat-img {
  width: 40px;
  height: 40px;
  border-radius: var(--r-sm);
  object-fit: cover;
  box-shadow: inset 0 0 0 1px var(--border);
}
.cat-img--empty {
  background: var(--surface-2);
  color: var(--text-3);
  display: grid;
  place-items: center;
}

.cat-name {
  font-weight: 600;
  letter-spacing: -0.005em;
  text-transform: capitalize;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 99px;
  letter-spacing: 0.02em;
}
.cat-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.cat-pill--on  { background: var(--success-soft); color: var(--success); }
.cat-pill--on  .cat-pill-dot { background: var(--success); }
.cat-pill--off { background: var(--danger-soft); color: var(--danger); }
.cat-pill--off .cat-pill-dot { background: var(--danger); }

.cat-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  margin-left: 6px;
  transition: all var(--duration-fast) var(--ease);
}
.cat-action:hover {
  background: var(--surface-3);
  color: var(--text);
}
.cat-action--danger:hover {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}
.cat-action--success:hover {
  background: var(--success-soft);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

/* ── Modal ── */
.cat-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: var(--s-4);
  z-index: 2000;
  animation: catFadeIn 200ms var(--ease-out);
}
.cat-modal {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  animation: catModalIn 280ms var(--ease-bounce);
}
.cat-modal--small { max-width: 380px; }
@keyframes catModalIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.cat-modal-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}
.cat-modal-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 400;
  letter-spacing: -0.025em;
  color: var(--text);
  margin: 0;
  line-height: 1.1;
}
.cat-modal-close {
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  color: var(--text-3);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease);
}
.cat-modal-close:hover { background: var(--surface-2); color: var(--text); }

.cat-modal-body {
  padding: 20px;
}
.cat-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-2);
  margin: 0 0 5px;
  letter-spacing: -0.005em;
}
.cat-label:not(:first-child) { margin-top: 14px; }
.cat-req { color: var(--danger); margin-left: 3px; }
.cat-opt { color: var(--text-3); font-weight: 400; margin-left: 4px; }

.cat-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text);
  outline: none;
  transition: all var(--duration-fast) var(--ease);
}
.cat-input:hover { background: var(--surface-3); }
.cat-input:focus {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: var(--ring-focus);
}

.cat-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 8px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}
.cat-preview img {
  width: 56px;
  height: 56px;
  border-radius: var(--r-sm);
  object-fit: cover;
  box-shadow: inset 0 0 0 1px var(--border);
}
.cat-preview span {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-weight: 500;
}

.cat-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin: 8px 0 0;
  line-height: 1.5;
}

.cat-modal-foot {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  display: flex;
  justify-content: flex-end;
  gap: var(--s-2);
}

.cat-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  letter-spacing: -0.005em;
  transition: all var(--duration-fast) var(--ease);
}
.cat-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.cat-btn:active:not(:disabled) { transform: scale(0.97); }

.cat-btn--primary {
  background: var(--accent);
  color: var(--accent-text);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent);
}
.cat-btn--primary:hover:not(:disabled) { background: var(--accent-hover); }

.cat-btn--ghost {
  background: var(--surface);
  border-color: var(--border-strong);
  color: var(--text);
}
.cat-btn--ghost:hover:not(:disabled) { background: var(--surface-2); }

.cat-btn--danger {
  background: var(--danger);
  color: #fff;
}
.cat-btn--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 85%, black);
}

/* Confirm dialog */
.cat-confirm-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 400;
  letter-spacing: -0.025em;
  color: var(--text);
  margin: 0 0 8px;
  line-height: 1.1;
}
.cat-confirm-msg {
  font-size: var(--text-sm);
  color: var(--text-2);
  margin: 0;
  line-height: 1.5;
}

/* ── Animations ── */
@keyframes catFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes catFadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Responsive ── */
@media (max-width: 640px) {
  .cat-title { font-size: var(--text-3xl); }
  .cat-table th, .cat-table td { padding: 10px 12px; }
  .cat-action { padding: 5px 9px; }
  .cat-action span { display: none; }
}
`;