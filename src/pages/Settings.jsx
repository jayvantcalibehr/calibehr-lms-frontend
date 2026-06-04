import { useState, useEffect } from 'react';
import {
  RiUser3Line, RiKey2Line, RiInformationLine, RiShieldUserLine,
  RiCameraLine, RiUploadLine, RiEyeLine, RiEyeOffLine,
  RiSearchLine, RiCloseLine, RiCheckLine, RiArrowLeftSLine, RiArrowRightSLine,
  RiCheckboxCircleFill, RiErrorWarningLine,
} from 'react-icons/ri';
import API from '../api/axios';
import AppShell from '../components/AppShell';
import { isAdmin } from '../utils/permissions';
import { clearRolesCache, fetchRoles } from '../utils/roles';

/* ═══════════════════════════════════════════════════════════════
   PROFILE TAB
   ═══════════════════════════════════════════════════════════════ */
function ProfileTab() {
  const [user, setUser]           = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview]     = useState(user.photo || '');
  const [toast, setToast]         = useState(null);
  const [loading, setLoading]     = useState(false);

  // Fetch fresh profile from /me AND account-info to get ECR-resolved names
  useEffect(() => {
    Promise.all([
      API.get('/me').catch(() => null),
      API.get('/auth/account-info').catch(() => null),
    ]).then(([meRes, accRes]) => {
      const me  = meRes?.data?.code  === 1 ? meRes.data.data  : {};
      const acc = accRes?.data?.code === 1 ? accRes.data.data : {};
      const merged = { ...user, ...me, ...acc,
        emp_designation: acc.designation || me.designation || me.emp_designation || user.emp_designation,
        emp_department:  acc.department  || me.department  || user.emp_department,
      };
      setUser(merged);
      localStorage.setItem('user', JSON.stringify(merged));
    });
  }, []);

  const handlePhotoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPhotoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!photoFile) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('photo', photoFile);
