import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Bearer token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle token expiry globally
// If backend returns 401, token has expired or is invalid.
// Clear storage and redirect to login so user doesn't stay stuck.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop — public routes don't need auth
      const path = window.location.pathname;
      if (!path.includes('/login') &&
          !path.includes('/quiz-take') &&
          !path.includes('/interview-take')) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
