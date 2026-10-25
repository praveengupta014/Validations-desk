import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('vd_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('vd_token');
      localStorage.removeItem('vd_user');
      window.location.href = '/login';
    }
    err.friendly = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(err);
  }
);

export default api;