const base = import.meta.env.VITE_API_URL || window.location.origin + '/api';      const res = await fetch(`${base}/upload/profile-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      });
      const data = await res.json();
      if (data.code === 1) {
        const updated = { ...user, photo: data.data.url };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        setToast({ type: 'ok', text: 'Photo updated' });
        setPhotoFile(null);
      } else {
        setToast({ type: 'err', text: 'Upload failed' });
      }
    } catch { setToast({ type: 'err', text: 'Network error' }); }
    setLoading(false);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const initials = `${(user.emp_first_name || '?')[0]}${(user.emp_last_name || '')[0] || ''}`.toUpperCase();

  const fields = [
    { label: 'Employee Code', value: user.emp_code || '—' },
    { label: 'Full Name',     value: `${user.emp_first_name || ''} ${user.emp_last_name || ''}`.trim() || '—' },
    { label: 'Email',         value: user.emp_email || '—' },
    { label: 'Phone',         value: user.phone || '—' },
    { label: 'Designation',   value: user.emp_designation || user.designation || '—' },
    { label: 'Department',    value: user.department || user.emp_department || '—' },
    { label: 'Date Joined',   value: user.doj ? new Date(user.doj).toLocaleDateString('en-IN') : (user.emp_doj || '—') },
    { label: 'Location',      value: user.location || '—' },
    { label: 'On Roll',       value: user.onRoll === 1 ? 'Yes' : user.onRoll === 0 ? 'No' : '—' },
    { label: 'Auth Type',     value: user.auth_type === 'ldap' ? 'Active Directory' : 'Standard' },
  ];

  return (
    <Section
      title="Profile"
      subtitle="Your personal information"
      toast={toast}
    >
      {/* Photo card */}
      <div className="card card--row">
        <div className="avatar avatar--xl">
          {preview
            ? <img src={preview} alt="Profile" />
            : <span>{initials}</span>
          }
        </div>
        <div className="card-body">
          <div className="card-title">Profile photo</div>
          <div className="card-desc">Upload a clear photo. JPG or PNG, max 2 MB.</div>
          <div className="card-actions">
            <label className="btn btn--ghost">
              <RiCameraLine size={15}/>
              <span>Choose photo</span>
              <input type="file" accept="image/*" hidden onChange={handlePhotoChange}/>
            </label>
            {photoFile && (
              <button className="btn btn--primary" onClick={handleUpload} disabled={loading}>
                <RiUploadLine size={15}/>
                <span>{loading ? 'Uploading…' : 'Upload'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Personal details</div>
          <div className="card-desc">Synced from HR records · view-only</div>
        </div>
        <div className="info-grid">
          {fields.map(f => (
            <div key={f.label} className="info-row">
              <div className="info-label">{f.label}</div>
              <div className="info-value">{f.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PASSWORD TAB
   ═══════════════════════════════════════════════════════════════ */
function PasswordTab() {
  const [form, setForm]       = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [show, setShow]       = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const submit = async () => {
    if (form.new_password !== form.confirm_password) {
      setToast({ type: 'err', text: 'Passwords do not match' }); return;
    }
    if (form.new_password.length < 6) {
      setToast({ type: 'err', text: 'Password must be at least 6 characters' }); return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/change-password', {
        current_password: form.current_password,
        new_password:     form.new_password,
      });
      if (res.data.code === 1) {
        setToast({ type: 'ok', text: 'Password changed successfully' });
        setForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setToast({ type: 'err', text: res.data.message || 'Failed' });
      }
    } catch { setToast({ type: 'err', text: 'Network error' }); }
    setLoading(false);
  };

  if (user.auth_type === 'ldap') {
    return (
      <Section title="Password" subtitle="Account security">
        <div className="card card--info">
          <div className="info-icon"><RiShieldUserLine size={22}/></div>
          <div>
            <div className="card-title">Active Directory</div>
            <div className="card-desc">
              You sign in with Active Directory. To change your password, please contact IT.
            </div>
          </div>
        </div>
      </Section>
    );
  }

  const Field = ({ id, label, hint }) => (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      {hint && <div className="field-hint">{hint}</div>}
      <div className="field-input">
        <input
          id={id}
          type={show[id] ? 'text' : 'password'}
          className="input"
          value={form[id]}
          onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))}
          autoComplete={id === 'current_password' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          className="input-action"
          onClick={() => setShow(p => ({ ...p, [id]: !p[id] }))}
          aria-label={show[id] ? 'Hide password' : 'Show password'}
        >
          {show[id] ? <RiEyeOffLine size={15}/> : <RiEyeLine size={15}/>}
        </button>
      </div>
    </div>
  );

  return (
    <Section title="Password" subtitle="Account security" toast={toast}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Change password</div>
          <div className="card-desc">Use a strong, unique password you don't reuse elsewhere.</div>
        </div>
        <div className="form-stack">
          <Field id="current_password" label="Current password" />
          <Field id="new_password"     label="New password" hint="At least 6 characters." />
          <Field id="confirm_password" label="Confirm new password" />
        </div>
        <div className="card-foot">
          <button className="btn btn--primary" onClick={submit} disabled={loading}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT INFO TAB
   ═══════════════════════════════════════════════════════════════ */
function AccountTab() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/auth/account-info')
      .then(r => { if (r.data.code === 1) setInfo(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Section title="Account" subtitle="Full account record">
      <div className="card">
        <div className="card-head">
          <div className="card-title">Account information</div>
          <div className="card-desc">Live data from your authenticated session.</div>
        </div>
        {loading
          ? <div className="empty">Loading…</div>
          : info
            ? (
              <div className="info-grid">
                {Object.entries(info).filter(([k]) => k !== 'token').map(([k, v]) => (
                  <div key={k} className="info-row">
                    <div className="info-label">{k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                    <div className="info-value">{Array.isArray(v) ? v.join(', ') : (v ?? '—').toString() || '—'}</div>
                  </div>
                ))}
              </div>
            )
            : <div className="empty">Could not load account info.</div>
        }
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   USER MANAGEMENT TAB (Admin only)
   ═══════════════════════════════════════════════════════════════ */
function UserManagementTab() {
  const [users, setUsers]       = useState([]);
  const [roles, setRoles]       = useState([]);
  const [stats, setStats]       = useState({ total: 0, active: 0, admins: 0, unassigned: 0 });
  const [page, setPage]         = useState(1);
  const [perPage]               = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows]   = useState(0);

  const [loading, setLoading]   = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter]     = useState('all');
  const [editing, setEditing]   = useState(null);
  const [selRoles, setSelRoles] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [filter]);

  /* Load roles once */
  useEffect(() => {
    API.get('/Webservices/getAllRoles')
      .then(r => { if (r?.data?.code === 1) setRoles(r.data.data || []); })
      .catch(() => {});
  }, []);

  /* Load users */
  useEffect(() => {
    setLoading(true);
    API.get('/Webservices/getAllUserList', {
      params: { q: searchQuery, filter, page, per_page: perPage },
    })
      .then(r => {
        if (r?.data?.code === 1) {
          const d = r.data.data || {};
          setUsers(d.users || []);
          setStats(d.stats || { total: 0, active: 0, admins: 0, unassigned: 0 });
          setTotalPages(d.pages || 1);
          setTotalRows(d.total || 0);
        }
      })
      .catch(() => setToast({ type: 'err', text: 'Failed to load users' }))
      .finally(() => setLoading(false));
  }, [searchQuery, filter, page, perPage]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const openEdit = (u) => {
    setEditing(u);
    setSelRoles((u.roles || []).map(Number));
  };

  const toggleRole = (rid) => setSelRoles(prev =>
    prev.includes(rid) ? prev.filter(r => r !== rid) : [...prev, rid]
  );

  const saveRoles = async () => {
    if (!editing) return;
    if (editing.id === currentUser.id && !selRoles.includes(1)) {
      setToast({ type: 'err', text: 'Cannot remove your own Admin role' });
      return;
    }
    setSaving(true);
    try {
      const res = await API.post('/Webservices/setAdminRoles', {
        userID: editing.id, roles: selRoles,
      });
      if (res.data.code === 1) {
        setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, roles: selRoles } : u));
        setToast({ type: 'ok', text: `Roles updated for ${editing.fullName || editing.emp_code}` });
        setEditing(null);
        /* If admin updated their OWN roles, refresh the roles cache + their
           localStorage so sidebar/permissions reflect immediately. */
        if (editing.id === currentUser.id) {
          const updatedUser = { ...currentUser, role: selRoles };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        clearRolesCache();
        fetchRoles().catch(() => {});
      } else setToast({ type: 'err', text: res.data.message || 'Save failed' });
    } catch { setToast({ type: 'err', text: 'Network error' }); }
    setSaving(false);
  };

  const toggleStatus = async (u) => {
    const isActive = u.emp_status === 'A';
    try {
      const res = await API.post('/Webservices/toggleUserStatus', { userID: u.id });
      if (res.data.code === 1) {
        setUsers(prev => prev.map(x => x.id === u.id
          ? { ...x, emp_status: isActive ? 'I' : 'A', emp_active: isActive ? 'I' : 'A' }
          : x
        ));
        setToast({ type: 'ok', text: `User ${isActive ? 'disabled' : 'enabled'} successfully` });
      } else setToast({ type: 'err', text: res.data.message || 'Failed' });
    } catch { setToast({ type: 'err', text: 'Network error' }); }
  };

  const roleNameById = (id) => roles.find(r => r.id === Number(id))?.name || `Role ${id}`;

  const FILTERS = [
    ['all',        'All'],
    ['active',     'Active'],
    ['inactive',   'Inactive'],
    ['unassigned', 'Unassigned'],
  ];

  return (
    <Section
      title="User Management"
      subtitle="Manage roles and access"
      badge="Admin only"
      toast={toast}
    >
      {/* Stats — refined, restrained */}
      <div className="stats">
        <Stat label="Total users"  value={stats.total}      />
        <Stat label="Active"        value={stats.active}     />
        <Stat label="Admins"        value={stats.admins}     accent />
        <Stat label="Unassigned"    value={stats.unassigned} />
      </div>

      {/* Search + filters */}
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <RiSearchLine size={15} className="search-icon"/>
            <input
              className="search-input"
              placeholder="Search by name, code, or email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="search-clear" onClick={() => setSearchInput('')} aria-label="Clear">
                <RiCloseLine size={14}/>
              </button>
            )}
          </div>
          <div className="segment">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                className={`segment-btn ${filter === id ? 'segment-btn--active' : ''}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="result-bar">
          {loading
            ? 'Loading…'
            : <>Showing <strong>{users.length}</strong> of <strong>{totalRows.toLocaleString('en-IN')}</strong>
                {searchQuery && <> for <em>“{searchQuery}”</em></>}</>
          }
        </div>

        <div className="users">
          {loading ? (
            <div className="empty">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="empty">No users match your criteria.</div>
          ) : users.map(u => {
            const userRoles = (u.roles || []).map(Number);
            const inactive = u.emp_status !== 'A';
            return (
              <div key={u.id} className="user-row">
                <div className="avatar avatar--md">
                  {u.emp_photo
                    ? <img src={u.emp_photo} alt="" />
                    : <span>{(u.emp_first_name || u.fullName || '?')[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="user-main">
                  <div className="user-name">
                    {u.fullName || `${u.emp_first_name || ''} ${u.emp_last_name || ''}`.trim() || '—'}
                    {u.id === currentUser.id && <span className="tag tag--accent">You</span>}
                    {inactive && <span className="tag tag--muted">Inactive</span>}
                  </div>
                  <div className="user-meta">
                    <span>{u.emp_code}</span>
                    {u.emp_email && <><span className="dot">·</span><span>{u.emp_email}</span></>}
                    {u.emp_designation && <><span className="dot">·</span><span>{u.emp_designation}</span></>}
                  </div>
                  <div className="user-roles">
                    {userRoles.length === 0
                      ? <span className="tag tag--warn">No roles</span>
                      : userRoles.map(rid => (
                          <span key={rid} className="tag tag--role">{roleNameById(rid)}</span>
                        ))
                    }
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => openEdit(u)}>
                    Edit roles
                  </button>
                  {u.id !== currentUser.id && (
                    <button
                      className={`btn btn--sm ${inactive ? 'btn--success' : 'btn--danger'}`}
                      onClick={() => toggleStatus(u)}
                    >
                      {inactive ? 'Enable' : 'Disable'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!loading && totalPages > 1 && (
          <div className="pager">
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <RiArrowLeftSLine size={15}/> Previous
            </button>
            <div className="pager-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <RiArrowRightSLine size={15}/>
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <Modal onClose={() => !saving && setEditing(null)} title="Edit roles"
               subtitle={`${editing.fullName || ''} · ${editing.emp_code}`}>
          <div className="modal-body">
            <p className="modal-hint">
              Select one or more roles. Changes take effect on the user's next login.
            </p>
            <div className="role-list">
              {roles.map(r => {
                const checked = selRoles.includes(r.id);
                return (
                  <label key={r.id} className={`role-item ${checked ? 'role-item--checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(r.id)}
                      disabled={saving}
                    />
                    <div className="role-item-text">
                      <div className="role-item-name">{r.name}</div>
                      <div className="role-item-id">Role · {r.id}</div>
                    </div>
                    {checked && <RiCheckboxCircleFill size={18} className="role-item-tick"/>}
                  </label>
                );
              })}
            </div>
            {editing.id === currentUser.id && !selRoles.includes(1) && (
              <div className="warn">
                <RiErrorWarningLine size={16}/>
                <span>You cannot remove your own Admin role.</span>
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button className="btn btn--ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              onClick={saveRoles}
              disabled={saving || (editing.id === currentUser.id && !selRoles.includes(1))}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

function Section({ title, subtitle, badge, toast, children }) {
  return (
    <div className="section">
      <header className="section-head">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-sub">{subtitle}</p>}
        </div>
        {badge && <span className="section-badge">{badge}</span>}
      </header>

      {toast && (
        <div className={`toast toast--${toast.type}`}>
          {toast.type === 'ok'
            ? <RiCheckboxCircleFill size={16}/>
            : <RiErrorWarningLine size={16}/>}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="section-body">
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat ${accent ? 'stat--accent' : ''}`}>
      <div className="stat-value">{(value || 0).toLocaleString('en-IN')}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  /* Lock scroll while open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Close on Escape */
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <RiCloseLine size={18}/>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Settings() {
  const [tab, setTab] = useState('profile');

  const TABS = [
    { id: 'profile',  label: 'Profile',         icon: RiUser3Line,       comp: ProfileTab },
    { id: 'password', label: 'Password',        icon: RiKey2Line,        comp: PasswordTab },
    ...(isAdmin() ? [{
      id: 'users', label: 'User Management', icon: RiShieldUserLine, comp: UserManagementTab,
    }] : []),
  ];

  const Active = TABS.find(t => t.id === tab)?.comp || ProfileTab;

  return (
    <AppShell>
      <style>{CSS}</style>
      <div className="settings">
        {/* Sidebar tabs */}
        <aside className="settings-tabs">
          <nav>
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={`settings-tab ${tab === t.id ? 'settings-tab--active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <Icon size={16}/>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab content */}
        <div className="settings-pane">
          <Active />
        </div>
      </div>
    </AppShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — Apple-style minimal
   ═══════════════════════════════════════════════════════════════ */
const CSS = `
.settings {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--s-7);
  align-items: start;
}

/* ── Vertical tab list ── */
.settings-tabs {
  position: sticky;
  top: calc(var(--topbar-h) + var(--s-5));
}
.settings-tabs nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.settings-tab {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 9px 12px;
  background: transparent;
  border: none;
  color: var(--text-2);
  font-size: var(--text-sm);
  font-weight: 500;
  text-align: left;
  border-radius: var(--r-sm);
  letter-spacing: -0.01em;
  transition: all var(--duration-fast) var(--ease);
}
.settings-tab:hover { background: var(--surface-2); color: var(--text); }
.settings-tab--active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow-xs), var(--ring);
}

/* ── Section ── */
.section { display: flex; flex-direction: column; gap: var(--s-5); }
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
}
.section-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 400;
  letter-spacing: -0.025em;
  color: var(--text);
  margin: 0;
  line-height: 1.05;
}
.section-sub {
  font-size: var(--text-sm);
  color: var(--text-3);
  margin: 6px 0 0;
  font-weight: 500;
}
.section-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--r-pill);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0;
  flex-shrink: 0;
}
.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

/* ── Toast ── */
.toast {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 11px var(--s-4);
  border-radius: var(--r-md);
  font-size: var(--text-sm);
  font-weight: 500;
  animation: toastIn var(--duration-slow) var(--ease-out);
}
.toast--ok  { background: var(--success-soft); color: var(--success); }
.toast--err { background: var(--danger-soft);  color: var(--danger); }
@keyframes toastIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Card ── */
.card {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm), var(--ring);
  overflow: hidden;
}
.card--row {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  padding: var(--s-5);
}
.card--info {
  display: flex;
  align-items: flex-start;
  gap: var(--s-4);
  padding: var(--s-5);
}
.info-icon {
  width: 40px; height: 40px;
  display: grid; place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--r-md);
  flex-shrink: 0;
}
.card-head {
  padding: var(--s-5) var(--s-5) var(--s-3);
}
.card-body { flex: 1; min-width: 0; }
.card-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
}
.card-desc {
  font-size: var(--text-sm);
  color: var(--text-3);
  margin-top: 2px;
}
.card-actions {
  display: flex;
  gap: var(--s-2);
  margin-top: var(--s-3);
}
.card-foot {
  padding: var(--s-4) var(--s-5);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

/* ── Avatar ── */
.avatar {
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-text);
  display: grid; place-items: center;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
  letter-spacing: -0.01em;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar--md  { width: 40px;  height: 40px;  font-size: 14px; }
.avatar--xl  { width: 80px;  height: 80px;  font-size: 28px; }

/* ── Info grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--border);
}
.info-row {
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}
.info-row:nth-child(even) { border-right: none; }
.info-row:nth-last-child(-n+2) { border-bottom: none; }
.info-label {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-weight: 500;
  letter-spacing: 0;
}
.info-value {
  font-size: var(--text-sm);
  color: var(--text);
  margin-top: 4px;
  font-weight: 500;
  word-break: break-word;
}

/* ── Form ── */
.form-stack {
  padding: var(--s-3) var(--s-5) var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text);
}
.field-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-top: -3px;
  margin-bottom: 2px;
}
.field-input {
  position: relative;
  display: flex;
  align-items: center;
}
.input {
  width: 100%;
  padding: 10px var(--s-3);
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  font-size: var(--text-sm);
  color: var(--text);
  transition: all var(--duration-fast) var(--ease);
  outline: none;
  letter-spacing: -0.005em;
}
.input:hover { background: var(--surface-3); }
.input:focus {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: var(--ring-focus);
}
.input-action {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--text-3);
  padding: 6px;
  border-radius: var(--r-sm);
  display: grid; place-items: center;
}
.input-action:hover { color: var(--text); background: var(--surface-3); }

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: var(--r-md);
  font-size: var(--text-sm);
  font-weight: 500;
  border: 1px solid transparent;
  letter-spacing: -0.005em;
  transition: all var(--duration-fast) var(--ease);
  white-space: nowrap;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--sm { padding: 7px 12px; font-size: var(--text-xs); }
.btn--primary {
  background: var(--text);
  color: var(--text-inverse);
}
.btn--primary:hover:not(:disabled) {
  background: var(--text-2);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.btn--primary:active:not(:disabled) { transform: translateY(0); }
.btn--ghost {
  background: transparent;
  color: var(--text);
  border-color: var(--border);
}
.btn--ghost:hover:not(:disabled) {
  background: var(--surface-2);
  border-color: var(--border-strong);
}
.btn--danger {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 25%, transparent);
}
.btn--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 18%, transparent);
}
.btn--success {
  background: var(--success-soft);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 25%, transparent);
}
.btn--success:hover:not(:disabled) {
  background: color-mix(in srgb, var(--success) 18%, transparent);
}

/* ── Stats ── */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--s-3);
}
.stat {
  background: var(--surface);
  padding: var(--s-5);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm), var(--ring);
}
.stat--accent .stat-value { color: var(--accent); }
.stat-value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 400;
  color: var(--text);
  line-height: 1;
  letter-spacing: -0.025em;
}
.stat-label {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-top: var(--s-2);
  font-weight: 500;
  letter-spacing: 0;
}

