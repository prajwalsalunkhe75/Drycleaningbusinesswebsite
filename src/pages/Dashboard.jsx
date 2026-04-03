import { useState, useEffect } from 'react'
import { Plus, Search, DollarSign, Package, TrendingUp, TrendingDown, MessageCircle, BarChart3, Target, Calendar, ArrowUpRight, ArrowDownRight, Minus, Filter } from 'lucide-react'
import { ordersAPI, analyticsAPI } from '../utils/api'
import toast from 'react-hot-toast'
import OrderModal from '../components/OrderModal'
import { format } from 'date-fns'
import { getErrorMessage } from '../utils/errorHandler'
import { ErrorState, SkeletonLoader, EmptyState } from '../components/DataStates'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// ==========================================
// CHART COLOR PALETTE
// ==========================================
const COLORS = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  success: '#10B981',
  successLight: '#6EE7B7',
  warning: '#F59E0B',
  warningLight: '#FCD34D',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  info: '#3B82F6',
  infoLight: '#93C5FD',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gray: '#6B7280',
}

const PIE_COLORS = [COLORS.success, COLORS.danger, COLORS.warning]

// ==========================================
// COLLECTION RATE RING
// ==========================================
const CollectionRing = ({ rate }) => {
  const radius = 36
  const stroke = 7
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (rate / 100) * circumference
  const color = rate >= 75 ? COLORS.success : rate >= 50 ? COLORS.warning : COLORS.danger

  return (
    <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
      <svg width={radius * 2} height={radius * 2} className="-rotate-90">
        <circle
          stroke="currentColor"
          className="text-gray-200 dark:text-slate-700"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-800 dark:text-gray-200">{rate}%</span>
    </div>
  )
}

// ==========================================
// CHANGE INDICATOR
// ==========================================
const ChangeIndicator = ({ value, label }) => {
  if (value === 0) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus className="h-3 w-3" />{label || 'No change'}</span>
  const isPositive = value > 0
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(value)}%
      {label && <span className="text-gray-400 font-normal ml-0.5">{label}</span>}
    </span>
  )
}

