import { useState, useEffect } from 'react'
import { UserCog, DollarSign, Trash2 } from 'lucide-react'
import { workerLogsAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const Workers = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    workerName: 'Raju',
    customerRef: '',
    qtyFixed: '',
    qtySaree: '',
    rateSaree: 20,
    qtySheet: '',
    rateSheet: 30,
  })

  const FIXED_RATE = 7

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await workerLogsAPI.getAll()
      const todayStr = new Date().toDateString()
      const todayLogs = response.data.filter(
        (log) => new Date(log.date).toDateString() === todayStr
      )
      setLogs(todayLogs)
    } catch (error) {
      toast.error('Failed to load logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatDesc = (fix, sa, sh) => {
    const parts = []
    if (fix) parts.push(`${fix} Regular`)
    if (sa) parts.push(`${sa} Sarees`)
    if (sh) parts.push(`${sh} Sheets`)
    return parts.join(', ')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const qFixed = parseInt(formData.qtyFixed) || 0
    const qSaree = parseInt(formData.qtySaree) || 0
    const rSaree = parseInt(formData.rateSaree) || 0
    const qSheet = parseInt(formData.qtySheet) || 0
    const rSheet = parseInt(formData.rateSheet) || 0

    if (qFixed === 0 && qSaree === 0 && qSheet === 0) {
      toast.error('Please enter at least one quantity!')
      return
    }

    const fixedPay = qFixed * FIXED_RATE
    const variablePay = qSaree * rSaree + qSheet * rSheet
    const totalWage = fixedPay + variablePay

    try {
      const newLog = {
        worker: formData.workerName,
        customer: formData.customerRef,
        desc: formatDesc(qFixed, qSaree, qSheet),
        amount: totalWage,
        date: new Date(),
      }

      await workerLogsAPI.create(newLog)
      toast.success('Work logged successfully!')
      
      // Reset form
      setFormData({
        ...formData,
        customerRef: '',
        qtyFixed: '',
        qtySaree: '',
        qtySheet: '',
      })
      fetchLogs()
    } catch (error) {
      toast.error('Failed to save log')
      console.error(error)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return
    try {
      await workerLogsAPI.delete(id)
      toast.success('Log deleted')
      fetchLogs()
    } catch (error) {
      toast.error('Failed to delete log')
    }
  }

  const calculateTotals = () => {
    const total = logs.reduce((sum, log) => sum + log.amount, 0)
    const workerTotals = {}
    logs.forEach((log) => {
      if (!workerTotals[log.worker]) workerTotals[log.worker] = 0
      workerTotals[log.worker] += log.amount
    })
    return { total, workerTotals }
  }

  const { total, workerTotals } = calculateTotals()

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
          <h2 className="text-3xl font-bold text-text-dark">Worker Management</h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Track work done by staff for specific customers.</p>
        </div>
        <div className="card p-4 border-l-4 border-l-primary w-full sm:w-auto min-w-[200px] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs uppercase tracking-wider font-semibold mb-1">Total Wages (Today)</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary">
                ₹{total.toLocaleString('en-IN')}
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center ml-4">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* ========================================== */}
        {/* FORM SECTION                               */}
        {/* ========================================== */}
        <div className="xl:col-span-1">
          <div className="card p-5 sm:p-6 shadow-sm">
            <h5 className="text-lg sm:text-xl font-bold text-primary mb-4 flex items-center">
              <UserCog className="h-5 w-5 mr-2" />
              Log Work
            </h5>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  1. Select Worker
                </label>
                <select
                  value={formData.workerName}
                  onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
                  className="input-field"
                >
                  <option value="Raju">Raju</option>
                  <option value="Sunita">Sunita</option>
                  <option value="Amit">Amit</option>
                  <option value="Priya">Priya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  2. Customer Ref / Ticket #
                </label>
                <input
                  type="text"
                  value={formData.customerRef}
                  onChange={(e) => setFormData({ ...formData, customerRef: e.target.value })}
                  placeholder="e.g. Mrs. Sharma (1042)"
                  className="input-field"
                  required
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h6 className="text-xs font-bold text-primary mb-3 border-b border-gray-200 pb-2">
                  Fixed Rate Items (₹{FIXED_RATE}/pc)
                </h6>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Total Qty (Shirt / Pant / Salwar)
                </label>
                <input
                  type="number"
                  value={formData.qtyFixed}
                  onChange={(e) => setFormData({ ...formData, qtyFixed: e.target.value })}
                  placeholder="0"
                  className="input-field bg-white"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h6 className="text-xs font-bold text-primary mb-3 border-b border-gray-200 pb-2">
                  Variable Rate Items
                </h6>
                <div className="space-y-4">
                  
                  {/* Sarees */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Sarees (Qty)</label>
                      <input
                        type="number"
                        value={formData.qtySaree}
                        onChange={(e) => setFormData({ ...formData, qtySaree: e.target.value })}
                        placeholder="0"
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        value={formData.rateSaree}
                        onChange={(e) => setFormData({ ...formData, rateSaree: e.target.value })}
                        className="input-field bg-yellow-50 border-yellow-200 text-yellow-900 font-bold"
                      />
                    </div>
                  </div>
                  
                  {/* Bedsheets */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Bedsheets (Qty)</label>
                      <input
                        type="number"
                        value={formData.qtySheet}
                        onChange={(e) => setFormData({ ...formData, qtySheet: e.target.value })}
                        placeholder="0"
                        className="input-field bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        value={formData.rateSheet}
                        onChange={(e) => setFormData({ ...formData, rateSheet: e.target.value })}
                        className="input-field bg-yellow-50 border-yellow-200 text-yellow-900 font-bold"
                      />
                    </div>
                  </div>

                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-3 text-sm font-bold shadow-sm">
                Calculate & Add Log
              </button>
            </form>
          </div>
        </div>

        {/* ========================================== */}
        {/* LOG BOOK SECTION                           */}
        {/* ========================================== */}
        <div className="xl:col-span-3">
          <div className="card overflow-hidden shadow-sm flex flex-col h-full">
            
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-white">
              <h5 className="text-lg sm:text-xl font-bold text-text-dark">Today's Work Log</h5>
            </div>

            <div className="flex-1 bg-gray-50">
              {logs.length === 0 ? (
                <div className="px-6 py-16 text-center text-gray-500 bg-white h-full flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <UserCog className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="font-medium">No logs added today.</p>
                </div>
              ) : (
                <>
                  {/* DESKTOP VIEW: STANDARD TABLE */}
                  <div className="hidden md:block overflow-x-auto bg-white">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Worker</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Ref</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Details</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Wage</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {logs.map((log) => (
                          <tr key={log._id || log.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-text-dark">{log.worker}</td>
                            <td className="px-6 py-4 font-semibold text-primary text-sm">{log.customer}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{log.desc}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-bold">₹{log.amount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleDelete(log._id || log.id)}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE VIEW: APP-STYLE CARDS */}
                  <div className="block md:hidden divide-y divide-gray-100 bg-white">
                    {logs.map((log) => (
                      <div key={log._id || log.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-text-dark text-lg mr-2">{log.worker}</span>
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{log.customer}</span>
                          </div>
                          <div className="font-bold text-lg text-green-600">₹{log.amount}</div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 flex-1 mr-3">
                            {log.desc}
                          </div>
                          <button
                            onClick={() => handleDelete(log._id || log.id)}
                            className="text-gray-400 hover:text-red-500 p-2 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Total Payable Summary Chip Area */}
            {logs.length > 0 && (
              <div className="p-4 sm:p-5 bg-white border-t border-gray-200 mt-auto">
                <small className="text-gray-500 text-xs uppercase tracking-wider font-bold block mb-3">
                  Summary: Total Payable by Worker
                </small>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(workerTotals).map(([worker, amount]) => (
                    <div
                      key={worker}
                      className="bg-gray-50 border border-gray-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center shadow-sm"
                    >
                      <UserCog className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2" />
                      <span className="font-semibold text-sm sm:text-base text-gray-700 mr-2">{worker}:</span>
                      <span className="font-bold text-sm sm:text-base text-primary">₹{amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workers