/* ── Toolbar ── */
.toolbar {
  display: flex;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-4);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.search {
  position: relative;
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-3);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 9px 12px 9px 34px;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  font-size: var(--text-sm);
  color: var(--text);
  outline: none;
  transition: all var(--duration-fast) var(--ease);
}
.search-input:focus {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: var(--ring-focus);
}
.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--text-3);
  padding: 5px;
  border-radius: var(--r-sm);
  display: grid; place-items: center;
}
.search-clear:hover { color: var(--text); background: var(--surface-3); }

.segment {
  display: flex;
  background: var(--surface-2);
  border-radius: var(--r-md);
  padding: 3px;
}
.segment-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: var(--text-2);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: 7px;
  letter-spacing: -0.005em;
  transition: all var(--duration-fast) var(--ease);
}
.segment-btn:hover { color: var(--text); }
.segment-btn--active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow-xs);
}

/* ── Result bar ── */
.result-bar {
  padding: 10px var(--s-5);
  font-size: var(--text-xs);
  color: var(--text-3);
  border-bottom: 1px solid var(--border);
  font-weight: 500;
}
.result-bar strong { color: var(--text); font-weight: 600; }
.result-bar em { color: var(--text); font-style: normal; }

/* ── Users list ── */
.users {
  max-height: 520px;
  overflow-y: auto;
}
.user-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-5);
  border-bottom: 1px solid var(--border);
  transition: background var(--duration-fast) var(--ease);
}
.user-row:last-child { border-bottom: none; }
.user-row:hover { background: var(--surface-2); }
.user-main { flex: 1; min-width: 0; }
.user-name {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  flex-wrap: wrap;
  letter-spacing: -0.01em;
}
.user-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-top: 2px;
  flex-wrap: wrap;
}
.user-meta .dot { color: var(--text-3); opacity: 0.5; }
.user-roles {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

/* ── Tags ── */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: var(--r-pill);
  letter-spacing: 0;
}
.tag--role   { background: var(--accent-soft);  color: var(--accent); }
.tag--accent { background: var(--accent-soft);  color: var(--accent); }
.tag--warn   { background: var(--warning-soft); color: var(--warning); }
.tag--muted  { background: var(--surface-3);    color: var(--text-3); }

