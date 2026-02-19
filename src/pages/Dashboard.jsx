import { useState, useEffect } from 'react'
import { Plus, Search, DollarSign, Package, TrendingUp, MessageCircle } from 'lucide-react'
import { ordersAPI } from '../utils/api'
import toast from 'react-hot-toast'
import OrderModal from '../components/OrderModal'
import { format } from 'date-fns'

const Dashboard = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [revenuePeriod, setRevenuePeriod] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery])

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getAll()
      setOrders(response.data)
      setFilteredOrders(response.data)
    } catch (error) {
      toast.error('Failed to load orders')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    if (!searchQuery) {
      setFilteredOrders(orders)
      return
    }
    const filtered = orders.filter(
      (order) =>
        order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id?.toString().includes(searchQuery)
    )
    setFilteredOrders(filtered)
  }

  const calculateStats = () => {
    const now = new Date()
    const todayStr = now.toDateString()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const pendingCount = orders.filter((o) => o.status !== 'Delivered').length

    const revenue = { today: 0, month: 0, year: 0 }
    orders.forEach((order) => {
      if (order.paymentStatus === 'Paid') {
        const d = new Date(order.date)
        const amt = parseFloat(order.totalAmount) || 0
        if (d.toDateString() === todayStr) revenue.today += amt
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear)
          revenue.month += amt
        if (d.getFullYear() === currentYear) revenue.year += amt
      }
    })

    return { pendingCount, revenue }
  }

  const stats = calculateStats()

  const handleTogglePayment = async (order) => {
    try {
      const newStatus = order.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid'
      await ordersAPI.update(order.id, { paymentStatus: newStatus })
      toast.success(`Payment status updated to ${newStatus}`)
      fetchOrders()
    } catch (error) {
      toast.error('Failed to update payment status')
    }
  }

  const handleToggleDelivery = async (order) => {
    try {
      const newStatus = order.status === 'Delivered' ? 'Pending' : 'Delivered'
      await ordersAPI.update(order.id, { status: newStatus })
      toast.success(`Delivery status updated to ${newStatus}`)
      fetchOrders()
    } catch (error) {
      toast.error('Failed to update delivery status')
    }
  }

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Delete this ticket?')) return
    try {
      await ordersAPI.delete(id)
      toast.success('Order deleted')
      fetchOrders()
    } catch (error) {
      toast.error('Failed to delete order')
    }
  }

  const getRevenueDisplay = () => {
    const periodLabels = {
      today: 'Revenue (Today)',
      month: 'Revenue (Month)',
      year: 'Revenue (Year)',
    }
    return {
      label: periodLabels[revenuePeriod],
      value: stats.revenue[revenuePeriod],
    }
  }

  const revenueDisplay = getRevenueDisplay()

  // ==========================================
  // PRE-PROCESS ORDERS FOR BOTH DESKTOP & MOBILE
  // ==========================================
  const processedOrders = filteredOrders
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((order) => {
      const dateObj = new Date(order.date)
      const dateStr = format(dateObj, 'dd MMM')
      
      const details = order.items && order.items.length > 0
          ? order.items.map((i) => `${i.qty} x ${i.type}`).join(', ')
          : 'Manual Entry'

      let waItems = ''
      if (order.items && order.items.length > 0) {
        waItems = order.items.map((i) => `• ${i.qty} x ${i.type} - ₹${i.price}`).join('\n')
      }

      const payStatus = order.paymentStatus || 'Unpaid'
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
        `Payment: ${payStatus}`,
        `Status: ${delStatus}`,
        '--------------------------------',
        'Thank you! 🙏',
      ].join('\n'))

      const waLink = order.phone && order.phone.trim()
          ? `https://wa.me/91${order.phone.replace(/\D/g, '')}?text=${message}`
          : null

      return {
        ...order,
        dateStr,
        details,
        payStatus,
        delStatus,
        waLink
      }
    })

  if (loading) {
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
          <h2 className="text-3xl font-bold text-text-dark">Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Overview for {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center"
        >
          <Plus className="h-5 w-5" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <div className="stat-card p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pending Orders</p>
              <h3 className="text-3xl font-bold text-text-dark">{stats.pendingCount}</h3>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="stat-card p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-600 text-sm font-medium">{revenueDisplay.label}</p>
                <select
                  value={revenuePeriod}
                  onChange={(e) => setRevenuePeriod(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 cursor-pointer focus:outline-none"
                >
                  <option value="today">Today</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <h3 className="text-3xl font-bold text-text-dark">
                ₹{revenueDisplay.value.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center ml-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="stat-card p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Orders</p>
              <h3 className="text-3xl font-bold text-text-dark">{orders.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Feed Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Feed Header & Search */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h5 className="text-xl font-bold text-text-dark">Live Order Feed</h5>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket or name..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* ========================================== */}
        {/* DESKTOP VIEW: STANDARD TABLE */}
        {/* ========================================== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Receipt</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {processedOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">No orders found</td>
                </tr>
              ) : (
                processedOrders.map((order) => (
                  <tr key={order._id || order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{order.dateStr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-dark">#{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-dark">{order.customerName}</div>
                      {order.phone && <div className="text-sm text-gray-500">{order.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{order.details}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={() => handleTogglePayment(order)} className={`badge ${order.payStatus === 'Paid' ? 'badge-success' : 'badge-danger'} cursor-pointer hover:opacity-80`}>
                        {order.payStatus}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={() => handleToggleDelivery(order)} className={`badge ${order.delStatus === 'Delivered' ? 'badge-info' : 'badge-warning'} cursor-pointer hover:opacity-80`}>
                        {order.delStatus}
                      </button>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-text-dark">₹{order.totalAmount}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {order.waLink ? (
                        <a href={order.waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-500 text-white shadow-sm hover:bg-green-600 transition-colors" title="Send receipt on WhatsApp">
                          <MessageCircle className="h-5 w-5" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No phone</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={() => handleDeleteOrder(order.id)} className="text-red-500 hover:text-red-700 transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================== */}
        {/* MOBILE VIEW: APP-STYLE CARDS */}
        {/* ========================================== */}
        <div className="block md:hidden divide-y divide-gray-100">
          {processedOrders.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No orders found</div>
          ) : (
            processedOrders.map((order) => (
              <div key={order._id || order.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                
                {/* Top Row: ID, Date, Amount */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-text-dark text-lg">#{order.id}</span>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{order.dateStr}</span>
                  </div>
                  <div className="font-bold text-lg text-primary">₹{order.totalAmount}</div>
                </div>

                {/* Middle Row: Customer Info & Details */}
                <div className="mb-4">
                  <div className="text-sm font-bold text-text-dark">{order.customerName}</div>
                  {order.phone && <div className="text-xs text-gray-500 mt-0.5">{order.phone}</div>}
                  <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-2">
                    {order.details}
                  </div>
                </div>

                {/* Bottom Row: Actions & Status */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <button onClick={() => handleTogglePayment(order)} className={`badge text-xs px-2 py-1 ${order.payStatus === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                      {order.payStatus}
                    </button>
                    <button onClick={() => handleToggleDelivery(order)} className={`badge text-xs px-2 py-1 ${order.delStatus === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>
                      {order.delStatus}
                    </button>
                  </div>

                  <div className="flex space-x-3 items-center">
                    {order.waLink && (
                      <a href={order.waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white transition-colors">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => handleDeleteOrder(order.id)} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
          }}
        />
      )}
    </div>
  )
}

export default Dashboard