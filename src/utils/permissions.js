/**
 * ═══════════════════════════════════════════════════════════════
 * RBAC — Permission system
 * ───────────────────────────────────────────────────────────────
 * Matches OLD CodeIgniter project's header.php exactly:
 *
 *   In-app pages visible per role:
 *     Categories:           Admin + Trainer
 *     Quiz Management:      Admin + Quiz Master + HR Recruiter
 *     Interview Management: Admin + Interviewer + HR Recruiter
 *     User Settings:        Admin only
 *     Reports:              Admin only
 *     Dashboard / Courses / Leaderboard: All roles
 *
 *   Quiz/Interview taking model:
 *     - Employees do NOT see Quiz/Interview tabs in app
 *     - Admin/Trainer/QuizMaster/HR send INVITE EMAIL with public link
 *     - Recipient clicks link → /quiz-take/{inviteId} (public, no login)
 *     - Submission stored under invite ID, not user ID
 * ═══════════════════════════════════════════════════════════════
 */

import { getRoleName as getDbRoleName } from './roles';

/* Role IDs match roles_master DB table — fixed. */
export const ROLES = {
  ADMIN:        1,
  TRAINER:      2,
  EMPLOYEE:     3,
  QUIZ_MASTER:  4,
  INTERVIEWER:  5,
  HR_RECRUITER: 6,
};

/**
 * Permission map — exactly mirrors old project's header.php role checks.
 * Admin (1) is NOT listed per permission — it has global bypass below.
 */
const PERMISSIONS = {
  // Dashboard — all roles
  'dashboard.view':         [ROLES.EMPLOYEE, ROLES.TRAINER, ROLES.QUIZ_MASTER, ROLES.INTERVIEWER, ROLES.HR_RECRUITER],

  // Courses (browse/take) — all roles, like old project
  'courses.view':           [ROLES.EMPLOYEE, ROLES.TRAINER, ROLES.QUIZ_MASTER, ROLES.INTERVIEWER, ROLES.HR_RECRUITER],
  'courses.enroll':         [ROLES.EMPLOYEE, ROLES.TRAINER, ROLES.QUIZ_MASTER, ROLES.INTERVIEWER, ROLES.HR_RECRUITER],

  // Categories + Manage Courses — Admin + Trainer (matches old)
  'courses.manage':         [ROLES.TRAINER],
  'categories.manage':      [ROLES.TRAINER],

  // Quiz — In-app management ONLY for Admin + Quiz Master + HR Recruiter (matches old).
  // Employees take quizzes via public invite link (/quiz-take/{inviteId}), NOT inside app.
  // No 'quiz.take' permission — quiz tab simply doesn't exist for non-managers.
  'quiz.manage':            [ROLES.QUIZ_MASTER, ROLES.HR_RECRUITER],
  'quiz.reports':           [ROLES.QUIZ_MASTER, ROLES.HR_RECRUITER],

  // Interview — In-app management ONLY for Admin + Interviewer + HR Recruiter (matches old).
  // Candidates take interviews via public invite link, NOT inside app.
  'interview.review':       [ROLES.INTERVIEWER, ROLES.HR_RECRUITER],
  'interview.manage':       [ROLES.INTERVIEWER, ROLES.HR_RECRUITER],

  // Candidates (external hiring)
  'candidates.view':        [ROLES.INTERVIEWER, ROLES.HR_RECRUITER],
  'candidates.manage':      [ROLES.HR_RECRUITER],

  // Learners — Trainer can view/assign (kept for content management workflow)
  'learners.view':          [ROLES.TRAINER],
  'learners.assign':        [ROLES.TRAINER],

  // Reports — OLD: Admin only (no other roles)
  'reports.view.own':       [],
  'reports.view.course':    [],
  'reports.view.quiz':      [],
  'reports.view.interview': [],
  'reports.view.all':       [],

  // User / role management — Admin only
  'users.view':             [],
  'users.manage':           [],

  // Leaderboard — all roles
  'leaderboard.view':       [ROLES.EMPLOYEE, ROLES.TRAINER, ROLES.QUIZ_MASTER, ROLES.INTERVIEWER, ROLES.HR_RECRUITER],

  // Settings (own profile) — all logged-in users
  'settings.own':           [ROLES.EMPLOYEE, ROLES.TRAINER, ROLES.QUIZ_MASTER, ROLES.INTERVIEWER, ROLES.HR_RECRUITER],
};

/* ─── Helpers ────────────────────────────────────────────────── */

export function getUserRoles() {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const as = params.get('as');
      if (as === 'admin')    return [ROLES.ADMIN];
      if (as === 'trainer')  return [ROLES.TRAINER];
      if (as === 'quiz')     return [ROLES.QUIZ_MASTER];
      if (as === 'reviewer') return [ROLES.INTERVIEWER];
      if (as === 'hr')       return [ROLES.HR_RECRUITER];
      if (as === 'user')     return [ROLES.EMPLOYEE];
    }

    const raw = localStorage.getItem('user');
    if (!raw) return [];
    const u = JSON.parse(raw);
    let arr = u.role;
    if (typeof arr === 'string' && arr.includes(',')) arr = arr.split(',');
    if (!Array.isArray(arr)) arr = arr ? [arr] : [];
    return arr.map(Number).filter(Boolean);
  } catch { return []; }
}

export function getPrimaryRole() {
  const roles = getUserRoles();
  if (roles.length === 0) return ROLES.EMPLOYEE;
  const priority = [ROLES.ADMIN, ROLES.TRAINER, ROLES.QUIZ_MASTER, ROLES.INTERVIEWER, ROLES.HR_RECRUITER, ROLES.EMPLOYEE];
  for (const r of priority) if (roles.includes(r)) return r;
  return roles[0];
}

export function getPrimaryRoleName() {
  return getDbRoleName(getPrimaryRole());
}

export function getUserRoleNames() {
  return getUserRoles().map(id => getDbRoleName(id));
}

/** Permission check — Admin always passes (matches old project's "if(role==1)" bypass). */
export function can(permission) {
  const roles = getUserRoles();
  if (roles.includes(ROLES.ADMIN)) return true;
  const allowed = PERMISSIONS[permission] || [];
  return roles.some(r => allowed.includes(r));
}

export function canAny(...permissions) {
  return permissions.some(p => can(p));
}

export function isAdmin() {
  return getUserRoles().includes(ROLES.ADMIN);
}

export function hasRole(...roleIds) {
  const roles = getUserRoles();
  return roleIds.some(r => roles.includes(r));
}

export function getLandingPath() {
  const primary = getPrimaryRole();
  switch (primary) {
    case ROLES.ADMIN:        return '/dashboard';
    case ROLES.TRAINER:      return '/dashboard';
    case ROLES.QUIZ_MASTER:  return '/quiz';
    case ROLES.INTERVIEWER:  return '/interview';
    case ROLES.HR_RECRUITER: return '/interview';
    case ROLES.EMPLOYEE:
    default:                 return '/dashboard';
  }
}