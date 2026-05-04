/**
 * ═══════════════════════════════════════════════════════════════
 * DYNAMIC ROLES — fetched from DB, cached in localStorage
 * ───────────────────────────────────────────────────────────────
 * Source of truth: roles_master table in DB
 * Endpoint: GET /api/Webservices/getAllRoles
 * Returns: [{ id, name, status, added_on }]
 *
 * Usage:
 *   import { getRoles, getRoleName, fetchRolesIfNeeded } from './roles';
 *
 *   // On app start (after login):
 *   await fetchRolesIfNeeded();
 *
 *   // Anywhere — synchronous read from cache:
 *   getRoleName(2)        // → "Trainer" (or whatever DB says)
 *   getRoles()            // → [{ id, name }, ...]
 * ═══════════════════════════════════════════════════════════════
 */

import API from '../api/axios';

const CACHE_KEY = 'lms.roles.cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let memoryCache = null;

/**
 * Returns cached roles from localStorage. May be stale or empty.
 * Returns: [{ id: number, name: string }]
 */
export function getRoles() {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    memoryCache = parsed.roles || [];
    return memoryCache;
  } catch { return []; }
}

/**
 * Returns role name by ID. Falls back gracefully:
 *   1. Cached DB role
 *   2. "Role {id}" if not cached
 */
export function getRoleName(roleId) {
  const id = Number(roleId);
  if (!id) return 'User';
  const role = getRoles().find(r => Number(r.id) === id);
  return role?.name || `Role ${id}`;
}

/**
 * Returns ALL role IDs known to DB (from cache).
 * Useful for "roles: [...all]" patterns where you want every role.
 */
export function getAllRoleIds() {
  return getRoles().map(r => Number(r.id));
}

/**
 * Fetch roles from backend and store in localStorage.
 * Call once after login, or whenever you need to refresh.
 */
export async function fetchRoles() {
  try {
    const res = await API.get('/Webservices/getAllRoles');
    if (res.data?.code === 1 && Array.isArray(res.data.data)) {
      const roles = res.data.data
        .filter(r => Number(r.status) === 1)        // active only
        .map(r => ({ id: Number(r.id), name: String(r.name).trim() }));
      const payload = { roles, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      memoryCache = roles;
      return roles;
    }
  } catch (e) {
    // network failure — keep stale cache
  }
  return getRoles();
}

/**
 * Fetch only if cache is missing or stale (older than TTL).
 * Safe to call anywhere — won't spam the API.
 */
export async function fetchRolesIfNeeded() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const age = Date.now() - (parsed.ts || 0);
      if (age < CACHE_TTL && Array.isArray(parsed.roles) && parsed.roles.length > 0) {
        memoryCache = parsed.roles;
        return parsed.roles;
      }
    }
  } catch {}
  return fetchRoles();
}

/** Force refresh — used after admin updates roles_master */
export function clearRolesCache() {
  memoryCache = null;
  localStorage.removeItem(CACHE_KEY);
}