// ==========================================
// CUSTOM TOOLTIP
// ==========================================
const ChartTooltip = ({ active, payload, label, prefix = '₹' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2 rounded-lg shadow-lg">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {prefix}{p.value?.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  )
}

// ==========================================
// DASHBOARD COMPONENT
// ==========================================
const Dashboard = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentPopupOrder, setPaymentPopupOrder] = useState(null)
  const [paymentPopupAmount, setPaymentPopupAmount] = useState('')
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    fetchOrders()
    fetchAnalytics()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getAll()
      const ordersData = response.data?.data || response.data || []
      const data = Array.isArray(ordersData) ? ordersData : (ordersData?.orders || [])
      setOrders(data)
      setFilteredOrders(data)
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'load orders')
      toast.error(errorMsg)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const response = await analyticsAPI.getDashboard()
      setAnalytics(response.data)
    } catch (error) {
      console.error('Analytics fetch failed:', error)
      // Don't toast error — charts just won't show
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const filterOrders = () => {
    if (!Array.isArray(orders)) return
    let filtered = orders
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id?.toString().includes(searchQuery)
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (statusFilter === 'pending') return order.status !== 'Delivered'
        if (statusFilter === 'delivered') return order.status === 'Delivered'
        if (statusFilter === 'unpaid') return order.paymentStatus !== 'Paid'
        return true
      })
    }
    setFilteredOrders(filtered)
  }

  const handlePaymentClick = (order) => {
    if (order.paymentStatus === 'Paid') {
      if (window.confirm('Mark this ticket as Unpaid?')) {
        updatePayment(order, 'Unpaid', 0)
      }
    } else {
      setPaymentPopupOrder(order)
      const due = order.totalAmount - (order.advanceAmount || 0)
      setPaymentPopupAmount(due)
    }
  }

  const updatePayment = async (order, status, newAdvance) => {
    try {
      await ordersAPI.update(order.id || order._id, { paymentStatus: status, advanceAmount: newAdvance })
      toast.success(`Payment updated to ${status}`)
      fetchOrders()
      fetchAnalytics()
      setPaymentPopupOrder(null)
    } catch (error) {
      toast.error('Failed to update payment')
    }
  }

  const submitPaymentPopup = () => {
    const added = parseFloat(paymentPopupAmount) || 0
    const currentAdvance = paymentPopupOrder.advanceAmount || 0
    const total = paymentPopupOrder.totalAmount
    let newAdvance = currentAdvance + added
    let status = 'Partial'
    if (newAdvance >= total) { newAdvance = total; status = 'Paid' }
    else if (newAdvance <= 0) { newAdvance = 0; status = 'Unpaid' }
    updatePayment(paymentPopupOrder, status, newAdvance)
  }

  const handleToggleDelivery = async (order) => {
    try {
      const newStatus = order.status === 'Delivered' ? 'Pending' : 'Delivered'
      await ordersAPI.update(order.id || order._id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      fetchOrders()
      fetchAnalytics()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Delete this ticket?')) return
    try {
      await ordersAPI.delete(id)
      toast.success('Order deleted')
      fetchOrders()
      fetchAnalytics()
    } catch (error) {
      toast.error('Failed to delete order')
    }
  }

  // ==========================================
  // PROCESS ORDERS FOR TABLE
  // ==========================================
  const processedOrders = (Array.isArray(filteredOrders) ? filteredOrders : [])
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((order) => {
      const dateObj = new Date(order.date)
      const dateStr = isNaN(dateObj) ? 'N/A' : format(dateObj, 'dd MMM')
      const details = order.items && order.items.length > 0
        ? order.items.map((i) => `${i.qty} x ${i.type}`).join(', ')
        : 'Manual Entry'

      let waItems = ''
      if (order.items && order.items.length > 0) {
        waItems = order.items.map((i) => `• ${i.qty} x ${i.type} - ₹${i.price}`).join('\n')
      }

      const payStatus = order.paymentStatus || 'Unpaid'
      const advanceStr = (order.advanceAmount > 0 && order.advanceAmount < order.totalAmount) ? `\nAdvance Paid: ₹${order.advanceAmount}\nDue Amount: ₹${order.totalAmount - order.advanceAmount}` : ''
      const delStatus = order.status || 'Pending'
      const shopName = "Angel's Dry Cleaners"

      const message = encodeURIComponent([
        '🧾 *INVOICE / RECEIPT*',
        `*${shopName}*`,
        '--------------------------------',
        `Ticket No: *${order.id}*`,
        `Date: ${dateObj.toLocaleDateString('en-IN')}`,
        `Customer: ${order.customerName}`,
        '--------------------------------',
        '*Items:*',
        waItems || 'Manual Entry',
        '--------------------------------',
        `*TOTAL AMOUNT: ₹${order.totalAmount}*`,
        `Payment Status: ${payStatus}${advanceStr}`,
        `Status: ${delStatus}`,
        '--------------------------------',
        'Thank you! 🙏',
      ].join('\n'))

      const waLink = order.phone && order.phone.trim()
        ? `https://wa.me/91${order.phone.replace(/\D/g, '')}?text=${message}`
        : null

      return { ...order, dateStr, details, payStatus, delStatus, waLink }
    })

  // ==========================================
  // FORMAT DAILY REVENUE FOR CHART
  // ==========================================
  const dailyChartData = (analytics?.dailyRevenue || []).map(d => ({
    date: format(new Date(d._id), 'dd MMM'),
    Revenue: d.revenue,
    Billed: d.billed,
  }))

  // ==========================================
  // RENDER
  // ==========================================
  if (loading && analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-text-dark dark:text-white">Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center"
          id="dashboard-new-ticket-btn"
        >
          <Plus className="h-5 w-5" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* ============================================= */}
      {/* STATS RIBBON — 5 Cards */}
      {/* ============================================= */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse h-28 border border-gray-100 dark:border-slate-700" />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Today's Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Today</p>
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹{(analytics.today?.revenue || 0).toLocaleString('en-IN')}</h3>
            <ChangeIndicator value={analytics.today?.revenueChange || 0} label="vs yesterday" />
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">This Month</p>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹{(analytics.thisMonth?.revenue || 0).toLocaleString('en-IN')}</h3>
            <ChangeIndicator value={analytics.thisMonth?.change || 0} label="vs last month" />
          </div>

          {/* Pending Orders */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</p>
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.today?.pending || 0}</h3>
            <span className="text-xs text-gray-400">{analytics.today?.orders || 0} orders today</span>
          </div>

          {/* Avg Order Value */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Order</p>
              <div className="w-8 h-8 bg-violet-100 dark:bg-violet-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹{(analytics.today?.avgOrderValue || 0).toLocaleString('en-IN')}</h3>
            <span className="text-xs text-gray-400">{analytics.totalOrders} all-time orders</span>
          </div>

          {/* Collection Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Collection</p>
                <p className="text-xs text-gray-400 mt-1">₹{(analytics.year?.revenue || 0).toLocaleString('en-IN')} of ₹{(analytics.year?.billed || 0).toLocaleString('en-IN')}</p>
              </div>
              <CollectionRing rate={analytics.collectionRate || 0} />
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================= */}
      {/* CHARTS SECTION */}
      {/* ============================================= */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 animate-pulse h-72 border border-gray-100 dark:border-slate-700" />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend — Area Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5" id="revenue-trend-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Revenue Trend</h3>
                <p className="text-xs text-gray-400">Last 30 days</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-300 dark:text-slate-600" />
            </div>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="billedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:opacity-20" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Billed" stroke={COLORS.infoLight} fillOpacity={1} fill="url(#billedGradient)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="Revenue" stroke={COLORS.primary} fillOpacity={1} fill="url(#revenueGradient)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: COLORS.primary }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            )}
          </div>

          {/* Payment Breakdown — Donut Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5" id="payment-breakdown-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Payment Breakdown</h3>
                <p className="text-xs text-gray-400">All-time distribution</p>
              </div>
              <Target className="h-5 w-5 text-gray-300 dark:text-slate-600" />
            </div>
            {analytics.paymentBreakdown?.length > 0 ? (
              <div className="flex items-center justify-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={analytics.paymentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="count"
                      nameKey="status"
                      paddingAngle={3}
                      animationBegin={200}
                      animationDuration={800}
                    >
                      {analytics.paymentBreakdown.map((entry, index) => (
                        <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {analytics.paymentBreakdown.map((entry, index) => (
                    <div key={entry.status} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.status}</p>
                        <p className="text-xs text-gray-400">{entry.count} orders · ₹{entry.amount?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            )}
          </div>

          {/* Weekly Pattern — Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5" id="weekly-pattern-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Busiest Days</h3>
                <p className="text-xs text-gray-400">Order volume by day of week</p>
              </div>
              <BarChart3 className="h-5 w-5 text-gray-300 dark:text-slate-600" />
            </div>
            {analytics.weekdayPattern?.some(d => d.orders > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.weekdayPattern} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:opacity-20" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip prefix="" />} />
                  <Bar dataKey="orders" name="Orders" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {analytics.weekdayPattern.map((entry, index) => {
                      const maxOrders = Math.max(...analytics.weekdayPattern.map(d => d.orders))
                      const opacity = entry.orders === maxOrders ? 1 : 0.6
                      return <Cell key={index} fill={COLORS.primary} fillOpacity={opacity} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            )}
          </div>

          {/* Top 5 Customers — Horizontal Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5" id="top-customers-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Top Customers</h3>
                <p className="text-xs text-gray-400">By total spending</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-300 dark:text-slate-600" />
            </div>
            {analytics.topCustomers?.length > 0 ? (
              <div className="space-y-3">
                {analytics.topCustomers.map((customer, i) => {
                  const maxSpent = analytics.topCustomers[0]?.totalSpent || 1
                  const widthPct = Math.max(8, (customer.totalSpent / maxSpent) * 100)
                  const barColors = [COLORS.primary, COLORS.info, COLORS.purple, COLORS.pink, COLORS.success]
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{customer.name}</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">₹{customer.totalSpent?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-2.5 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${widthPct}%`, backgroundColor: barColors[i % barColors.length] }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{customer.orders} orders</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No customers yet</div>
            )}
          </div>
        </div>
      ) : null}

      {/* ============================================= */}
      {/* LIVE ORDER FEED */}
      {/* ============================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden" id="live-order-feed">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h5 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex-shrink-0">Live Order Feed</h5>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Status Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'delivered', label: 'Delivered' },
                  { key: 'unpaid', label: 'Unpaid' },
                ].map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setStatusFilter(chip.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${
                      statusFilter === chip.key
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'
                    }`}
                    id={`filter-${chip.key}-btn`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ticket or name..."
                  className="pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  id="dashboard-search-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ticket</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Details</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Delivery</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Receipt</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {processedOrders.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">No orders found</td></tr>
              ) : (
                processedOrders.map((order) => (
                  <tr key={order._id || order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{order.dateStr}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">#{order.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{order.customerName}</div>
                      <div className="text-xs text-gray-400">{order.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{order.details}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handlePaymentClick(order)}
                        className={`badge ${order.payStatus === 'Paid' ? 'badge-success' : order.payStatus === 'Partial' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' : 'badge-danger'}`}
                      >
                        {order.payStatus}{order.payStatus === 'Partial' && <span className="ml-1 tracking-tighter">({order.advanceAmount}/{order.totalAmount})</span>}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggleDelivery(order)} className={`badge ${order.delStatus === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>
                        {order.delStatus}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-800 dark:text-gray-200">₹{order.totalAmount}</td>
                    <td className="px-6 py-4 text-center">
                      {order.waLink && (
                        <a href={order.waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDeleteOrder(order.id || order._id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Package className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
          {processedOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No orders found</div>
          ) : (
            processedOrders.map((order) => (
              <div key={order._id || order.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">#{order.id}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-400 px-2 py-1 rounded">{order.dateStr}</span>
                  </div>
                  <div className="font-bold text-lg text-primary">₹{order.totalAmount}</div>
                </div>
                <div className="mb-3">
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{order.customerName}</div>
                  <div className="text-xs text-gray-500 bg-gray-50 dark:bg-slate-700 p-2 mt-2 rounded border border-gray-100 dark:border-slate-600">{order.details}</div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePaymentClick(order)}
                      className={`badge text-xs ${order.payStatus === 'Paid' ? 'badge-success' : order.payStatus === 'Partial' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' : 'badge-danger'}`}
                    >
                      {order.payStatus}{order.payStatus === 'Partial' && <span className="ml-1 tracking-tighter">({order.advanceAmount}/{order.totalAmount})</span>}
                    </button>
                    <button onClick={() => handleToggleDelivery(order)} className={`badge text-xs ${order.delStatus === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>
                      {order.delStatus}
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    {order.waLink && (
                      <a href={order.waLink} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => handleDeleteOrder(order.id || order._id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                      <Package className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Modal */}
      {isModalOpen && (
        <OrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false)
            fetchOrders()
            fetchAnalytics()
          }}
        />
      )}

      {/* Payment Popup Overlay */}
      {paymentPopupOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setPaymentPopupOrder(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4 transform transition-all" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-xl font-bold text-gray-800 dark:text-white text-center">Receive Payment</h4>
            <p className="text-xs text-gray-400 text-center mb-4">Ticket #{paymentPopupOrder.id} - {paymentPopupOrder.customerName}</p>

            <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Bill</span>
              <span className="font-bold dark:text-white">₹{paymentPopupOrder.totalAmount}</span>
            </div>
            {(paymentPopupOrder.advanceAmount > 0) && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg flex justify-between items-center mb-2 text-emerald-700 dark:text-emerald-400">
                <span className="text-sm font-medium">Advance Paid</span>
                <span className="font-bold">₹{paymentPopupOrder.advanceAmount}</span>
              </div>
            )}
            <div className="bg-orange-50 dark:bg-orange-500/10 p-3 rounded-lg flex justify-between items-center mb-4 text-orange-700 dark:text-orange-400">
              <span className="text-sm font-bold">Total Due</span>
              <span className="font-bold text-lg">₹{paymentPopupOrder.totalAmount - (paymentPopupOrder.advanceAmount || 0)}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Add Payment Amount ₹</label>
              <input
                type="number"
                value={paymentPopupAmount}
                onChange={(e) => setPaymentPopupAmount(e.target.value)}
                className="input-field text-center text-xl font-bold py-3 text-primary dark:bg-slate-700 dark:text-white dark:border-slate-600"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => setPaymentPopupOrder(null)} className="btn-secondary py-3 text-sm font-bold">
                Cancel
              </button>
              <button onClick={submitPaymentPopup} className="btn-primary py-3 text-sm font-bold">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard