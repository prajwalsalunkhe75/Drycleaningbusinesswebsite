import axios from 'axios'

// ==========================================
// CONFIGURATION: Smart base URL detection
// ==========================================
// In development (Vite dev server), proxy is used so relative URL works.
// In production, the Express server serves both API and frontend.
// For ngrok/remote access, set VITE_API_URL in your .env file.
const getBaseURL = () => {
  // For production on Replit, use the backend URL explicitly
  if (import.meta.env.PROD) {
    return 'https://e24fbeaf-b042-4f59-abbb-23ca3343f799-00-upza3ll3riqy.pike.replit.dev/api'
  }
  // Check for explicit override via environment variable
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`
  }
  // Default for development: use relative URL (works with Vite proxy)
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    // Bypass ngrok's warning page (only needed when using ngrok)
    'ngrok-skip-browser-warning': '69420'
  }
})

// ==========================================
// SECURITY INTERCEPTOR (Attach Token)
// ==========================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ==========================================
// RESPONSE INTERCEPTOR (Auto-logout on expired token)
// ==========================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If server returns 401 or 403, token is invalid/expired — auto logout
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('isAuthenticated')
      // Redirect to login page
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ==========================================
// API ENDPOINTS
// ==========================================

// Orders API
export const ordersAPI = {
  getAll: (page = 1, limit = 10) => api.get('/orders', { params: { page, limit } }),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
}

// Customers API
export const customersAPI = {
  getAll: (page = 1, limit = 10) => api.get('/customers', { params: { page, limit } }),
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

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  save: (data) => api.post('/settings', data),
}

// Workers API
export const workersAPI = {
  getAll: () => api.get('/workers'),
  create: (name) => api.post('/workers', { name }),
  delete: (id) => api.delete(`/workers/${id}`),
}

// AI API
export const aiAPI = {
  parseVoice: (text, apiKey) => api.post('/ai/parse-voice', { text, apiKey }),
}

export default api