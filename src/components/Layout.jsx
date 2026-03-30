import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserCog, 
  Settings, 
  LogOut,
  Droplet,
  Moon,
  Sun
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getDarkMode, setDarkMode } from '../utils/theme'

const Layout = ({ children, setIsAuthenticated }) => {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkModeState] = useState(() => getDarkMode())

  const handleToggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setDarkMode(newDarkMode)
    setIsDarkModeState(newDarkMode)
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('adminToken')
    setIsAuthenticated(false)
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { path: '/orders', icon: FileText, label: 'Drycleaning' },
    { path: '/customers', icon: Users, label: 'Monthly Billing' },
    { path: '/workers', icon: UserCog, label: 'Worker Wages' },
    { path: '/settings', icon: Settings, label: 'Setting' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-bg-page dark:bg-slate-900">
      {/* Navbar */}
      <nav className="bg-primary dark:bg-slate-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Droplet className="h-6 w-6 text-white" />
              <span className="text-white font-bold text-xl">Angel's Admin</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-white text-primary'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}

              {/* Dark Mode Toggle */}
              <button
                onClick={handleToggleDarkMode}
                className="ml-2 p-2 text-white hover:bg-white/10 rounded-lg transition-all"
                aria-label="Toggle dark mode"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="ml-4 flex items-center space-x-2 px-4 py-2 rounded-full border border-white/30 text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <button
                onClick={handleToggleDarkMode}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-all"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white p-2"
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-primary-dark dark:bg-slate-700 border-t border-white/10">
              <div className="px-4 py-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        isActive(item.path)
                          ? 'bg-white text-primary'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                })}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-all"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 dark:text-gray-100">
          {children}
        </main>
      </div>
    )
  }

  export default Layout