/* ── Pager ── */
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--s-3) var(--s-5);
  border-top: 1px solid var(--border);
}
.pager-info {
  font-size: var(--text-xs);
  color: var(--text-3);
}
.pager-info strong { color: var(--text); font-weight: 600; }

/* ── Empty ── */
.empty {
  text-align: center;
  padding: var(--s-8) var(--s-4);
  color: var(--text-3);
  font-size: var(--text-sm);
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 300;
  display: grid;
  place-items: center;
  padding: var(--s-4);
  animation: overlayIn var(--duration) var(--ease);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

.modal {
  background: var(--surface);
  border-radius: var(--r-xl);
  width: 100%;
  max-width: 480px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl), var(--ring);
  animation: modalIn var(--duration-slow) var(--ease-bounce);
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--s-5) var(--s-5) var(--s-4);
}
.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--text);
  letter-spacing: -0.02em;
}
.modal-sub {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-top: 4px;
}
.modal-close {
  background: transparent;
  border: none;
  color: var(--text-3);
  padding: 6px;
  border-radius: var(--r-sm);
  display: grid; place-items: center;
}
.modal-close:hover { background: var(--surface-2); color: var(--text); }

.modal-body {
  padding: 0 var(--s-5) var(--s-4);
  overflow-y: auto;
}
.modal-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin: 0 0 var(--s-3);
  line-height: 1.5;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-2);
  padding: var(--s-4) var(--s-5);
  border-top: 1px solid var(--border);
}

