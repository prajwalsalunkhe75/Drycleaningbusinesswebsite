import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Printer, Trash2, Mic, MicOff, CheckCircle, AlertCircle, Camera, X, Loader } from 'lucide-react'
import { ordersAPI, customersAPI, settingsAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { format, isToday } from 'date-fns'
import { parseVoiceCommand, DRYCLEAN_ITEMS, IRONING_ITEMS } from '../utils/voiceParser'
import { validators, validateForm } from '../utils/validation'
import { handleError, getErrorMessage } from '../utils/errorHandler'
import { Pagination } from '../components/Pagination'
import { SkeletonLoader, EmptyState, ErrorState } from '../components/DataStates'
import { ConfirmDialog } from '../components/ConfirmDialog'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10
  
  const [searchQuery, setSearchQuery] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteOrderId, setDeleteOrderId] = useState(null)
  
  const [paymentPopupOrder, setPaymentPopupOrder] = useState(null)
  const [paymentPopupAmount, setPaymentPopupAmount] = useState('')
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  
  // Photo Evidence
  const [evidencePhotos, setEvidencePhotos] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  
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

  // Smart Upgrades State
  const [allCustomers, setAllCustomers] = useState([])
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showCustSuggestions, setShowCustSuggestions] = useState(false)
  const [itemSuggestions, setItemSuggestions] = useState([])
  const [showItemSuggestions, setShowItemSuggestions] = useState(false)
  const [settings, setSettings] = useState(null)

  // Voice Entry
  const [isListening, setIsListening] = useState(false)
  const [spokenText, setSpokenText] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-IN'

      recognition.onstart = () => setIsListening(true)
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('')
        setSpokenText(transcript)
      }

      recognition.onerror = (event) => {
        setIsListening(false)
        if (event.error !== 'no-speech') toast.error('Voice recognition failed')
      }

      recognition.onend = () => setIsListening(false)
      recognitionRef.current = recognition
    }
  }, [])

  useEffect(() => {
    if (!isListening && spokenText) {
      processOrdersVoiceCommand(spokenText.toLowerCase())
      setTimeout(() => setSpokenText(''), 2000)
    }
  }, [isListening])

  const processOrdersVoiceCommand = (text) => {
    const { names, items } = parseVoiceCommand(text)
    
    // Find ticket no (first string that is purely numbers)
    const newTicketNo = names.find(n => !isNaN(parseInt(n))) || formData.ticketNo
    // The rest is customer name
    const newCustName = names.filter(n => isNaN(parseInt(n))).join(' ') || formData.custName

    const newItems = items.map(parsed => {
      let price = parsed.itemConfig.defaultPrice || 50
      if (parsed.overridePrice) price = parsed.overridePrice
      
      return {
        clothType: parsed.itemConfig.name,
        clothRate: price,
        clothQty: parsed.qty,
        total: price * parsed.qty
      }
    })

    setFormData(prev => ({
      ...prev,
      ticketNo: newTicketNo,
      custName: newCustName,
      items: [...prev.items, ...newItems]
    }))

    if (newItems.length > 0) {
      toast.success(`Voice applied ${newItems.length} items to record!`)
    } else if (names.length > 0) {
      toast.success('Customer info applied.')
    } else {
      toast.error('Voice not recognized.')
    }
  }

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      if (recognitionRef.current) {
        setSpokenText('')
        recognitionRef.current.start()
        toast.success('Listening...', { icon: '🎤', duration: 4000 })
      } else {
        toast.error('Voice not supported')
      }
    }
  }

  useEffect(() => {
    fetchOrders()
    loadCustomers()
    loadSettings()
  }, [])

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getAll()
      const data = Array.isArray(response.data?.data) ? response.data.data : (Array.isArray(response.data) ? response.data : response.data?.customers || [])
      setAllCustomers(data)
    } catch { setAllCustomers([]) }
  }

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.get()
      setSettings(response.data)
    } catch { }
  }

  const handleDeleteOrder = (orderId) => {
    setDeleteOrderId(orderId)
    setShowDeleteConfirm(true)
  }

  // Handlers for Autocomplete
  const handleCustNameChange = (val) => {
    setFormData({ ...formData, custName: val })
    if (val.length >= 2) {
      const matches = allCustomers.filter(c => c.name?.toLowerCase().includes(val.toLowerCase()))
      setCustomerSuggestions(matches.slice(0, 5))
      setShowCustSuggestions(matches.length > 0)
    } else setShowCustSuggestions(false)
  }

  const selectCustomer = (cust) => {
    setFormData({ ...formData, custName: cust.name })
    setShowCustSuggestions(false)
  }

  const handleItemTypeChange = (val) => {
    setCurrentItem({ ...currentItem, clothType: val })
    if (val.length >= 1) {
      const matches = [...DRYCLEAN_ITEMS, ...IRONING_ITEMS].filter(i => i.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
      setItemSuggestions(matches)
      setShowItemSuggestions(matches.length > 0)
    } else setShowItemSuggestions(false)
  }

  const selectItemSuggestion = (itemConfig) => {
    let price = itemConfig.defaultPrice || 50
    if (itemConfig.settingsKey && settings?.regular?.[itemConfig.settingsKey]) {
      price = settings.regular[itemConfig.settingsKey]
    }
    setCurrentItem({ clothType: itemConfig.name, clothRate: price, clothQty: 1 })
    setShowItemSuggestions(false)
  }

  // Operational Toggles
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
      setOrders(orders.map(o => (o._id === order._id || o.id === order.id) ? { ...o, paymentStatus: status, advanceAmount: newAdvance } : o))
      setFilteredOrders(filteredOrders.map(o => (o._id === order._id || o.id === order.id) ? { ...o, paymentStatus: status, advanceAmount: newAdvance } : o))
      await ordersAPI.update(order._id || order.id, { paymentStatus: status, advanceAmount: newAdvance })
      toast.success(`Payment updated to ${status}`)
      fetchOrders()
      setPaymentPopupOrder(null)
    } catch (error) { 
      toast.error('Failed to update payment')
      fetchOrders()
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

  const toggleOrderStatus = async (order) => {
    try {
      const states = ['Pending', 'Ready', 'Delivered']
      const currentIdx = states.indexOf(order.status || 'Pending')
      const nextStatus = states[(currentIdx + 1) % states.length]
      // Optimistic update
      setOrders(orders.map(o => (o._id === order._id || o.id === order.id) ? { ...o, status: nextStatus } : o))
      setFilteredOrders(filteredOrders.map(o => (o._id === order._id || o.id === order.id) ? { ...o, status: nextStatus } : o))
      await ordersAPI.update(order._id || order.id, { status: nextStatus })
      toast.success(`Status updated to ${nextStatus}`)
    } catch (error) { toast.error('Update failed'); fetchOrders() }
  }

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery])

  const fetchOrders = async (pageNum = 1) => {
    try {
      setLoading(true)
      setError(null)
      const response = await ordersAPI.getAll(pageNum, itemsPerPage)
      const ordersData = response.data?.data || response.data || []
      const recordsOrders = (Array.isArray(ordersData) ? ordersData : []).filter((o) => o.origin === 'records' || !o.origin)
      setOrders(recordsOrders)
      setFilteredOrders(recordsOrders)
      setPage(pageNum)
      setTotalPages(response.data?.pagination?.totalPages || 0)
      setTotalItems(response.data?.pagination?.total || 0)
      
      // Auto-Increment Ticket Logic
      if (recordsOrders.length > 0 && !formData.ticketNo) {
        const maxId = Math.max(...recordsOrders.map(o => {
           const parsed = parseInt(o.id)
           return isNaN(parsed) ? 0 : parsed
        }))
        if (maxId > 0) {
          setFormData(prev => ({ ...prev, ticketNo: (maxId + 1).toString() }))
        }
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'records')
      setError(errorMsg)
      toast.error(errorMsg)
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
    
    // Validate items
    if (formData.items.length === 0) {
      setFormErrors({ items: 'Please add at least one cloth item' })
      toast.error('Please add at least one cloth item')
      return
    }

    // Validate form fields
    const validationSchema = {
      ticketNo: [validators.required, validators.ticketNo],
      custName: [validators.required, validators.name],
    }

    const { isValid, errors } = validateForm({
      ticketNo: formData.ticketNo,
      custName: formData.custName,
    }, validationSchema)

    if (!isValid) {
      setFormErrors(errors)
      toast.error('Please fix the errors in the form')
      return
    }

    try {
      setFormErrors({})
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
        advanceAmount: 0,
        evidencePhotos,
        origin: 'records',
        date: new Date(),
      }

      await ordersAPI.create(newOrder)
      toast.success('Record saved successfully!')
      
      // Reset form
      setFormData({ ticketNo: '', custName: '', items: [], extraCharges: '' })
      setCurrentItem({ clothType: '', clothRate: '', clothQty: 1 })
      setEvidencePhotos([])
      fetchOrders()
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'create order')
      setFormErrors({ submit: errorMsg })
      toast.error(errorMsg)
    }
  }

  // Dashboard Metrics Calculation
  const todayRevenue = filteredOrders
    .filter(o => isToday(new Date(o.date)))
    .reduce((sum, o) => {
       const amt = o.advanceAmount !== undefined ? parseFloat(o.advanceAmount) : (o.paymentStatus === 'Paid' ? (o.totalAmount || 0) : 0);
       return sum + (amt || 0);
    }, 0)

  const pendingClothesCount = filteredOrders
    .filter(o => o.status === 'Pending')
    .reduce((sum, o) => {
      const itemsCount = o.items ? o.items.reduce((itemSum, i) => itemSum + (parseInt(i.qty) || 0), 0) : 0
      return sum + itemsCount
    }, 0)

  const unpaidBalance = filteredOrders
    .filter(o => o.paymentStatus !== 'Paid')
    .reduce((sum, o) => sum + ((o.totalAmount || 0) - (o.advanceAmount || 0)), 0)

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

      {/* Live Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-white p-4 rounded-xl shadow-sm border-l-4 border-primary">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Today's Revenue</p>
          <h3 className="text-2xl font-bold text-text-dark mt-1">₹{todayRevenue}</h3>
        </div>
        <div className="card bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending Clothes</p>
          <h3 className="text-2xl font-bold text-text-dark mt-1">{pendingClothesCount}</h3>
        </div>
        <div className="card bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-400">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Unpaid Balance</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">₹{unpaidBalance}</h3>
        </div>
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
                  <div className="flex gap-2 relative">
                    <input
                      type="text"
                      value={formData.custName}
                      onChange={(e) => handleCustNameChange(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Full Name"
                      required
                      autoComplete="off"
                    />
                    {showCustSuggestions && (
                      <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto w-full sm:w-64">
                        {customerSuggestions.map((cust) => (
                          <li
                            key={cust._id}
                            onClick={() => selectCustomer(cust)}
                            className="px-4 py-2 hover:bg-primary-50 cursor-pointer flex justify-between items-center transition-colors"
                          >
                            <span className="font-medium text-text-dark">{cust.name}</span>
                            {cust.phone && <span className="text-xs text-gray-400">{cust.phone}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`h-11 w-11 flex items-center justify-center rounded-xl shadow-sm transition-all flex-shrink-0 ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse shadow-red-500/30'
                          : 'bg-primary text-white hover:bg-primary-dark hover:shadow-primary/30'
                      }`}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    
                    {isListening && spokenText && (
                      <div className="absolute top-14 right-0 w-64 bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-2xl z-50">
                        <p className="text-gray-300 text-xs uppercase font-bold tracking-wider mb-1">Listening...</p>
                        <p className="font-medium text-white text-sm">{spokenText}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Item Entry Area */}
              <div>
                <h6 className="text-sm font-bold text-gray-800 mb-3">Add Cloth Details</h6>
                
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 mb-3">
                  <div className="col-span-2 sm:col-span-5 relative">
                    <input
                      type="text"
                      placeholder="Item (e.g. Coat)"
                      value={currentItem.clothType}
                      onChange={(e) => handleItemTypeChange(e.target.value)}
                      className="input-field w-full"
                      autoComplete="off"
                    />
                    {showItemSuggestions && (
                      <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {itemSuggestions.map((item) => (
                          <li
                            key={item.id}
                            onClick={() => selectItemSuggestion(item)}
                            className="px-3 py-2 hover:bg-primary-50 cursor-pointer flex justify-between items-center transition-colors text-sm"
                          >
                            <span className="font-medium text-text-dark">{item.name}</span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                              {item.id.startsWith('dc_') ? 'DC' : 'Iron'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
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
                  <div className="col-span-2 sm:col-span-2 flex gap-1">
                    <button
                      type="button"
                      onClick={addItem}
                      className="btn-primary flex-1 h-11 flex justify-center items-center py-2"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <label className={`w-11 h-11 flex items-center justify-center rounded-xl border-2 transition-colors cursor-pointer flex-shrink-0 ${isUploading ? 'bg-purple-100 border-purple-200 text-purple-600' : 'bg-white border-purple-100 text-purple-600 hover:bg-purple-50 hover:border-purple-200'}`}>
                      {isUploading ? <Loader className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                      <input type="file" accept="image/*" capture="environment" hidden onChange={handleCameraCapture} disabled={isUploading} />
                    </label>
                  </div>
                </div>

                {/* Photo Evidence Thumbnails Preview */}
                {evidencePhotos.length > 0 && (
                  <div className="mb-4 bg-purple-50/50 p-2 rounded-xl border border-purple-100 flex items-center gap-2 overflow-x-auto shadow-inner">
                    <span className="text-[10px] font-bold text-purple-800 shrink-0 uppercase tracking-tighter">📸 Evidence for Ticket:</span>
                    {evidencePhotos.map((url, i) => (
                      <div key={i} className="relative shrink-0 group">
                        <img src={url} alt="Evidence" className="w-10 h-10 object-cover rounded-lg border-2 border-white shadow-sm" />
                        <button 
                          type="button"
                          onClick={(e) => { e.preventDefault(); setEvidencePhotos(prev => prev.filter((_, index) => index !== i)) }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

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
          <div className="card dark:bg-slate-800 overflow-hidden bg-white shadow-sm rounded-xl">
            
            {/* Table Header & Search */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-800">
              <h5 className="text-xl font-bold text-text-dark dark:text-white">Log Book</h5>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Ticket # or Name..."
                  className="input-field dark:bg-slate-700 dark:text-white dark:border-gray-600 pl-9 text-sm w-full sm:w-64"
                />
              </div>
            </div>

            {/* DESKTOP VIEW: STANDARD TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date / Ticket</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Summary</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">📸 Photos</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Delete</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                          <tr key={order._id || order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors dark:bg-slate-800 dark:border-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-bold text-text-dark dark:text-white">#{order.id}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{dateStr}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-primary dark:text-cyan-400">
                              {order.customerName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={summary}>
                              {summary}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 dark:text-green-400 font-bold text-lg">
                              ₹{order.totalAmount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => toggleOrderStatus(order)}
                                className={`px-3 py-1 rounded shadow-sm text-xs font-bold transition-all ${
                                  order.status === 'Delivered' ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' :
                                  order.status === 'Ready' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50' :
                                  'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
                                }`}
                              >
                                {order.status || 'Pending'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handlePaymentClick(order)}
                                className={`px-3 py-1 rounded shadow-sm text-xs font-bold transition-all ${
                                  order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' : 
                                  order.paymentStatus === 'Partial' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50' :
                                  'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                                }`}
                              >
                                {order.paymentStatus === 'Paid' ? 'Paid 🟢' : order.paymentStatus === 'Partial' ? 'Partial 🟠' : 'Unpaid 🔴'}
                                {order.paymentStatus === 'Partial' && <span className="ml-1 tracking-tighter">({order.advanceAmount}/{order.totalAmount})</span>}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {order.evidencePhotos && order.evidencePhotos.length > 0 ? (
                                <div className="flex justify-center -space-x-2">
                                  {order.evidencePhotos.map((url, i) => (
                                    <img 
                                      key={i} 
                                      src={url} 
                                      alt="Evidence" 
                                      onClick={(e) => { e.stopPropagation(); setLightboxPhoto(url) }}
                                      className="w-10 h-10 rounded shadow-md border-2 border-white object-cover cursor-pointer hover:z-20 hover:scale-125 transition-transform bg-gray-100"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => {
                                  setDeleteOrderId(order._id || order.id)
                                  setShowDeleteConfirm(true)
                                }}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete order"
                                aria-label={`Delete order ${order.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleOrderStatus(order)}
                              className={`px-2 py-1 rounded shadow-sm text-[10px] font-bold transition-all ${
                                order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'Ready' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {order.status || 'Pending'}
                            </button>
                            <button
                              onClick={() => handlePaymentClick(order)}
                              className={`px-2 py-1 rounded shadow-sm text-[10px] font-bold transition-all ${
                                order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                order.paymentStatus === 'Partial' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}
                            >
                              {order.paymentStatus === 'Paid' ? 'Paid' : order.paymentStatus === 'Partial' ? 'Partial' : 'Unpaid'}
                              {order.paymentStatus === 'Partial' && <span className="ml-1 tracking-tighter">({order.advanceAmount}/{order.totalAmount})</span>}
                            </button>
                          </div>
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

                        {/* Evidence Photos */}
                        {order.evidencePhotos && order.evidencePhotos.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">📸 Evidence</span>
                            {order.evidencePhotos.map((url, i) => (
                              <img 
                                key={i} 
                                src={url} 
                                alt="Evidence photo" 
                                onClick={(e) => { e.stopPropagation(); setLightboxPhoto(url) }}
                                className="w-9 h-9 rounded shadow-sm border border-gray-200 object-cover cursor-pointer shrink-0 active:scale-95 transition-transform"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
              )}
            </div>

            {/* States */}
            {loading && <SkeletonLoader count={5} variant="table" />}
            {error && <ErrorState onRetry={() => fetchOrders(1)} />}
            {!loading && !error && filteredOrders.length === 0 && searchQuery === '' && (
              <EmptyState
                title="No Orders Found"
                description="No orders in your records yet. Create one to get started!"
                action={{ label: 'Create Order', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            )}
            {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && searchQuery !== '' && (
              <EmptyState
                title="No Orders Matching Search"
                description={`No orders found matching "${searchQuery}"`}
              />
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={(newPage) => fetchOrders(newPage)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Order?"
        message={`Are you sure you want to delete order #${deleteOrderId}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={async () => {
          try {
            await ordersAPI.delete(deleteOrderId)
            toast.success('Order deleted successfully')
            setShowDeleteConfirm(false)
            fetchOrders(page)
          } catch (error) {
            toast.error(getErrorMessage(error, 'delete order'))
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

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

      {/* Lightbox Overlay */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4" onClick={() => setLightboxPhoto(null)}>
          <button onClick={() => setLightboxPhoto(null)} className="absolute top-6 right-6 text-white bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors">
            <X className="w-8 h-8" />
          </button>
          <img src={lightboxPhoto} alt="Evidence Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border-4 border-white/10" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

export default Orders