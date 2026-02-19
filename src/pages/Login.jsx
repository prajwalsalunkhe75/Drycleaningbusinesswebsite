import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Droplet, Eye, EyeOff, ArrowLeft } from 'lucide-react' // Added Eye icons
import toast from 'react-hot-toast'

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // State for visibility
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        toast.error(data.message || 'Invalid credentials!');
      }
    } catch (error) {
      toast.error('Server error. Is the backend running?');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Handle Forgot Password Click
  const handleForgotClick = () => {
    toast('System Notice: To reset your password, please update the ADMIN_PASS variable in your server .env file and restart the backend.', {
      icon: '🔐',
      duration: 5000,
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-light to-accent/20 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center space-x-2 mb-2 sm:mb-4 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
            <Droplet className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold text-primary tracking-tight">Angel's Admin</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="card p-6 sm:p-8 shadow-xl border border-white/50 bg-white/95 backdrop-blur-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white shadow-sm">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h4 className="text-xl sm:text-2xl font-bold text-text-dark mb-1">Owner Access</h4>
            <p className="text-gray-500 text-xs sm:text-sm font-medium">Enter credentials to manage the shop.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-11 py-3 text-base"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={handleForgotClick}
                  className="text-[10px] sm:text-xs font-bold text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11 py-3 text-base"
                  placeholder="••••••"
                  required
                />
                {/* Visibility Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 flex items-center justify-center space-x-2 text-base font-bold shadow-md hover:shadow-lg transition-all mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Secure Login</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <a
              href="/"
              className="text-sm font-semibold text-gray-500 hover:text-primary transition-colors inline-flex items-center space-x-1 bg-gray-50 px-4 py-2 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Homepage</span>
            </a>
          </div>
        </div>

        <div className="text-center mt-8">
          <small className="text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} Angel's Dry Cleaners System
          </small>
        </div>
      </div>
    </div>
  )
}

export default Login