import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==========================================
// NEW: SECURITY INTERCEPTOR (The "VIP Pass")
// ==========================================
api.interceptors.request.use(
  (config) => {
    // 1. Look for the token in the browser's memory
    const token = localStorage.getItem('adminToken');
    
    // 2. If it exists, attach it to the request header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
)

// ==========================================
// API ENDPOINTS
// ==========================================

// Orders API
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
}

// Customers API
export const customersAPI = {
  getAll: () => api.get('/customers'),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
}

// Worker Logs API
export const workerLogsAPI = {
  getAll: () => api.get('/worker-logs'),
  create: (data) => api.post('/worker-logs', data),
  delete: (id) => api.delete(`/worker-logs/${id}`),
}

export default api