/* ── Role list (modal) ── */
.role-list { display: flex; flex-direction: column; gap: 6px; }
.role-item {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 11px var(--s-3);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease);
  background: var(--surface-2);
  border: 1px solid transparent;
}
.role-item:hover { background: var(--surface-3); }
.role-item--checked {
  background: var(--accent-soft);
  border-color: var(--accent);
}
.role-item input[type=checkbox] {
  width: 16px; height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}
.role-item-text { flex: 1; min-width: 0; }
.role-item-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
}
.role-item-id {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-top: 2px;
  font-family: var(--font-mono);
}
.role-item-tick { color: var(--accent); margin-left: auto; }

.warn {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 10px var(--s-3);
  background: var(--warning-soft);
  color: var(--warning);
  border-radius: var(--r-md);
  font-size: var(--text-xs);
  font-weight: 500;
  margin-top: var(--s-3);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .settings { grid-template-columns: 1fr; gap: var(--s-4); }
  .settings-tabs {
    position: static;
    overflow-x: auto;
  }
  .settings-tabs nav { flex-direction: row; }
  .settings-tab { white-space: nowrap; }
  .stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .info-grid { grid-template-columns: 1fr; }
  .info-row { border-right: none; }
  .info-row:nth-last-child(2) { border-bottom: 1px solid var(--border); }
  .stats { grid-template-columns: 1fr 1fr; }
  .toolbar { flex-direction: column; }
  .segment { overflow-x: auto; }
  .section-title { font-size: var(--text-2xl); }
  .stat-value { font-size: var(--text-2xl); }
  .user-row { flex-wrap: wrap; }
  .card-head { padding: var(--s-4); }
  .form-stack, .info-grid { padding-left: var(--s-4); padding-right: var(--s-4); }
  .info-row { padding: var(--s-3) var(--s-4); }
  .result-bar, .pager, .toolbar { padding-left: var(--s-4); padding-right: var(--s-4); }
}
`;
