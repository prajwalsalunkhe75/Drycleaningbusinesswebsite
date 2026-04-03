import { useState, useEffect, useRef } from 'react'
import { Plus, Search, DollarSign, Trash2, FileText, ArrowLeft, Mic, MicOff, MessageCircle, CheckCircle } from 'lucide-react'
import { customersAPI, ordersAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { parseVoiceCommand, parseVoiceCommandAI } from '../utils/voiceParser'
import { validators, validateForm } from '../utils/validation'
import { handleError, getErrorMessage } from '../utils/errorHandler'
import { Pagination } from '../components/Pagination'
import { SkeletonLoader, EmptyState, ErrorState } from '../components/DataStates'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormInput } from '../components/FormFields'
import OrderModal from '../components/OrderModal'

const Customers = () => {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10
  
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [paymentPopupCustomer, setPaymentPopupCustomer] = useState(null)
  const [paymentPopupAmount, setPaymentPopupAmount] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteCustomerId, setDeleteCustomerId] = useState(null)
  
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
  })

  // Voice Entry & Settings
  const [isListening, setIsListening] = useState(false)
  const [listeningMode, setListeningMode] = useState('ledger')
  const [spokenText, setSpokenText] = useState('')
  const recognitionRef = useRef(null)
  const [wageRates, setWageRates] = useState({})
  const [geminiKey, setGeminiKey] = useState('')
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  useEffect(() => {
    loadSettings()
    fetchCustomers()

    const storedPrices = localStorage.getItem('laundryPrices')
    if (storedPrices) {
      try {
        setWageRates(JSON.parse(storedPrices))
      } catch (e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = localStorage.getItem('voiceLanguage') || 'en-IN'

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

  const loadSettings = async () => {
    try {
      const resp = await settingsAPI.get()
      if (resp.data?.geminiApiKey) setGeminiKey(resp.data.geminiApiKey)
    } catch {
      const saved = localStorage.getItem('laundryPrices')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.geminiApiKey) setGeminiKey(parsed.geminiApiKey)
        } catch {}
      }
    }
  }

  useEffect(() => {
    if (!isListening && spokenText) {
      if (listeningMode === 'ledger') {
        processLedgerVoiceCommand(spokenText.toLowerCase())
      } else if (listeningMode === 'new_customer') {
        processNewCustomerVoiceCommand(spokenText.toLowerCase())
      }
      setTimeout(() => setSpokenText(''), 2000)
    }
  }, [isListening])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchQuery])

  const fetchCustomers = async (pageNum = 1) => {
    try {
      setLoading(true)
      setError(null)
      const response = await customersAPI.getAll(pageNum, itemsPerPage)
      // Handle paginated response
      const data = response.data?.data || response.data || []
      const customersData = Array.isArray(data) ? data : (data?.customers || [])
      setCustomers(customersData)
      setFilteredCustomers(customersData)
      setPage(pageNum)
      setTotalPages(response.data?.pagination?.totalPages || 0)
      setTotalItems(response.data?.pagination?.total || 0)
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'customers')
      setError(errorMsg)
      toast.error(errorMsg)
      setCustomers([])
      setFilteredCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    if (!Array.isArray(customers)) return

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

    const validationSchema = {
      name: [validators.required, validators.name],
      phone: [validators.required, validators.phone],
      address: [validators.required, validators.address],
    }

    const { isValid, errors } = validateForm(newCustomer, validationSchema)
    
    if (!isValid) {
      setFormErrors(errors)
      toast.error('Please fix the errors in the form')
      return
    }

    try {
      setFormErrors({})
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
      const errorMsg = getErrorMessage(error, 'create customer')
      setFormErrors({ submit: errorMsg })
      toast.error(errorMsg)
    }
  }

  const processLedgerVoiceCommand = async (text) => {
    if (!selectedCustomer) {
      toast.error('Select a customer first to log items!')
      return
    }

    let items = []
    if (geminiKey) {
        try {
            setIsAiProcessing(true)
            toast.loading('AI is processing...', { id: 'ledger-ai' })
            const aiResult = await parseVoiceCommandAI(text, geminiKey)
            toast.dismiss('ledger-ai')
            
            if (aiResult.items && aiResult.items.length > 0) {
                // Map AI result to internal structure
                items = aiResult.items.map(ai => ({
                    itemConfig: { id: ai.name.toLowerCase().includes('shirt') ? 'shirt' : ai.name.toLowerCase(), name: ai.name, defaultPrice: ai.price || 50 },
                    qty: ai.qty,
                    overrideMode: ai.category,
                    explicitMode: !!ai.category,
                    overridePrice: ai.price
                }))
            }
        } catch (err) {
            toast.dismiss('ledger-ai')
            console.error("Ledger AI error", err)
        } finally {
            setIsAiProcessing(false)
        }
    }

    if (items.length === 0) {
        const result = parseVoiceCommand(text)
        items = result.items
    }
    
    if (items.length === 0) {
      toast.error('Could not understand items spoken.')
      return
    }

    const customer = customers.find((c) => (c.id || c._id) === (selectedCustomer.id || selectedCustomer._id))
    let totalAdded = 0
    const newTransactions = []

    items.forEach(parsed => {
      const { itemConfig, qty, overrideMode, explicitMode, overridePrice } = parsed
      
      let type = overrideMode || 'Ironing'
      if (itemConfig.id.startsWith('dc_')) {
        type = 'DryClean'
      }
      if (explicitMode && overrideMode) {
         type = overrideMode
      }

      // Calculate Price
      let rate = 0
      if (overridePrice !== null) {
        rate = overridePrice
      } else if (type === 'DryClean') {
        const priceMap = wageRates.dryClean || {}
        rate = priceMap[itemConfig.id] || itemConfig.defaultPrice || 50
      } else {
        const priceMap = wageRates.ironing || {}
        rate = priceMap[itemConfig.id] || 10
      }
      
      const amount = qty * rate
      totalAdded += amount
      
      newTransactions.push({
        date: new Date(),
        summary: `${qty} x ${itemConfig.name} (${type})`,
        amount: amount,
        type: type
      })
    })

    try {
      const newTotalDue = (customer.totalDue || 0) + totalAdded
      const updatedTransactions = [...(customer.transactions || []), ...newTransactions]

      await customersAPI.update(customer.id || customer._id, {
        totalDue: newTotalDue,
        transactions: updatedTransactions,
      })

      toast.success(`Voice applied ₹${totalAdded} to ledger!`)
      fetchCustomers()
      
      const updatedResponse = await customersAPI.getAll()
      const responseData = updatedResponse.data?.data || updatedResponse.data || []
      const list = Array.isArray(responseData) ? responseData : (responseData?.customers || [])
      setSelectedCustomer(list.find((c) => (c.id || c._id) === (selectedCustomer.id || selectedCustomer._id)))

    } catch (error) {
       console.error("Failed voice submit", error)
       toast.error('Failed to log voice items')
    }
  }

  const processNewCustomerVoiceCommand = async (text) => {
    let names = []
    let phone = ''

    if (geminiKey) {
        try {
            setIsAiProcessing(true)
            toast.loading('AI processing...', { id: 'cust-ai' })
            const aiResult = await parseVoiceCommandAI(text, geminiKey)
            toast.dismiss('cust-ai')
            names = aiResult.names || []
            phone = aiResult.phone || ''
        } catch (err) {
            toast.dismiss('cust-ai')
            console.error("Cust AI error", err)
        } finally {
            setIsAiProcessing(false)
        }
    }

    if (names.length === 0 && !phone) {
        const result = parseVoiceCommand(text)
        names = result.names
        phone = result.phone
    }
    
    setNewCustomer(prev => ({
      ...prev,
      name: names.length > 0 ? names.join(' ') : prev.name,
      phone: phone || prev.phone
    }))
    
    if (names.length > 0 || phone) {
      toast.success('Voice applied to customer form!')
    } else {
      toast.error('Could not catch name or phone number')
    }
  }

  const toggleListening = (mode = 'ledger') => {
    setListeningMode(mode)
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

  const handleRecordPayment = async () => {
    if (!paymentPopupCustomer) return
    const amount = parseFloat(paymentPopupAmount)
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount')
      return
    }

    try {
      const customer = customers.find((c) => (c.id || c._id) === (paymentPopupCustomer.id || paymentPopupCustomer._id))
      const newTrans = {
        date: new Date(),
        summary: 'Cash Payment Received',
        amount,
        type: 'Payment',
      }
      const newTotalDue = (customer.totalDue || 0) - amount
      const updatedTransactions = [...(customer.transactions || []), newTrans]

      await customersAPI.update(customer.id || customer._id, {
        totalDue: newTotalDue,
        transactions: updatedTransactions,
      })

      // Add to main revenue stream
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

      toast.success("Payment Recorded!")
      setPaymentPopupCustomer(null)
      fetchCustomers()
      
      // Refresh current view
      const updatedResponse = await customersAPI.getAll()
      const responseData = updatedResponse.data?.data || updatedResponse.data || []
      const list = Array.isArray(responseData) ? responseData : (responseData?.customers || [])
      setSelectedCustomer(list.find((c) => (c.id || c._id) === (paymentPopupCustomer.id || paymentPopupCustomer._id)))
    } catch (error) {
      toast.error('Error recording payment')
    }
  }

  const handleSendBill = () => {
    if (!selectedCustomer) return
    const customer = customers.find((c) => (c.id || c._id) === (selectedCustomer.id || selectedCustomer._id))
    
    const activeTransactions = customer.transactions || []
    
    let text = `*Monthly Bill - Prajwal Dry Cleaners*\n`
    text += `Customer: ${customer.name}\n`
    text += `Date: ${format(new Date(), 'dd/MM/yyyy')}\n\n`
    
    text += `*Ledger Summary:*\n`
    // Top 15 recent transactions
    const recent = [...activeTransactions].reverse().slice(0, 15)
    recent.forEach(t => {
       const sign = t.type === 'Payment' ? '-' : '+'
       text += `• ${format(new Date(t.date), 'dd/MM')} - ${t.summary}: ${sign}₹${t.amount}\n`
    })
    
    if (activeTransactions.length > 15) {
       text += `...and older items.\n`
    }
    
    text += `\n*TOTAL OUTSTANDING DUE: ₹${customer.totalDue}*\n\n`
    text += `Please process the payment at your earliest convenience. Thank you!`
    
    const url = `https://wa.me/91${customer.phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleClearBalance = async () => {
    if (!selectedCustomer) return
    const customer = customers.find((c) => (c.id || c._id) === (selectedCustomer.id || selectedCustomer._id))
    
    if (customer.totalDue <= 0) {
      toast.error('Balance is already zero or in credit')
      return
    }

    if (!window.confirm(`Are you sure you want to clear the full balance of ₹${customer.totalDue}?`)) return

    try {
      const amount = customer.totalDue
      const newTrans = {
        date: new Date(),
        summary: 'Full Balance Cleared',
        amount: amount,
        type: 'Payment',
      }
      const updatedTransactions = [...(customer.transactions || []), newTrans]

      await customersAPI.update(customer.id || customer._id, {
        totalDue: 0,
        transactions: updatedTransactions,
      })

      // Revenue sync
      const revenueRecord = {
        id: Date.now(),
        customerName: customer.name + ' (Monthly Bill)',
        phone: customer.phone,
        items: [{ type: 'Full Bill Payment', qty: 1, price: amount }],
        totalAmount: amount,
        paymentStatus: 'Paid',
        status: 'Delivered',
        origin: 'ledger',
        date: new Date(),
      }
      await ordersAPI.create(revenueRecord)

      toast.success("Balance Cleared!")
      fetchCustomers()
      
      const updatedResponse = await customersAPI.getAll()
      const responseData = updatedResponse.data?.data || updatedResponse.data || []
      const list = Array.isArray(responseData) ? responseData : (responseData?.customers || [])
      setSelectedCustomer(list.find((c) => (c.id || c._id) === (selectedCustomer.id || selectedCustomer._id)))
    } catch (error) {
      toast.error('Error clearing balance')
    }
  }

  const handleDeleteCustomer = (customerId) => {
    setDeleteCustomerId(customerId)
    setShowDeleteConfirm(true)
  }

  const handleDeleteLedgerEntry = async (originalIndex) => {
    if (!selectedCustomer) return
    if (!window.confirm('⚠️ Are you sure you want to delete this specific entry?')) return

    const customer = customers.find((c) => (c.id || c._id) === (selectedCustomer.id || selectedCustomer._id))
    const entryToDelete = customer.transactions[originalIndex]
    
    let newTotalDue = customer.totalDue || 0
    if (entryToDelete.type === 'Payment') {
      newTotalDue += entryToDelete.amount
    } else {
      newTotalDue -= entryToDelete.amount
    }

    const updatedTransactions = [...customer.transactions]
    updatedTransactions.splice(originalIndex, 1)

    try {
      await customersAPI.update(customer.id || customer._id, {
        totalDue: newTotalDue,
        transactions: updatedTransactions,
      })

      toast.success('Entry deleted successfully!')
      fetchCustomers()
      
      const updatedResponse = await customersAPI.getAll()
      const list = Array.isArray(updatedResponse.data) ? updatedResponse.data : updatedResponse.data?.customers || []
      setSelectedCustomer(list.find((c) => (c.id || c._id) === (selectedCustomer.id || selectedCustomer._id)))
    } catch (error) {
      toast.error('Failed to delete entry')
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
      <h2 className={`text-3xl font-bold text-text-dark dark:text-white ${selectedCustomer ? 'hidden md:block' : 'block'}`}>
        Monthly Billing
      </h2>

      <div className="grid md:grid-cols-4 gap-6">
        {/* CUSTOMER LIST */}
        <div className={`md:col-span-1 ${selectedCustomer ? 'hidden md:block' : 'block'}`}>
          <div className="card dark:bg-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-slate-800">
              <h5 className="font-bold text-primary dark:text-cyan-400">Subscribers</h5>
              <button onClick={() => setIsNewCustomerModalOpen(true)} className="btn-primary text-sm py-1 px-3 flex items-center">
                <Plus className="h-4 w-4 mr-1" /> New
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer..."
                  className="input-field dark:bg-slate-700 dark:text-white dark:border-gray-600 pl-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-800">
              {!Array.isArray(filteredCustomers) || filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No customers found</div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id || customer._id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                      (selectedCustomer?.id || selectedCustomer?._id) === (customer.id || customer._id) 
                      ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' 
                      : 'border-l-4 border-l-transparent dark:bg-slate-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h6 className="font-bold text-sm text-text-dark dark:text-white">{customer.name}</h6>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${customer.totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          ₹{customer.totalDue}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomer(customer.id || customer._id)
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete customer"
                          aria-label={`Delete customer ${customer.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <small className="text-gray-500 dark:text-gray-400 text-xs">{customer.phone}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CUSTOMER DETAILS (LEDGER) */}
        <div className={`md:col-span-3 ${!selectedCustomer ? 'hidden md:block' : 'block'}`}>
          {selectedCustomer ? (
            <div className="card overflow-hidden h-full flex flex-col">
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-start bg-white dark:bg-slate-800">
                <div className="flex items-center">
                  <button onClick={() => setSelectedCustomer(null)} className="md:hidden mr-3 p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-text-dark dark:text-white mb-1">{selectedCustomer.name}</h4>
                    <small className="text-gray-500 dark:text-gray-400">{selectedCustomer.phone}</small>
                  </div>
                </div>
                <div className="text-right">
                  <small className="text-gray-500 dark:text-gray-400 block text-xs font-semibold uppercase tracking-wider mb-1">Total Due</small>
                  <h2 className={`text-2xl sm:text-3xl font-bold ${selectedCustomer.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{selectedCustomer.totalDue}
                  </h2>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  onClick={() => toggleListening('ledger')}
                  className={`col-span-2 sm:col-span-5 btn-primary flex flex-col items-center justify-center py-4 transition-all duration-300 ${
                    isListening ? 'animate-pulse bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200' : 'bg-primary'
                  }`}
                >
                  <div className="flex items-center text-lg font-bold">
                    {isListening ? (
                      <><MicOff className="h-6 w-6 mr-2" /> Stop Listening</>
                    ) : (
                      <><Mic className="h-6 w-6 mr-2" /> Hold to Log Items (Voice)</>
                    )}
                  </div>
                  {spokenText && <p className="text-xs font-normal mt-2 opacity-90 italic">"{spokenText}"</p>}
                </button>
                
                <button onClick={handleClearBalance} className="btn-secondary flex items-center justify-center bg-white dark:bg-slate-600 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 shadow-sm text-xs py-2 px-1">
                  <CheckCircle className="h-4 w-4 sm:mr-1 text-green-600" /> Settle
                </button>
                <button onClick={() => setPaymentPopupCustomer(selectedCustomer)} className="btn-secondary flex items-center justify-center bg-white dark:bg-slate-600 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm text-xs py-2 px-1">
                  <DollarSign className="h-4 w-4 sm:mr-1 text-blue-600" /> Pay In
                </button>
                <button onClick={handleSendBill} className="btn-secondary flex items-center justify-center bg-white dark:bg-slate-600 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm text-xs py-2 px-1">
                  <MessageCircle className="h-4 w-4 sm:mr-1" /> Bill
                </button>
                <button onClick={() => setIsEntryModalOpen(true)} className="btn-secondary flex items-center justify-center bg-white dark:bg-slate-600 shadow-sm text-xs py-2 px-1">
                  <Plus className="h-4 w-4 sm:mr-1" /> Add
                </button>
                <button onClick={handleDeleteCustomer} className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border-red-200 dark:border-red-700 bg-white dark:bg-slate-600 flex items-center justify-center shadow-sm text-xs py-2 px-1">
                  <Trash2 className="h-4 w-4" /> Del
                </button>
              </div>

              <div className="flex-1 bg-white dark:bg-slate-800 overflow-y-auto">
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {Array.isArray(selectedCustomer.transactions) && selectedCustomer.transactions.length > 0 ? (
                        [...selectedCustomer.transactions].map((t, i) => ({ ...t, originalIndex: i })).reverse().map((t) => (
                          <tr key={t.originalIndex} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                            <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{t.summary}</td>
                            <td className="px-6 py-4"><span className={`badge ${t.type === 'Payment' ? 'badge-success' : 'badge-info'}`}>{t.type}</span></td>
                            <td className={`px-6 py-4 text-right text-sm font-bold ${t.type === 'Payment' ? 'text-green-600 dark:text-green-400' : 'text-text-dark dark:text-gray-200'}`}>
                              {t.type === 'Payment' ? `-₹${t.amount}` : `₹${t.amount}`}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => handleDeleteLedgerEntry(t.originalIndex)} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No entries recorded.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
                  {Array.isArray(selectedCustomer.transactions) && [...selectedCustomer.transactions]
                    .map((t, i) => ({ ...t, originalIndex: i }))
                    .reverse()
                    .map((t) => (
                    <div key={t.originalIndex} className="p-4 relative hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <div className="flex justify-between items-start mb-1 pr-8">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(t.date), 'dd MMM yyyy')}</span>
                        <span className={`font-bold ${t.type === 'Payment' ? 'text-green-600 dark:text-green-400' : 'dark:text-gray-200'}`}>
                          {t.type === 'Payment' ? `-₹${t.amount}` : `₹${t.amount}`}
                        </span>
                      </div>
                      <div className="text-sm font-medium mb-2 pr-8 dark:text-gray-200">{t.summary}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className={`badge text-[10px] ${t.type === 'Payment' ? 'badge-success' : 'badge-info'}`}>{t.type}</span>
                        <button onClick={() => handleDeleteLedgerEntry(t.originalIndex)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center min-h-[400px] bg-gray-50/50 dark:bg-slate-800/50">
              <div className="text-center text-gray-400">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a customer to view ledger.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS (Simplified for space) */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h5 className="text-xl font-bold mb-4 dark:text-white">Add Subscriber</h5>
            <button
               onClick={() => toggleListening('new_customer')}
               className={`w-full mb-4 py-3 flex items-center justify-center rounded-lg transition-colors ${
                  isListening && listeningMode === 'new_customer' ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/10 text-primary hover:bg-primary/20 font-bold dark:bg-primary/20 dark:hover:bg-primary/30'
               }`}
            >
               {isListening && listeningMode === 'new_customer' ? <><MicOff className="h-5 w-5 mr-2" /> Stop Listening...</> : <><Mic className="h-5 w-5 mr-2" /> Tap to Dictate Name & Phone</>}
            </button>
            <div className="space-y-4">
              <FormInput
                id="customer-name"
                label="Full Name"
                type="text"
                placeholder="Enter customer name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                error={formErrors.name}
              />
              <FormInput
                id="customer-phone"
                label="Phone Number"
                type="text"
                placeholder="Enter 10-digit phone number"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                error={formErrors.phone}
              />
              <FormInput
                id="customer-address"
                label="Address"
                type="text"
                placeholder="Enter customer address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                error={formErrors.address}
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  className="btn-primary flex-1"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error & States */}
      {loading && <SkeletonLoader count={5} variant="table" />}
      {error && <ErrorState onRetry={() => fetchCustomers(1)} />}
      {!loading && !error && filteredCustomers.length === 0 && searchQuery === '' && (
        <EmptyState
          title="No Customers Found"
          description="No customers added yet. Create one to get started!"
          action={{ label: 'Add Customer', onClick: () => setIsNewCustomerModalOpen(true) }}
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={(newPage) => fetchCustomers(newPage)}
        />
      )}

      {/* POS LEDGER INTEGRATION */}
      <OrderModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSuccess={async () => {
          setIsEntryModalOpen(false)
          fetchCustomers(page)
          const updatedResponse = await customersAPI.getAll(page, itemsPerPage)
          const responseData = updatedResponse.data?.data || updatedResponse.data || []
          const list = Array.isArray(responseData) ? responseData : (responseData?.customers || [])
          setSelectedCustomer(list.find((c) => (c.id || c._id) === (selectedCustomer?.id || selectedCustomer?._id)))
        }}
        ledgerMode={true}
        ledgerCustomer={selectedCustomer}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Customer?"
        message={`Are you sure you want to delete this customer? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={async () => {
          try {
            await customersAPI.delete(deleteCustomerId)
            toast.success('Customer deleted successfully')
            setShowDeleteConfirm(false)
            fetchCustomers(page)
            setSelectedCustomer(null)
          } catch (error) {
            toast.error(getErrorMessage(error, 'delete customer'))
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      {/* Payment Popup Overlay */}
      {paymentPopupCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => setPaymentPopupCustomer(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-xl font-bold text-text-dark text-center">Receive Payment</h4>
            <p className="text-xs text-gray-500 text-center mb-4">{paymentPopupCustomer.name}</p>
            
            <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center mb-4 text-red-700">
              <span className="text-sm font-bold">Total Due</span>
              <span className="font-bold text-lg">₹{paymentPopupCustomer.totalDue}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Amount Received ₹</label>
              <input
                type="number"
                value={paymentPopupAmount}
                onChange={(e) => setPaymentPopupAmount(e.target.value)}
                className="input-field text-center text-xl font-bold py-3 text-primary"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => setPaymentPopupCustomer(null)} className="btn-secondary py-3 text-sm font-bold">
                Cancel
              </button>
              <button onClick={handleRecordPayment} className="btn-primary py-3 text-sm font-bold">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers