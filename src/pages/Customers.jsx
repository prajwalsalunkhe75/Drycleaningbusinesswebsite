import { useState, useEffect } from 'react'
import { Plus, Search, DollarSign, Trash2, FileText, ArrowLeft } from 'lucide-react'
import { customersAPI, ordersAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const Customers = () => {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [entryForm, setEntryForm] = useState({
    type: 'ironing',
    ironItem: 'Shirt',
    ironQty: 1,
    ironRate: 10,
    otherName: '',
    otherRate: '',
    dcItemName: '',
    dcRate: '',
    dcQty: 1,
    dcStain: '',
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchQuery])

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll()
      setCustomers(response.data)
      setFilteredCustomers(response.data)
    } catch (error) {
      toast.error('Failed to load customers')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    if (!searchQuery) {
      setFilteredCustomers(customers)
      return
    }
    const filtered = customers.filter((c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredCustomers(filtered)
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Name & Phone Required')
      return
    }

    try {
      const customerData = {
        id: Date.now(),
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
        totalDue: 0,
        transactions: [],
      }
      await customersAPI.create(customerData)
      toast.success('Customer created successfully!')
      setNewCustomer({ name: '', phone: '', address: '' })
      setIsNewCustomerModalOpen(false)
      fetchCustomers()
    } catch (error) {
      toast.error('Failed to create customer')
      console.error(error)
    }
  }

  const handleAddEntry = async () => {
    if (!selectedCustomer) return

    let summary = ''
    let amount = 0
    let type = ''

    if (entryForm.type === 'ironing') {
      type = 'Ironing'
      const itemName =
        entryForm.ironItem === 'Other'
          ? entryForm.otherName
          : entryForm.ironItem
      const rate =
        entryForm.ironItem === 'Other'
          ? parseFloat(entryForm.otherRate) || 0
          : parseFloat(entryForm.ironRate) || 0
      amount = entryForm.ironQty * rate
      summary = `${entryForm.ironQty} x ${itemName} (Iron)`
    } else {
      type = 'DryClean'
      const rate = parseFloat(entryForm.dcRate) || 0
      const qty = parseInt(entryForm.dcQty) || 0
      const stain = parseFloat(entryForm.dcStain) || 0
      amount = rate * qty + stain
      summary = `${qty} x ${entryForm.dcItemName} (DryClean)`
      if (stain > 0) summary += ` + ₹${stain} Stain`
    }

    try {
      const customer = customers.find((c) => c.id === selectedCustomer.id)
      const newTrans = {
        date: new Date(),
        summary,
        amount,
        type,
      }
      const newTotalDue = customer.totalDue + amount
      const updatedTransactions = [...customer.transactions, newTrans]

      await customersAPI.update(selectedCustomer.id, {
        totalDue: newTotalDue,
        transactions: updatedTransactions,
      })

      toast.success('Entry added successfully!')
      setIsEntryModalOpen(false)
      setEntryForm({
        type: 'ironing',
        ironItem: 'Shirt',
        ironQty: 1,
        ironRate: 10,
        otherName: '',
        otherRate: '',
        dcItemName: '',
        dcRate: '',
        dcQty: 1,
        dcStain: '',
      })
      fetchCustomers()
      if (selectedCustomer) {
        const updated = await customersAPI.getAll()
        const updatedCustomer = updated.data.find((c) => c.id === selectedCustomer.id)
        setSelectedCustomer(updatedCustomer)
      }
    } catch (error) {
      toast.error('Failed to add entry')
      console.error(error)
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedCustomer) return
    const amount = parseFloat(prompt('Enter Amount Received:'))
    if (!amount || isNaN(amount)) return

    try {
      const customer = customers.find((c) => c.id === selectedCustomer.id)
      const newTrans = {
        date: new Date(),
        summary: 'Cash Payment Received',
        amount,
        type: 'Payment',
      }
      const newTotalDue = customer.totalDue - amount
      const updatedTransactions = [...customer.transactions, newTrans]

      await customersAPI.update(selectedCustomer.id, {
        totalDue: newTotalDue,
        transactions: updatedTransactions,
      })

      // Create revenue record
      const revenueRecord = {
        id: Date.now(),
        customerName: customer.name + ' (Monthly Bill)',
        phone: customer.phone,
        items: [{ type: 'Bill Payment', qty: 1, price: amount }],
        totalAmount: amount,
        paymentStatus: 'Paid',
        status: 'Delivered',
        origin: 'ledger',
        date: new Date(),
      }
      await ordersAPI.create(revenueRecord)

      toast.success("Payment Recorded & Added to Today's Revenue!")
      fetchCustomers()
      if (selectedCustomer) {
        const updated = await customersAPI.getAll()
        const updatedCustomer = updated.data.find((c) => c.id === selectedCustomer.id)
        setSelectedCustomer(updatedCustomer)
      }
    } catch (error) {
      toast.error('Error recording payment')
      console.error(error)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return
    if (!window.confirm('⚠️ Are you sure you want to delete this customer?')) return

    try {
      await customersAPI.delete(selectedCustomer.id)
      toast.success('Customer deleted successfully')
      setSelectedCustomer(null)
      fetchCustomers()
    } catch (error) {
      toast.error('Failed to delete customer')
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
      
      {/* Page Header (Hides on Mobile if Customer is Selected) */}
      <h2 className={`text-3xl font-bold text-text-dark ${selectedCustomer ? 'hidden md:block' : 'block'}`}>
        Monthly Billing
      </h2>

      <div className="grid md:grid-cols-4 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: CUSTOMER LIST                 */}
        {/* Hides on Mobile if a customer is selected  */}
        {/* ========================================== */}
        <div className={`md:col-span-1 ${selectedCustomer ? 'hidden md:block' : 'block'}`}>
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
              <h5 className="font-bold text-primary">Subscribers</h5>
              <button
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="btn-primary text-sm py-1 px-3 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer..."
                  className="input-field pl-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto bg-white">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No customers found
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedCustomer?.id === customer.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h6 className="font-bold text-sm text-text-dark">{customer.name}</h6>
                      <span
                        className={`text-xs font-bold ${
                          customer.totalDue > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        ₹{customer.totalDue}
                      </span>
                    </div>
                    <small className="text-gray-500 text-xs">{customer.phone}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: CUSTOMER DETAILS (LEDGER)    */}
        {/* Hides on Mobile if NO customer is selected */}
        {/* ========================================== */}
        <div className={`md:col-span-3 ${!selectedCustomer ? 'hidden md:block' : 'block'}`}>
          {selectedCustomer ? (
            <div className="card overflow-hidden h-full flex flex-col">
              
              {/* Details Header */}
              <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-start bg-white">
                <div className="flex items-center">
                  {/* MOBILE BACK BUTTON */}
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="md:hidden mr-3 p-2 -ml-2 text-gray-500 hover:text-primary transition-colors rounded-full hover:bg-gray-100"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-text-dark mb-1">
                      {selectedCustomer.name}
                    </h4>
                    <small className="text-gray-500">{selectedCustomer.phone}</small>
                  </div>
                </div>
                <div className="text-right">
                  <small className="text-gray-500 block text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">Total Due</small>
                  <h2 className={`text-2xl sm:text-3xl font-bold ${selectedCustomer.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{selectedCustomer.totalDue}
                  </h2>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-2 sm:flex sm:flex-row gap-2">
                <button
                  onClick={() => setIsEntryModalOpen(true)}
                  className="btn-primary flex items-center justify-center col-span-2 sm:col-span-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </button>
                <button onClick={handleRecordPayment} className="btn-secondary flex items-center justify-center bg-white">
                  <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                  Payment
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  className="btn-secondary text-red-600 hover:bg-red-50 border-red-200 bg-white flex items-center justify-center"
                  title="Delete Customer"
                >
                  <Trash2 className="h-4 w-4 sm:mr-0" />
                  <span className="sm:hidden ml-2">Delete</span>
                </button>
              </div>

              {/* Transactions Area */}
              <div className="flex-1 bg-white">
                
                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCustomer.transactions && selectedCustomer.transactions.length > 0 ? (
                        selectedCustomer.transactions.slice().reverse().map((t, idx) => {
                          const dateStr = format(new Date(t.date), 'dd/MM/yyyy')
                          const badgeClass = t.type === 'Payment' ? 'badge-success' : t.type === 'Ironing' ? 'badge-info' : 'badge-danger'
                          const amtDisplay = t.type === 'Payment' ? `-₹${t.amount}` : `₹${t.amount}`
                          const textClass = t.type === 'Payment' ? 'text-green-600 font-bold' : 'text-text-dark font-medium'

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dateStr}</td>
                              <td className="px-6 py-4 text-sm text-gray-800">{t.summary}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`badge ${badgeClass}`}>{t.type}</span>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${textClass}`}>
                                {amtDisplay}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-500">No entries this month.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="block md:hidden divide-y divide-gray-100">
                  {selectedCustomer.transactions && selectedCustomer.transactions.length > 0 ? (
                    selectedCustomer.transactions.slice().reverse().map((t, idx) => {
                      const dateStr = format(new Date(t.date), 'dd MMM yyyy')
                      const badgeClass = t.type === 'Payment' ? 'badge-success' : t.type === 'Ironing' ? 'badge-info' : 'badge-danger'
                      const amtDisplay = t.type === 'Payment' ? `-₹${t.amount}` : `₹${t.amount}`
                      const textClass = t.type === 'Payment' ? 'text-green-600' : 'text-text-dark'

                      return (
                        <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{dateStr}</span>
                            <span className={`font-bold text-lg ${textClass}`}>{amtDisplay}</span>
                          </div>
                          <div className="text-sm font-medium text-gray-800 mb-2">{t.summary}</div>
                          <span className={`badge text-xs px-2 py-1 ${badgeClass}`}>{t.type}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-12 text-center text-gray-500">No entries this month.</div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            // EMPTY STATE (Only visible on Desktop when nothing is selected)
            <div className="card h-full flex items-center justify-center min-h-[400px] bg-gray-50/50">
              <div className="text-center text-gray-400">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Select a customer to view their monthly log.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Customer Modal */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <h5 className="text-xl font-bold mb-4 text-text-dark">Add Subscriber</h5>
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="input-field" />
              <input type="text" placeholder="Phone Number" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="input-field" />
              <input type="text" placeholder="Address / Flat No" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="input-field" />
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsNewCustomerModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreateCustomer} className="btn-primary flex-1">Save Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-0 overflow-hidden animate-fade-in-up">
            <div className="bg-primary text-white p-4 sm:p-6">
              <h5 className="text-xl font-bold">Add Daily Entry</h5>
              <p className="text-primary-light text-sm mt-1">For {selectedCustomer?.name}</p>
            </div>
            
            <div className="p-4 sm:p-6 space-y-5">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setEntryForm({ ...entryForm, type: 'ironing' })} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${entryForm.type === 'ironing' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
                  Ironing
                </button>
                <button onClick={() => setEntryForm({ ...entryForm, type: 'dryclean' })} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${entryForm.type === 'dryclean' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500'}`}>
                  Dry Cleaning
                </button>
              </div>

              {entryForm.type === 'ironing' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Item Type</label>
                    <select value={entryForm.ironItem} onChange={(e) => setEntryForm({ ...entryForm, ironItem: e.target.value })} className="input-field">
                      <option value="Shirt">Shirt</option>
                      <option value="Pant">Pant</option>
                      <option value="Salwar">Salwar</option>
                      <option value="Kamiz">Kamiz</option>
                      <option value="Blazer">Blazer</option>
                      <option value="Other">Other (Specify)</option>
                    </select>
                  </div>
                  
                  {entryForm.ironItem === 'Other' && (
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                        <input type="text" placeholder="Item Name" value={entryForm.otherName} onChange={(e) => setEntryForm({ ...entryForm, otherName: e.target.value })} className="input-field bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Rate (₹)</label>
                        <input type="number" placeholder="₹" value={entryForm.otherRate} onChange={(e) => setEntryForm({ ...entryForm, otherRate: e.target.value })} className="input-field bg-white" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                      <input type="number" value={entryForm.ironQty} onChange={(e) => setEntryForm({ ...entryForm, ironQty: parseInt(e.target.value) || 1 })} min="1" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rate / Pc (₹)</label>
                      <input type="number" value={entryForm.ironRate} onChange={(e) => setEntryForm({ ...entryForm, ironRate: e.target.value })} className="input-field" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Item Name</label>
                    <input type="text" placeholder="e.g. 3-Piece Suit" value={entryForm.dcItemName} onChange={(e) => setEntryForm({ ...entryForm, dcItemName: e.target.value })} className="input-field" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Base Rate (₹)</label>
                      <input type="number" placeholder="₹" value={entryForm.dcRate} onChange={(e) => setEntryForm({ ...entryForm, dcRate: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                      <input type="number" value={entryForm.dcQty} onChange={(e) => setEntryForm({ ...entryForm, dcQty: parseInt(e.target.value) || 1 })} min="1" className="input-field" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Stain / Extra Charge (₹)</label>
                    <input type="number" placeholder="Optional" value={entryForm.dcStain} onChange={(e) => setEntryForm({ ...entryForm, dcStain: e.target.value })} className="input-field bg-red-50 focus:bg-white border-red-100" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setIsEntryModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddEntry} className="btn-primary flex-1">Save Entry</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers