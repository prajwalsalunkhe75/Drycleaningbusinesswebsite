import { useState, useEffect, useRef } from 'react'
import { UserCog, DollarSign, Trash2, Mic, MicOff } from 'lucide-react'
import { workerLogsAPI, workersAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { parseVoiceCommand, parseVoiceCommandAI, IRONING_ITEMS } from '../utils/voiceParser'
import { validators, validateForm } from '../utils/validation'
import { getErrorMessage } from '../utils/errorHandler'
import { ErrorState, SkeletonLoader } from '../components/DataStates'

const Workers = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [workers, setWorkers] = useState([])
  const [newWorkerInput, setNewWorkerInput] = useState('')
  const [workerFormErrors, setWorkerFormErrors] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [wageRates, setWageRates] = useState({
    shirt: 3.5,
    saree: 10,
    bedsheet: 5,
  })
  const [variableItems, setVariableItems] = useState([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemRate, setNewItemRate] = useState('')
  const [formData, setFormData] = useState({
    workerName: '',
    customerRef: '',
    qtyFixed: '',
    customItems: {},
    customRates: {},
  })

  const PREDEFINED_ITEMS = IRONING_ITEMS
    .filter(item => item.id !== 'shirt' && item.id !== 'pant')
    .map(item => ({
      id: item.id,
      name: item.name,
      defaultRate: wageRates[item.id] || 15
    }))

  // Voice Entry
  const [isListening, setIsListening] = useState(false)
  const [spokenText, setSpokenText] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const recognitionRef = useRef(null)

  const FIXED_RATE = wageRates.shirt

  useEffect(() => {
    // Initialize SpeechRecognition
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

  useEffect(() => {
    if (!isListening && spokenText) {
      processWorkerVoiceCommand(spokenText.toLowerCase())
      setTimeout(() => setSpokenText(''), 2000)
    }
  }, [isListening])
  const loadSettings = async () => {
    try {
      const resp = await settingsAPI.get()
      if (resp.data?.geminiApiKey) setGeminiKey(resp.data.geminiApiKey)
    } catch (e) {
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
    loadSettings()
    fetchWorkers()

    // Load wage rates from Settings
    const storedPrices = localStorage.getItem('laundryPrices')
    if (storedPrices) {
      try {
        const parsed = JSON.parse(storedPrices)
        const wagesFromSettings = parsed.wages || {}
        
        // Ensure Shirt has a fallback
        if (!wagesFromSettings.shirt) wagesFromSettings.shirt = 3.5

        setWageRates(wagesFromSettings)
        
        // Initialize customRates with settings logic
        const initialCustomRates = {}
        IRONING_ITEMS.forEach(item => {
          if (item.id !== 'shirt' && item.id !== 'pant') {
             initialCustomRates[item.id] = wagesFromSettings[item.id] || 15
          }
        })

        setFormData((prev) => ({
          ...prev,
          customRates: {
            ...prev.customRates,
            ...initialCustomRates
          },
        }))
      } catch (error) {
        console.error('Failed to load wage rates from settings:', error)
      }
    }

    // Load custom piece rate items
    const storedCustom = localStorage.getItem('drycleaning_custom_items')
    if (storedCustom) {
      try {
        setVariableItems(JSON.parse(storedCustom).filter((item) => item.id.startsWith('custom_')))
      } catch (e) {
        console.error('Failed to parse distinct custom items', e)
      }
    }
  }, [])

  const processWorkerVoiceCommand = async (text) => {
    if (geminiKey) {
      try {
        setIsAiProcessing(true)
        toast.loading('AI is processing...', { id: 'worker-ai' })
        const parsedData = await parseVoiceCommandAI(text, geminiKey)
        toast.dismiss('worker-ai')
        
        const { items: aiItems, names } = parsedData
        let itemsAdded = 0
        let newCustomerRef = formData.customerRef
        if (names && names.length > 0) newCustomerRef = names.join(' ')

        const newCustomItemsState = { ...formData.customItems }
        let addFixed = 0
        const newlyDiscoveredVars = []

        if (aiItems && Array.isArray(aiItems)) {
            aiItems.forEach(aiItem => {
                const searchName = aiItem.name.toLowerCase()
                // Check if it's a fixed item
                if (searchName.includes('shirt') || searchName.includes('pant')) {
                    addFixed += aiItem.qty
                } else {
                    // Try to match with existing predefined or custom items
                    const match = [...PREDEFINED_ITEMS, ...variableItems].find(pi => 
                        pi.name.toLowerCase().includes(searchName) || searchName.includes(pi.name.toLowerCase())
                    )
                    
                    const id = match ? match.id : `custom_${Date.now()}_${Math.random()}`
                    if (!match) {
                        newlyDiscoveredVars.push({ id, name: aiItem.name, rate: 15 })
                    }
                    newCustomItemsState[id] = (parseInt(newCustomItemsState[id]) || 0) + aiItem.qty
                }
                itemsAdded += aiItem.qty
            })
        }

        if (newlyDiscoveredVars.length > 0) {
            const combinedVars = [...variableItems, ...newlyDiscoveredVars]
            setVariableItems(combinedVars)
            localStorage.setItem('drycleaning_custom_items', JSON.stringify(combinedVars))
        }

        setFormData(prev => ({
            ...prev,
            customerRef: newCustomerRef,
            qtyFixed: (parseInt(prev.qtyFixed) || 0) + addFixed || '',
            customItems: { ...prev.customItems, ...newCustomItemsState }
        }))

        if (itemsAdded > 0) toast.success(`AI applied ${itemsAdded} items!`)
        return
      } catch (err) {
        toast.dismiss('worker-ai')
        console.error("AI Error:", err)
        // Fallback to regex
      } finally {
        setIsAiProcessing(false)
      }
    }

    const { names, items } = parseVoiceCommand(text)
    
    let newCustomerRef = formData.customerRef
    if (names.length > 0) {
      newCustomerRef = names.join(' ')
    }

    let addFixed = 0
    const newCustomItemsState = { ...formData.customItems }
    const newlyDiscoveredVars = []

    let itemsAdded = 0

    items.forEach(parsed => {
      const { itemConfig, qty } = parsed
      let id = itemConfig.id

      if (id === 'shirt' || id === 'pant') {
         addFixed += qty
      } else {
         const name = itemConfig.name
         if (id.startsWith('custom_')) {
           const existingVar = variableItems.find(vi => vi.id === id)
           if (!existingVar) {
             newlyDiscoveredVars.push({ id, name, rate: 15 })
           }
         }
         newCustomItemsState[id] = (parseInt(newCustomItemsState[id]) || 0) + qty
      }
      itemsAdded += qty
    })

    if (newlyDiscoveredVars.length > 0) {
      const combinedVars = [...variableItems, ...newlyDiscoveredVars]
      setVariableItems(combinedVars)
      localStorage.setItem('drycleaning_custom_items', JSON.stringify(combinedVars))
    }

    setFormData(prev => ({
      ...prev,
      customerRef: newCustomerRef,
      qtyFixed: (parseInt(prev.qtyFixed) || 0) + addFixed || '',
      customItems: { ...prev.customItems, ...newCustomItemsState }
    }))

    if (itemsAdded > 0) {
      toast.success(`Voice applied ${itemsAdded} items to worker log!`)
    } else if (names.length > 0) {
      toast.success(`Set customer to ${newCustomerRef}`)
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

  const fetchWorkers = async () => {
    try {
      const response = await workersAPI.getAll()
      const workerNames = response.data.map((w) => w.name)
      setWorkers(workerNames)
      // Set default selected worker to first in list
      if (workerNames.length > 0 && !formData.workerName) {
        setFormData((prev) => ({ ...prev, workerName: workerNames[0] }))
      }
    } catch (error) {
      console.error('Failed to fetch workers from DB, falling back to localStorage:', error)
      // Fallback to localStorage
      const storedWorkers = localStorage.getItem('drycleaning_workers')
      if (storedWorkers) {
        try {
          const parsed = JSON.parse(storedWorkers)
          setWorkers(parsed)
          if (parsed.length > 0 && !formData.workerName) {
            setFormData((prev) => ({ ...prev, workerName: parsed[0] }))
          }
        } catch (e) {
          console.error('Failed to load workers from storage:', e)
        }
      }
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchLogs()
  }, [selectedDate])

  const fetchLogs = async () => {
    try {
      const response = await workerLogsAPI.getAll()
      // Filter by selected date
      const selectedDateStr = new Date(selectedDate).toDateString()
      const filteredLogs = response.data.filter(
        (log) => new Date(log.date).toDateString() === selectedDateStr
      )
      setLogs(filteredLogs)
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

    // Calculate custom items total
    let customItemsTotal = 0
    let customItemsDesc = []
    
    Object.entries(formData.customItems).forEach(([itemId, qty]) => {
      const qty_int = parseInt(qty) || 0
      if (qty_int > 0) {
        const predefinedItem = PREDEFINED_ITEMS.find(v => v.id === itemId)
        const customItemDef = variableItems.find((v) => v.id === itemId)
        
        let itemName = predefinedItem?.name || customItemDef?.name || 'Item'
        let itemRate = formData.customRates[itemId] || predefinedItem?.defaultRate || customItemDef?.rate || 0
        
        customItemsTotal += qty_int * parseFloat(itemRate)
        customItemsDesc.push(`${qty_int} ${itemName}`)
      }
    })

    if (qFixed === 0 && customItemsTotal === 0) {
      toast.error('Please enter at least one quantity!')
      return
    }

    const fixedPay = qFixed * FIXED_RATE
    const totalWage = fixedPay + customItemsTotal

    try {
      const desc_parts = []
      if (qFixed) desc_parts.push(`${qFixed} Regular`)
      desc_parts.push(...customItemsDesc)

      const newLog = {
        worker: formData.workerName,
        customer: formData.customerRef,
        desc: desc_parts.join(', '),
        amount: totalWage,
        date: new Date(),
      }

      await workerLogsAPI.create(newLog)
      toast.success('Work logged successfully!')
      
      // Reset form
      const resetCustomItems = {}
      Object.keys(formData.customItems).forEach((key) => {
        resetCustomItems[key] = ''
      })
      setFormData({
        ...formData,
        customerRef: '',
        qtyFixed: '',
        customItems: resetCustomItems,
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

  const handleAddWorker = async () => {
    const trimmedName = newWorkerInput.trim()
    
    // Validate using validators
    const validationSchema = {
      workerName: [validators.required, validators.name],
    }
    
    const { isValid, errors } = validateForm({ workerName: trimmedName }, validationSchema)
    
    if (!isValid) {
      setWorkerFormErrors(errors)
      toast.error('Invalid worker name. Please use letters, spaces, and hyphens only.')
      return
    }

    if (workers.includes(trimmedName)) {
      setWorkerFormErrors({ workerName: 'Worker already exists' })
      toast.error('This worker already exists')
      setNewWorkerInput('')
      return
    }

    try {
      setWorkerFormErrors({})
      await workersAPI.create(trimmedName)
      const updatedWorkers = [...workers, trimmedName]
      setWorkers(updatedWorkers)
      // Keep localStorage in sync as fallback
      localStorage.setItem('drycleaning_workers', JSON.stringify(updatedWorkers))
      
      // Select the newly added worker
      setFormData({ ...formData, workerName: trimmedName })
      setNewWorkerInput('')
      toast.success(`${trimmedName} added successfully!`)
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'add worker')
      setWorkerFormErrors({ submit: errorMsg })
      toast.error(errorMsg)
      console.error(error)
    }
  }

  const handleAddVariableItem = () => {
    const trimmedName = newItemName.trim()
    const rate = parseFloat(newItemRate)

    if (!trimmedName) {
      toast.error('Please enter item name')
      return
    }

    if (!rate || rate <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    const newItem = {
      id: `custom_${Date.now()}`,
      name: trimmedName,
      rate: rate,
    }

    const customOnly = variableItems.filter((item) => item.id.startsWith('custom_'))
    const updatedCustomItems = [...customOnly, newItem]
    localStorage.setItem('drycleaning_custom_items', JSON.stringify(updatedCustomItems))

    setVariableItems([...variableItems, newItem])
    setFormData((prev) => ({
      ...prev,
      customItems: {
        ...prev.customItems,
        [newItem.id]: '',
      },
    }))
    setNewItemName('')
    setNewItemRate('')
    toast.success(`${trimmedName} added successfully!`)
  }

  const handleRemoveVariableItem = (itemId) => {
    const itemToRemove = variableItems.find((item) => item.id === itemId)
    if (!itemToRemove?.id.startsWith('custom_')) {
      toast.error('Cannot remove default items')
      return
    }

    setVariableItems(variableItems.filter((item) => item.id !== itemId))
    const updatedCustomItems = variableItems
      .filter((item) => item.id.startsWith('custom_') && item.id !== itemId)
    localStorage.setItem('drycleaning_custom_items', JSON.stringify(updatedCustomItems))
    toast.success('Item removed')
  }

  const handleKeyPressItemRate = (e) => {
    if (e.key === 'Enter') {
      handleAddVariableItem()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddWorker()
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
          <h2 className="text-3xl font-bold text-text-dark dark:text-white">Worker Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Track work done by staff for specific customers.</p>
        </div>
        <div className="card dark:bg-slate-800 p-4 border-l-4 border-l-primary w-full sm:w-auto min-w-[200px] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Total Wages (Today)</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary dark:text-cyan-400">
                ₹{total.toLocaleString('en-IN')}
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center ml-4">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary dark:text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ========================================== */}
        {/* FORM SECTION                               */}
        {/* ========================================== */}
        <div className="lg:col-span-1">
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
                  className="input-field mb-2"
                >
                  {workers.map((worker) => (
                    <option key={worker} value={worker}>
                      {worker}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWorkerInput}
                    onChange={(e) => setNewWorkerInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add new worker name"
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddWorker}
                    className="btn-primary px-3 py-2 text-sm font-semibold h-10 flex items-center justify-center whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  2. Customer Ref / Ticket #
                </label>
                <div className="flex gap-2 relative">
                  <input
                    type="text"
                    value={formData.customerRef}
                    onChange={(e) => setFormData({ ...formData, customerRef: e.target.value })}
                    placeholder="e.g. Mrs. Sharma (1042)"
                    className="input-field flex-1"
                    required
                  />
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

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h6 className="text-xs font-bold text-primary mb-3 border-b border-gray-200 pb-2">
                  Fixed Rate Items (₹{wageRates.shirt}/pc)
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
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  
                  {[...PREDEFINED_ITEMS, ...variableItems].map((item) => {
                    const rate = formData.customRates[item.id] || item.defaultRate || item.rate || 0
                    const isCustom = item.id.startsWith('custom_')

                    return (
                      <div key={item.id} className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200 last:border-0">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">{item.name} (Qty)</label>
                          <input
                            type="number"
                            value={formData.customItems[item.id] || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customItems: {
                                  ...formData.customItems,
                                  [item.id]: e.target.value,
                                },
                              })
                            }
                            placeholder="0"
                            className="input-field bg-white"
                          />
                        </div>
                        <div>
                          <div className="flex gap-1 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Rate (₹)</label>
                              <input
                                type="number"
                                value={rate}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    customRates: {
                                      ...formData.customRates,
                                      [item.id]: parseFloat(e.target.value) || 0,
                                    },
                                  })
                                }
                                disabled={isCustom}
                                className={`input-field font-bold ${isCustom ? 'bg-yellow-50 border-yellow-200 text-yellow-900' : 'bg-white'}`}
                              />
                            </div>
                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVariableItem(item.id)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors font-bold text-lg"
                                title="Remove item"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add New Custom Item */}
                  <div className="pt-2 border-t-2 border-gray-300 mt-3">
                    <p className="text-xs font-bold text-gray-700 mb-2">Add Custom Item (Coat, Blazer, etc.)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Item name"
                        className="input-field text-sm bg-white"
                      />
                      <input
                        type="number"
                        value={newItemRate}
                        onChange={(e) => setNewItemRate(e.target.value)}
                        onKeyPress={handleKeyPressItemRate}
                        placeholder="Price"
                        className="input-field text-sm bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVariableItem}
                      className="btn-primary w-full mt-2 py-2 text-xs font-semibold"
                    >
                      + Add Item
                    </button>
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
        <div className="lg:col-span-3">
          <div className="card overflow-hidden shadow-sm flex flex-col h-full">
            
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h5 className="text-lg sm:text-xl font-bold text-text-dark flex-shrink-0">Today's Work Log</h5>
              <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field text-sm px-3 py-2 h-10"
                />
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="btn-primary px-4 py-2 text-sm font-semibold h-10 whitespace-nowrap flex items-center"
                >
                  Today
                </button>
              </div>
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
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{format(new Date(log.date), 'dd MMM yyyy')}</td>
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
                        <div className="mt-2 mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date: </span>
                          <span className="text-sm text-gray-700 font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</span>
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
                  Summary: Total Payable by Worker ({format(new Date(selectedDate), 'dd MMM yyyy')})
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