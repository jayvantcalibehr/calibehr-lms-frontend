/**
 * Central NAV config — sidebar visibility per role.
 * Matches OLD CodeIgniter project's header.php exactly.
 *
 * Roles legend:
 *   1 = Admin     2 = Trainer    3 = Employee
 *   4 = Quiz Master   5 = Interviewer    6 = HR Recruiter
 *
 * Visibility rules (from old project's header.php):
 *   Dashboard, Courses, Leaderboard, Settings → all roles
 *   Categories                                → Admin + Trainer
 *   Manage Courses                            → Admin + Trainer
 *   Quiz                                      → Admin + Quiz Master + HR Recruiter
 *   Interviews                                → Admin + Interviewer + HR Recruiter
 *   Reports                                   → Admin only
 *
 * Note: Employees do NOT see Quiz/Interview tabs.
 * They take quizzes/interviews via PUBLIC INVITE LINKS (email).
 */

const MAIN_NAV = [
  { key: 'dashboard',   icon: 'FiBarChart2',  label: 'Dashboard',   path: '/dashboard',
    roles: [1,2,3,4,5,6] },

  { key: 'courses',     icon: 'FiBook',       label: 'Courses',     path: '/courses',
    roles: [1,2,3,4,5,6] },

  // Quiz — Admin (1) + Quiz Master (4) + HR Recruiter (6) only (matches old)
  { key: 'quiz',        icon: 'FiAward',      label: 'Quiz',        path: '/quiz',
    roles: [1,4,6] },

  // Interview — Admin (1) + Interviewer (5) + HR Recruiter (6) only (matches old)
  { key: 'interview',   icon: 'FiVideo',      label: 'Interviews',  path: '/interview',
    roles: [1,5,6] },

  { key: 'leaderboard', icon: 'FiStar',       label: 'Leaderboard', path: '/leaderboard',
    roles: [1,2,3,4,5,6] },

  // Reports — Admin only (matches old)
  { key: 'reports',     icon: 'FiTrendingUp', label: 'Reports',     path: '/reports',
    roles: [1] },

  { key: 'settings',    icon: 'FiUsers',      label: 'Settings',    path: '/settings',
    roles: [1,2,3,4,5,6] },
];

/* Admin section — Categories + Manage Courses for Admin + Trainer */
const ADMIN_NAV = [
  { key: 'admin-categories', icon: 'FiFolder', label: 'Categories',
    path: '/admin/categories', roles: [1,2] },
  { key: 'admin-courses',    icon: 'FiLayers', label: 'Manage Courses',
    path: '/admin/courses',    roles: [1,2] },
];

/**
 * Returns structured navigation menu for the current user.
 * Shape: { main: [...], admin: [...] }
 */
export function getNavItems(activePage) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  let roles = user?.role;
  if (!Array.isArray(roles)) roles = roles ? [Number(roles)] : [3];
  roles = roles.map(Number);

  // URL override for testing — same as permissions.js
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    const as = params.get('as');
    if (as === 'admin')    roles = [1];
    if (as === 'trainer')  roles = [2];
    if (as === 'user')     roles = [3];
    if (as === 'quiz')     roles = [4];
    if (as === 'reviewer') roles = [5];
    if (as === 'hr')       roles = [6];
  }

  const isAdmin = roles.includes(1);

  const main = MAIN_NAV
    .filter(n => isAdmin || n.roles.some(r => roles.includes(r)))
    .map(n => ({ ...n, active: n.key === activePage }));

  const admin = ADMIN_NAV
    .filter(n => isAdmin || n.roles.some(r => roles.includes(r)))
    .map(n => ({ ...n, active: n.key === activePage }));

  return { main, admin };
}

/* Backward compat — flat array shape */
export function getNavItemsFlat(activePage) {
  const { main, admin } = getNavItems(activePage);
  return [...main, ...admin];
}