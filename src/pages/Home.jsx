import { Link } from 'react-router-dom'
import { Droplet, Shield, ArrowRight } from 'lucide-react'

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-light to-accent/20">
      {/* Navbar */}
      <nav className="bg-primary shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Droplet className="h-6 w-6 text-white" />
              <span className="text-white font-bold text-lg sm:text-xl">Angel's Admin Portal</span>
            </div>
            <div className="text-white/80 text-sm hidden md:flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {/* Changed py-20 to py-10 for mobile so it doesn't push content off-screen */}
      <section className="min-h-[calc(100vh-4rem)] flex items-center py-10 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            
            {/* Left Content */}
            <div className="space-y-6 animate-fade-in text-center lg:text-left mt-4 lg:mt-0">
              <div className="inline-flex items-center space-x-2 bg-white/40 md:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm md:shadow-none">
                <span className="w-2 h-2 bg-green-500 md:bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-primary-dark font-bold md:font-semibold text-sm">v2.0.4 Live</span>
              </div>

              {/* Responsive text: 4xl on mobile, 5xl on desktop */}
              <h1 className="text-4xl md:text-5xl font-bold text-text-dark leading-tight">
                Shop Management System
              </h1>
              
              {/* Responsive text: text-base on mobile, xl on desktop */}
              <p className="text-base md:text-xl text-gray-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Centralized control for your dry cleaning business. <br className="hidden md:block" />
                Track daily logistics, staff expenses, and revenue.
              </p>

              {/* Stats Row - Flex layout fixed for mobile screens */}
              <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-8 pt-6">
                <div className="text-center lg:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-primary mb-1">100%</h3>
                  <small className="text-gray-600 font-medium text-xs sm:text-sm uppercase tracking-wide">Secure Data</small>
                </div>
                
                <div className="w-px h-10 bg-gray-300"></div> {/* Divider */}
                
                <div className="text-center lg:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-primary mb-1">24/7</h3>
                  <small className="text-gray-600 font-medium text-xs sm:text-sm uppercase tracking-wide">Uptime</small>
                </div>
                
                <div className="w-px h-10 bg-gray-300"></div> {/* Divider */}
                
                <div className="text-center lg:text-left">
                  <h3 className="text-2xl md:text-3xl font-bold text-primary mb-1">Cloud</h3>
                  <small className="text-gray-600 font-medium text-xs sm:text-sm uppercase tracking-wide">Auto-Backup</small>
                </div>
              </div>
            </div>

            {/* Right Card */}
            <div className="card p-6 sm:p-8 shadow-xl border border-white/50 bg-white/95 backdrop-blur-sm animate-slide-up mt-8 lg:mt-0">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ring-4 ring-white shadow-sm">
                  <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>

                <h4 className="text-xl sm:text-2xl font-bold mb-2 text-text-dark">Owner Access</h4>
                <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 font-medium">Identify yourself to enter the dashboard.</p>

                <div className="space-y-3 sm:space-y-4">
                  <Link
                    to="/login"
                    className="btn-primary w-full flex items-center justify-center space-x-2 py-3.5 text-base sm:text-lg font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <span>Log In to Dashboard</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-400 font-bold cursor-not-allowed text-sm sm:text-base"
                  >
                    Staff Login (Disabled)
                  </button>
                </div>

                <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-100">
                  <div className="bg-blue-50/50 border border-blue-100 p-3 sm:p-4 rounded-xl text-left">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                          <strong>Notice:</strong> Server maintenance scheduled for Sunday (2:00 AM).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home