import { useState, useEffect } from 'react'
import { Search, Plus, Printer, Trash2 } from 'lucide-react'
import { ordersAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    ticketNo: '',
    custName: '',
    items: [],
    extraCharges: '',
  })
  const [currentItem, setCurrentItem] = useState({
    clothType: '',
    clothRate: '',
    clothQty: 1,
  })

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery])

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getAll()
      const recordsOrders = response.data.filter((o) => o.origin === 'records')
      setOrders(recordsOrders)
      setFilteredOrders(recordsOrders)
    } catch (error) {
      toast.error('Failed to load records')
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
        order.id?.toString().includes(searchQuery) ||
        order.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredOrders(filtered)
  }

  const addItem = () => {
    if (!currentItem.clothType || !currentItem.clothRate) {
      toast.error('Please fill Item, Rate and Qty')
      return
    }
    const newItem = {
      ...currentItem,
      total: parseFloat(currentItem.clothRate) * parseInt(currentItem.clothQty),
    }
    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    })
    setCurrentItem({ clothType: '', clothRate: '', clothQty: 1 })
  }

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const calculateTotal = () => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + item.total, 0)
    const extra = parseFloat(formData.extraCharges) || 0
    return itemsTotal + extra
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      toast.error('Please add at least one cloth item')
      return
    }
    if (!formData.ticketNo || !formData.custName) {
      toast.error('Please fill Ticket # and Customer Name')
      return
    }

    try {
      const newOrder = {
        id: formData.ticketNo,
        customerName: formData.custName,
        items: formData.items.map((i) => ({
          type: i.clothType,
          qty: i.clothQty,
          price: i.total,
        })),
        totalAmount: calculateTotal(),
        status: 'Pending',
        paymentStatus: 'Unpaid',
        origin: 'records',
        date: new Date(),
      }

      await ordersAPI.create(newOrder)
      toast.success('Record saved successfully!')
      
      // Reset form
      setFormData({ ticketNo: '', custName: '', items: [], extraCharges: '' })
      setCurrentItem({ clothType: '', clothRate: '', clothQty: 1 })
      fetchOrders()
    } catch (error) {
      toast.error('Failed to save record')
      console.error(error)
    }
  }

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
          <h2 className="text-3xl font-bold text-text-dark">Dry Cleaning Log</h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">The official "Owner's Copy" record book.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Printer className="h-5 w-5" />
          <span>Print Sheet</span>
        </button>
      </div>

      {/* Main Grid: Stacks on mobile, splits 2/5 and 3/5 on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: FORM SECTION                  */}
        {/* ========================================== */}
        <div className="xl:col-span-2">
          <div className="card p-4 sm:p-6 bg-white shadow-sm rounded-xl">
            <h5 className="text-lg sm:text-xl font-bold text-primary mb-4 flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              New Order Entry
            </h5>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Ticket & Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Ticket #
                  </label>
                  <input
                    type="text"
                    value={formData.ticketNo}
                    onChange={(e) => setFormData({ ...formData, ticketNo: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 1001"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.custName}
                    onChange={(e) => setFormData({ ...formData, custName: e.target.value })}
                    className="input-field"
                    placeholder="Full Name"
                    required
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Item Entry Area */}
              <div>
                <h6 className="text-sm font-bold text-gray-800 mb-3">Add Cloth Details</h6>
                
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 mb-3">
                  <div className="col-span-2 sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Item (e.g. Coat)"
                      value={currentItem.clothType}
                      onChange={(e) => setCurrentItem({ ...currentItem, clothType: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Rate ₹"
                      value={currentItem.clothRate}
                      onChange={(e) => setCurrentItem({ ...currentItem, clothRate: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={currentItem.clothQty}
                      onChange={(e) => setCurrentItem({ ...currentItem, clothQty: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="input-field w-full"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <button
                      type="button"
                      onClick={addItem}
                      className="btn-primary w-full h-full flex justify-center items-center py-2"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="sm:hidden ml-2">Add</span>
                    </button>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="bg-gray-50 p-3 rounded-lg mb-4 min-h-[80px] border border-gray-100">
                  {formData.items.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-2">No items added</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 sm:p-3 rounded border border-gray-100 shadow-sm text-sm">
                          <div className="flex-1">
                            <div className="font-bold text-text-dark">{item.clothType}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Rate: ₹{item.clothRate} × Qty: {item.clothQty}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">₹{item.total}</span>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals & Submit */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Extra / Add-on (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.extraCharges}
                        onChange={(e) => setFormData({ ...formData, extraCharges: e.target.value })}
                        className="input-field bg-white"
                        placeholder="0"
                      />
                      <div className="text-xs text-gray-500 mt-1">Starch, Urgent, etc.</div>
                    </div>
                    
                    <div className="text-left sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-none border-gray-100">
                      <small className="text-gray-500 block mb-1 text-xs font-bold uppercase tracking-wider">Final Amount</small>
                      <h3 className="text-3xl font-bold text-green-600">
                        ₹{calculateTotal()}
                      </h3>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full py-3 text-lg font-bold shadow-md hover:shadow-lg transition-shadow">
                  Save to Register
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: LOG BOOK                     */}
        {/* ========================================== */}
        <div className="xl:col-span-3">
          <div className="card overflow-hidden bg-white shadow-sm rounded-xl">
            
            {/* Table Header & Search */}
            <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
              <h5 className="text-xl font-bold text-text-dark">Log Book</h5>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Ticket # or Name..."
                  className="input-field pl-9 text-sm w-full sm:w-64"
                />
              </div>
            </div>

            {/* DESKTOP VIEW: STANDARD TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Ticket</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No Log Book entries found.</td>
                    </tr>
                  ) : (
                    filteredOrders
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((order) => {
                        const dateStr = format(new Date(order.date), 'dd/MM/yyyy')
                        const summary = order.items && order.items.length > 0
                            ? order.items.map((i) => `${i.qty} ${i.type}`).join(', ')
                            : 'No Details'

                        return (
                          <tr key={order._id || order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-bold text-text-dark">#{order.id}</div>
                              <div className="text-xs text-gray-500">{dateStr}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-primary">
                              {order.customerName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={summary}>
                              {summary}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-bold text-lg">
                              ₹{order.totalAmount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {order.paymentStatus === 'Paid' ? (
                                <span className="badge badge-success px-3 py-1">Paid</span>
                              ) : (
                                <span className="badge badge-danger px-3 py-1">Unpaid</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW: APP-STYLE CARDS */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No Log Book entries found.</div>
              ) : (
                filteredOrders
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((order) => {
                    const dateStr = format(new Date(order.date), 'dd MMM yyyy')
                    const summary = order.items && order.items.length > 0
                        ? order.items.map((i) => `${i.qty} ${i.type}`).join(', ')
                        : 'No Details'

                    return (
                      <div key={order._id || order.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                        
                        {/* Top Row: Date & Status */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{dateStr}</span>
                          {order.paymentStatus === 'Paid' ? (
                            <span className="badge badge-success text-[10px] px-2 py-0.5">Paid</span>
                          ) : (
                            <span className="badge badge-danger text-[10px] px-2 py-0.5">Unpaid</span>
                          )}
                        </div>

                        {/* Middle Row: Ticket, Name, Amount */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-sm text-gray-500 font-medium">Ticket #{order.id}</div>
                            <div className="font-bold text-lg text-primary">{order.customerName}</div>
                          </div>
                          <div className="font-bold text-xl text-green-600">₹{order.totalAmount}</div>
                        </div>

                        {/* Bottom Row: Items */}
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 mt-2">
                          {summary}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Orders