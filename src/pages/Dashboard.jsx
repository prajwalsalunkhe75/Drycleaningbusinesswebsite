import { useState, useEffect } from 'react'
import { Plus, Search, DollarSign, Package, TrendingUp, MessageCircle } from 'lucide-react'
import { ordersAPI } from '../utils/api'
import toast from 'react-hot-toast'
import OrderModal from '../components/OrderModal'
import { format } from 'date-fns'
import { getErrorMessage } from '../utils/errorHandler'
import { ErrorState, SkeletonLoader, EmptyState } from '../components/DataStates'

const Dashboard = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [revenuePeriod, setRevenuePeriod] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentPopupOrder, setPaymentPopupOrder] = useState(null)
  const [paymentPopupAmount, setPaymentPopupAmount] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getAll()
      // Handle paginated response structure
      const ordersData = response.data?.data || response.data || []
      const data = Array.isArray(ordersData) ? ordersData : (ordersData?.orders || [])
      setOrders(data)
      setFilteredOrders(data)
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'load orders')
      toast.error(errorMsg)
      console.error(error)
      setOrders([]) // Fallback to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    if (!Array.isArray(orders)) return // Prevent crash if orders isn't an array yet
    
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
    // CRITICAL FIX: Ensure orders is an array before calling .filter
    if (!Array.isArray(orders)) {
      return { pendingCount: 0, revenue: { today: 0, month: 0, year: 0 } }
    }

    const now = new Date()
    const todayStr = now.toDateString()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const pendingCount = orders.filter((o) => o.status !== 'Delivered').length

    const revenue = { today: 0, month: 0, year: 0 }
    orders.forEach((order) => {
      const amt = order.advanceAmount !== undefined ? parseFloat(order.advanceAmount) : (order.paymentStatus === 'Paid' ? parseFloat(order.totalAmount) : 0)
      if (amt > 0) {
        const d = new Date(order.date)
        if (d.toDateString() === todayStr) revenue.today += amt
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear)
          revenue.month += amt
        if (d.getFullYear() === currentYear) revenue.year += amt
      }
    })

    return { pendingCount, revenue }
  }

  const stats = calculateStats()

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
     if (newAdvance >= total) {
        newAdvance = total
        status = 'Paid'
     } else if (newAdvance <= 0) {
        newAdvance = 0
        status = 'Unpaid'
     }
     updatePayment(paymentPopupOrder, status, newAdvance)
  }

  const handleToggleDelivery = async (order) => {
    try {
      const newStatus = order.status === 'Delivered' ? 'Pending' : 'Delivered'
      await ordersAPI.update(order.id || order._id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      fetchOrders()
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
      value: stats.revenue[revenuePeriod] || 0,
    }
  }

  const revenueDisplay = getRevenueDisplay()

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
          <h2 className="text-3xl font-bold text-text-dark dark:text-white">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
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

      {/* Loading State */}
      {loading && <SkeletonLoader count={3} variant="card" />}

      {/* Error State */}
      {!loading && orders.length === 0 && (
        <EmptyState
          title="No Orders Yet"
          description="Create your first ticket to get started"
          action={{ label: 'Create Ticket', onClick: () => setIsModalOpen(true) }}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Orders Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h5 className="text-xl font-bold text-text-dark flex-shrink-0">Live Order Feed</h5>
          <div className="relative w-full sm:w-96 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket or name..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase">Ticket</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase">Details</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Payment</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Delivery</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Receipt</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {processedOrders.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">No orders found</td></tr>
              ) : (
                processedOrders.map((order) => (
                  <tr key={order._id || order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{order.dateStr}</td>
                    <td className="px-6 py-4 text-sm font-bold text-text-dark">#{order.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-text-dark">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{order.details}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handlePaymentClick(order)} 
                        className={`badge ${order.payStatus === 'Paid' ? 'badge-success' : order.payStatus === 'Partial' ? 'bg-orange-100 text-orange-700' : 'badge-danger'}`}
                      >
                        {order.payStatus}{order.payStatus === 'Partial' && <span className="ml-1 tracking-tighter">({order.advanceAmount}/{order.totalAmount})</span>}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggleDelivery(order)} className={`badge ${order.delStatus === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>
                        {order.delStatus}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-text-dark">₹{order.totalAmount}</td>
                    <td className="px-6 py-4 text-center">
                      {order.waLink && (
                        <a href={order.waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDeleteOrder(order.id || order._id)} className="text-red-500 hover:text-red-700">
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
        <div className="md:hidden divide-y divide-gray-100">
          {processedOrders.map((order) => (
            <div key={order._id || order.id} className="p-4 bg-white">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-text-dark text-lg">#{order.id}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{order.dateStr}</span>
                </div>
                <div className="font-bold text-lg text-primary">₹{order.totalAmount}</div>
              </div>
              <div className="mb-3">
                <div className="text-sm font-bold text-text-dark">{order.customerName}</div>
                <div className="text-xs text-gray-600 bg-gray-50 p-2 mt-2 rounded border border-gray-100">{order.details}</div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handlePaymentClick(order)} 
                    className={`badge text-xs ${order.payStatus === 'Paid' ? 'badge-success' : order.payStatus === 'Partial' ? 'bg-orange-100 text-orange-700' : 'badge-danger'}`}
                  >
                    {order.payStatus}{order.payStatus === 'Partial' && <span className="ml-1 tracking-tighter">({order.advanceAmount}/{order.totalAmount})</span>}
                  </button>
                  <button onClick={() => handleToggleDelivery(order)} className={`badge text-xs ${order.delStatus === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>
                    {order.delStatus}
                  </button>
                </div>
                <div className="flex space-x-3">
                  {order.waLink && (
                    <a href={order.waLink} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full bg-green-50 text-green-600 border border-green-200">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => handleDeleteOrder(order.id || order._id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-red-500 border border-red-200">
                    <Package className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      {/* Payment Popup Overlay */}
      {paymentPopupOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => setPaymentPopupOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-xl font-bold text-text-dark text-center">Receive Payment</h4>
            <p className="text-xs text-gray-500 text-center mb-4">Ticket #{paymentPopupOrder.id} - {paymentPopupOrder.customerName}</p>
            
            <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Total Bill</span>
              <span className="font-bold">₹{paymentPopupOrder.totalAmount}</span>
            </div>
            {(paymentPopupOrder.advanceAmount > 0) && (
              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center mb-2 text-green-700">
                <span className="text-sm font-medium">Advance Paid</span>
                <span className="font-bold">₹{paymentPopupOrder.advanceAmount}</span>
              </div>
            )}
            <div className="bg-orange-50 p-3 rounded-lg flex justify-between items-center mb-4 text-orange-700">
              <span className="text-sm font-bold">Total Due</span>
              <span className="font-bold text-lg">₹{paymentPopupOrder.totalAmount - (paymentPopupOrder.advanceAmount || 0)}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Add Payment Amount ₹</label>
              <input
                type="number"
                value={paymentPopupAmount}
                onChange={(e) => setPaymentPopupAmount(e.target.value)}
                className="input-field text-center text-xl font-bold py-3 text-primary"
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