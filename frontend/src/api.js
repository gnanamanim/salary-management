import axios from 'axios';

// All requests go through /api (proxied to the backend in dev).
const api = axios.create({ baseURL: '/api' });

// Attach the JWT to every request if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the session and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
};

export const employees = {
  list: (params) => api.get('/employees', { params }).then((r) => r.data),
  filters: () => api.get('/employees/filters').then((r) => r.data),
  get: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  history: (id) => api.get(`/employees/${id}/salary-history`).then((r) => r.data),
  changeSalary: (id, body) => api.post(`/employees/${id}/salary`, body).then((r) => r.data),
};

export const analytics = {
  summary: () => api.get('/analytics/summary').then((r) => r.data),
  by: (dimension) => api.get(`/analytics/by/${dimension}`).then((r) => r.data),
  distribution: () => api.get('/analytics/distribution').then((r) => r.data),
  topEarners: (limit = 10) => api.get('/analytics/top-earners', { params: { limit } }).then((r) => r.data),
  payGap: () => api.get('/analytics/pay-gap').then((r) => r.data),
};

export default api;
