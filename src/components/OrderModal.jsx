import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Minus, Search, Mic, MicOff, Camera, Loader } from 'lucide-react'
import { ordersAPI, customersAPI, settingsAPI } from '../utils/api'
import toast from 'react-hot-toast'

import { parseVoiceCommand, parseVoiceCommandAI, IRONING_ITEMS, DRYCLEAN_ITEMS } from '../utils/voiceParser'

// ============================================
// ITEM CONFIGURATION
// ============================================

const OrderModal = ({ isOpen, onClose, onSuccess, ledgerMode = false, ledgerCustomer = null }) => {
  // Customer
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [isHomeDelivery, setIsHomeDelivery] = useState(false)
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Cart
  const [cart, setCart] = useState([])

  // Price popup for variable items
  const [pricePopup, setPricePopup] = useState(null) // { itemConfig, price, qty }

  // Custom item form
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customCategory, setCustomCategory] = useState('DryClean')

  // Voice Entry
  const [isListening, setIsListening] = useState(false)
  const [spokenText, setSpokenText] = useState('')
  const recognitionRef = useRef(null)

  const [autoWhatsapp, setAutoWhatsapp] = useState(true)
  const [geminiKey, setGeminiKey] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')

  // Photo Evidence
  const [evidencePhotos, setEvidencePhotos] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  // Prices from settings
  const [ironingPrices, setIroningPrices] = useState({
    regular: { shirt: 8, pant: 8, saree: 120, blazer: 120, bedsheet: 30 },
    home: { shirt: 15, pant: 15, saree: 150, blazer: 150, bedsheet: 40 },
  })

  const nameInputRef = useRef(null)

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    if (isOpen) {
      loadPrices()
      loadCustomers()
      
      if (ledgerMode && ledgerCustomer) {
        setCustomerName(ledgerCustomer.name)
        setPhone(ledgerCustomer.phone || '')
      }

      // Focus name field on open
      setTimeout(() => nameInputRef.current?.focus(), 200)
    }
  }, [isOpen, ledgerMode, ledgerCustomer])

  const loadPrices = async () => {
    try {
      const response = await settingsAPI.get()
      const data = response.data
      if (data.geminiApiKey) setGeminiKey(data.geminiApiKey)
      if (data.regular && data.home) {
        setIroningPrices({ regular: data.regular, home: data.home })
      }
    } catch {
      // Fallback to localStorage
      const saved = localStorage.getItem('laundryPrices')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.regular && parsed.home) {
            setIroningPrices({ regular: parsed.regular, home: parsed.home })
          }
        } catch {}
      }
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getAll()
      const data = Array.isArray(response.data) ? response.data : response.data?.customers || []
      setAllCustomers(data)
    } catch {
      setAllCustomers([])
    }
  }

  // ============================================
  // CUSTOMER AUTOCOMPLETE
  // ============================================
  const handleNameChange = (value) => {
    setCustomerName(value)
    if (value.length >= 2) {
      const matches = allCustomers.filter((c) =>
        c.name?.toLowerCase().includes(value.toLowerCase())
      )
      setCustomerSuggestions(matches.slice(0, 5))
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectCustomer = (customer) => {
    setCustomerName(customer.name)
    setPhone(customer.phone || '')
    setShowSuggestions(false)
  }

  // ============================================
  // VOICE ENTRY LOGIC
  // ============================================
  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = localStorage.getItem('voiceLanguage') || 'en-IN' // dynamically loaded language

      recognition.onstart = () => setIsListening(true)
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('')
        setSpokenText(transcript)
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error)
        setIsListening(false)
        if (event.error !== 'no-speech') {
          toast.error('Voice recognition failed')
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  // Process the spoken text when listening stops
  useEffect(() => {
    if (!isListening && spokenText) {
      if (geminiKey) {
        processVoiceCommandAI(spokenText)
      } else {
        processVoiceCommand(spokenText.toLowerCase())
      }
      setTimeout(() => setSpokenText(''), 2000) // Clear text after 2s
    }
  }, [isListening])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      if (recognitionRef.current) {
        setSpokenText('')
        recognitionRef.current.start()
        toast.success('Listening... Tap mic again to finish', { icon: '🎤', duration: 4000 })
      } else {
        toast.error('Voice entry not supported in this browser')
      }
    }
  }

  const processVoiceCommandAI = async (text) => {
    try {
      toast.loading('AI is processing...', { id: 'ai-parse' })
      const parsedData = await parseVoiceCommandAI(text, geminiKey)
      toast.dismiss('ai-parse')
      
      const { names, phone: extractedPhone, items: aiItems } = parsedData
      if (names && names.length > 0) {
        setCustomerName(names.join(' '))
      }
      if (extractedPhone) {
        setPhone(extractedPhone)
      }

      let itemsAdded = 0
      const newCartItems = []
      
      if (aiItems && Array.isArray(aiItems)) {
        aiItems.forEach(aiItem => {
          let price = aiItem.price || 0
          if (!price || price <= 0) {
            if (aiItem.category === 'Ironing') {
                const ironItemMatch = IRONING_ITEMS.find(i => i.id.includes(aiItem.name.toLowerCase()) || i.name.toLowerCase().includes(aiItem.name.toLowerCase()))
                if (ironItemMatch) price = getIroningPrice(ironItemMatch.id)
                else price = 20
            } else {
                const dcItemMatch = DRYCLEAN_ITEMS.find(i => i.id.replace('dc_', '').includes(aiItem.name.toLowerCase()) || i.name.toLowerCase().includes(aiItem.name.toLowerCase()))
                if (dcItemMatch) price = dcItemMatch.defaultPrice
                else price = 100
            }
          }
          
          newCartItems.push({
            itemId: aiItem.name + '_' + Date.now() + Math.random(),
            name: aiItem.name.charAt(0).toUpperCase() + aiItem.name.slice(1),
            category: aiItem.category || 'DryClean',
            qty: aiItem.qty || 1,
            rate: price,
            stainCharge: 0,
            total: price * (aiItem.qty || 1),
          })
          itemsAdded++
        })
        
        if (newCartItems.length > 0) {
          setCart(prev => [...prev, ...newCartItems])
        }
      }
      
      toast.success(itemsAdded > 0 ? `AI added ${itemsAdded} item(s)!` : 'AI updated customer info!')
    } catch (error) {
       toast.dismiss('ai-parse')
       toast.error('AI failed, falling back to basic parser.')
       processVoiceCommand(text.toLowerCase())
    }
  }

  const processVoiceCommand = (text) => {
    const { names: extractedName, phone: extractedPhone, items: finalItems } = parseVoiceCommand(text)

    // ----------------------------------------------------------------------
    // Add to Cart
    // ----------------------------------------------------------------------
    if (extractedName.length > 0) {
      setCustomerName(extractedName.join(' '))
    }
    if (extractedPhone) {
      setPhone(extractedPhone)
    }

    let itemsAdded = 0
    const newCartItems = []

    finalItems.forEach(parsed => {
      const { itemConfig, isFixed, qty, overrideMode, overridePrice } = parsed
      const finalCategory = overrideMode || (isFixed ? 'Ironing' : 'DryClean')
      let price = 0

      if (overridePrice !== null) {
        price = overridePrice
      } else if (finalCategory === 'Ironing') {
        const settingsKey = itemConfig.settingsKey || itemConfig.id.replace('dc_', '')
        price = getIroningPrice(settingsKey) || 0
      } else {
        price = itemConfig.defaultPrice || 50
      }

      if (finalCategory === 'Ironing') {
        // Try to increment existing ironing item
        setCart(prev => {
          const updatedPrev = [...prev, ...newCartItems] // Consider items built so far
          const existingIdx = updatedPrev.findIndex(c => c.itemId === itemConfig.id && c.rate === price && c.category === 'Ironing')
          if (existingIdx >= 0 && existingIdx < prev.length) {
            // It exists in original cart state
            const updated = [...prev]
            updated[existingIdx].qty += qty
            updated[existingIdx].total = updated[existingIdx].qty * updated[existingIdx].rate
            return updated
          }
          return [...prev, {
            itemId: itemConfig.id + '_' + Date.now() + Math.random(),
            name: itemConfig.name,
            category: 'Ironing',
            qty: qty,
            rate: price,
            stainCharge: 0,
            total: price * qty,
          }]
        })
      } else {
        // Add as DryClean
        setCart(prev => [...prev, {
          itemId: itemConfig.id + '_' + Date.now() + Math.random(),
          name: itemConfig.name,
          category: 'DryClean',
          qty: qty,
          rate: price,
          stainCharge: 0,
          total: price * qty,
        }])
      }
      itemsAdded++
    })

    if (itemsAdded > 0 || extractedName.length > 0 || extractedPhone) {
      let msg = itemsAdded > 0 ? `Voice added ${itemsAdded} item(s)!` : 'Customer info captured!'
      if (extractedName.length > 0 && itemsAdded > 0) msg = `Set name to "${extractedName.join(' ')}" & added ${itemsAdded} item(s)!`
      if (extractedPhone && itemsAdded === 0) msg = `Phone number ${extractedPhone} captured!`
      toast.success(msg)
    } else {
      toast.error("Couldn't understand items or names from voice.")
    }
  }

  // ============================================
  // TICKET ID
  // ============================================
  const generateTicketId = () => {
    const hasIron = cart.some((item) => item.category === 'Ironing')
    const hasDry = cart.some((item) => item.category === 'DryClean')
    let prefix = 'GEN'
    if (hasIron && hasDry) prefix = 'MIX'
    else if (hasIron) prefix = 'IRN'
    else if (hasDry) prefix = 'DRY'
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}-${randomNum}`
  }

  // ============================================
  // CART LOGIC
  // ============================================
  const getIroningPrice = (itemId) => {
    const prices = isHomeDelivery ? ironingPrices.home : ironingPrices.regular
    return prices[itemId] || 0
  }

  // Fixed-price item: one tap = add or increment
  const handleFixedTap = (itemConfig) => {
    const price = getIroningPrice(itemConfig.id)
    const existingIdx = cart.findIndex(
      (c) => c.itemId === itemConfig.id && c.rate === price
    )

    if (existingIdx >= 0) {
      // Increment qty
      const updated = [...cart]
      updated[existingIdx].qty += 1
      updated[existingIdx].total = updated[existingIdx].qty * updated[existingIdx].rate
      setCart(updated)
    } else {
      // Add new
      setCart([
        ...cart,
        {
          itemId: itemConfig.id,
          name: itemConfig.name,
          category: 'Ironing',
          qty: 1,
          rate: price,
          total: price,
        },
      ])
    }
  }

   const handleVariableTap = (item) => {
    setPricePopup({
      itemConfig: item,
      price: item.defaultPrice,
      qty: 1,
      stain: 0,
      category: 'DryClean' // default service mode
    })
  }

  const confirmPricePopup = () => {
    if (!pricePopup) return
    const { itemConfig, price, qty, stain, category } = pricePopup
    const numPrice = parseFloat(price) || 0
    const numQty = parseInt(qty) || 1
    const numStain = parseFloat(stain) || 0

    if (numPrice <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    const itemName = numStain > 0
      ? `${itemConfig.name} (+₹${numStain} Stain)`
      : itemConfig.name

    setCart([
      ...cart,
      {
        itemId: itemConfig.id + '_' + Date.now(),
        name: itemName,
        category: category || 'DryClean',
        qty: numQty,
        rate: numPrice,
        stainCharge: numStain,
        total: (numPrice * numQty) + numStain,
      },
    ])
    setPricePopup(null)
  }

  // Custom item
  const addCustomItem = () => {
    if (!customName || !customPrice) {
      toast.error('Enter item name and price')
      return
    }
    const rate = parseFloat(customPrice) || 0
    setCart([
      ...cart,
      {
        itemId: 'custom_' + Date.now(),
        name: customName,
        category: customCategory,
        qty: 1,
        rate,
        total: rate,
      },
    ])
    setCustomName('')
    setCustomPrice('')
    setShowCustomForm(false)
  }

  const updateQty = (index, delta) => {
    const updated = [...cart]
    updated[index].qty = Math.max(1, updated[index].qty + delta)
    updated[index].total = updated[index].qty * parseFloat(updated[index].rate || 0)
    setCart(updated)
  }

  const updateItemRate = (index, newRate) => {
    const updated = [...cart]
    updated[index].rate = newRate
    updated[index].total = (parseFloat(newRate) || 0) * updated[index].qty
    setCart(updated)
  }

  const removeItem = (index) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const cloudName = localStorage.getItem('cloudinaryCloudName')
    const preset = localStorage.getItem('cloudinaryPreset')

    if (!cloudName || !preset) {
      toast.error('Cloudinary not configured! Please add keys in Settings > Integrations.', { duration: 4000 })
      return
    }

    setIsUploading(true)
    const toastId = toast.loading('Uploading photo evidence...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', preset)
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.secure_url) {
        setEvidencePhotos(prev => [...prev, data.secure_url])
        toast.success('Evidence added!', { id: toastId })
      } else {
        throw new Error(data.error?.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Cloudinary Error:', error)
      toast.error(`Upload failed: ${error.message}`, { id: toastId })
    } finally {
      setIsUploading(false)
      // reset input so same file can be captured again if needed
      e.target.value = ''
    }
  }

  const getTotal = () => cart.reduce((sum, item) => sum + item.total, 0)

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    try {
      if (ledgerMode && ledgerCustomer) {
        const totalAmount = getTotal()
        let finalAdvance = advanceAmount === '' ? 0 : parseFloat(advanceAmount)
        if (isNaN(finalAdvance)) finalAdvance = 0

        const newTransactions = cart.map(item => ({
          date: new Date(),
          summary: `${item.qty} x ${item.name} (${item.category})`,
          amount: item.total,
          type: item.category
        }))
        
        if (finalAdvance > 0) {
          newTransactions.push({
            date: new Date(),
            summary: `Advance/Partial Payment (${paymentMethod})`,
            amount: finalAdvance,
            type: 'Payment'
          })
        }

        const newTotalDue = (ledgerCustomer.totalDue || 0) + totalAmount - finalAdvance
        await customersAPI.update(ledgerCustomer.id || ledgerCustomer._id, {
          totalDue: newTotalDue,
          transactions: [...(ledgerCustomer.transactions || []), ...newTransactions]
        })
        
        if (finalAdvance > 0) {
          // Add to main revenue stream
          const revenueRecord = {
            id: Date.now(),
            customerName: ledgerCustomer.name + ' (Advance)',
            phone: ledgerCustomer.phone,
            items: [{ type: 'Received Advance', qty: 1, price: finalAdvance }],
            totalAmount: finalAdvance,
            paymentStatus: 'Paid',
            status: 'Delivered',
            origin: 'ledger',
            date: new Date(),
          }
          await ordersAPI.create(revenueRecord)
        }

        toast.success(`Items billed to ${ledgerCustomer.name}!`)
        setCustomerName('')
        setPhone('')
        setCart([])
        setAdvanceAmount('')
        setPaymentMethod('Cash')
        setIsHomeDelivery(false)
        onSuccess()
        return
      }

    const ticketId = generateTicketId()
    const finalName = customerName.trim() || 'Walk-In Customer'
    const finalPhone = phone.trim()
    const totalAmount = getTotal()
    
    let finalAdvance = advanceAmount === '' ? 0 : parseFloat(advanceAmount)
    if (isNaN(finalAdvance)) finalAdvance = 0
    
    let pStatus = 'Unpaid'
    if (finalAdvance > 0) {
      if (finalAdvance >= totalAmount) pStatus = 'Paid'
      else pStatus = 'Partial'
    }

    const newOrder = {
      id: ticketId,
      customerName: finalName,
      phone: finalPhone,
      items: cart.map((item) => ({
        type: item.name,
        qty: item.qty,
        price: item.total,
      })),
      totalAmount,
      advanceAmount: finalAdvance,
      paymentMethod,
      evidencePhotos,
      status: 'Pending',
      paymentStatus: pStatus,
      origin: 'dashboard',
      date: new Date(),
    }

      await ordersAPI.create(newOrder)
      toast.success(`Ticket ${ticketId} created! ✅`)

      // Auto WhatsApp
      if (autoWhatsapp && finalPhone) {
        const waItems = cart.map(i => `${i.qty}x ${i.name} = ₹${i.total}`).join('%0A')
        const message = `🧾 *INVOICE / RECEIPT*%0A*Angel's Dry Cleaners*%0A--------------------------------%0ATicket No: *${ticketId}*%0ADate: ${new Date().toLocaleDateString('en-IN')}%0ACustomer: ${finalName}%0A--------------------------------%0A*Items:*%0A${waItems}%0A--------------------------------%0A*TOTAL AMOUNT: ₹${totalAmount}*%0APayment: Unpaid%0AStatus: Pending%0A--------------------------------%0AThank you! 🙏`
        
        const waLink = `https://wa.me/91${finalPhone.replace(/\D/g, '')}?text=${message}`
        window.open(waLink, '_blank')
      } else if (autoWhatsapp && !finalPhone) {
        toast('Ticket saved, but no phone number for WhatsApp', { icon: 'ℹ️' })
      }

      // Reset
      setCustomerName('')
      setPhone('')
      setCart([])
      setAdvanceAmount('')
      setPaymentMethod('Cash')
      setEvidencePhotos([])
      setIsHomeDelivery(false)
      onSuccess()
    } catch (error) {
      toast.error('Failed to create order')
      console.error(error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col sm:mx-4">
        
        {/* ===== HEADER ===== */}
        <div className="bg-primary text-white px-5 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              {ledgerMode ? 'Add to Ledger' : 'New Ticket'}
              {!ledgerMode && (
                <label className="flex items-center gap-1.5 ml-3 px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium cursor-pointer hover:bg-white/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoWhatsapp}
                    onChange={(e) => setAutoWhatsapp(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm accent-green-500"
                  />
                  Auto-WhatsApp
                </label>
              )}
            </h3>
            {ledgerMode ? (
              <p className="text-white/70 text-xs mt-1">Billing to: {ledgerCustomer?.name}</p>
            ) : (
              <p className="text-white/70 text-xs mt-1">Leave name blank for Walk-In • Auto-saved</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">

          {/* Customer Section & Voice */}
          <div className="px-5 pt-4 pb-3 bg-gray-50 border-b border-gray-200">
            {/* Voice Transcriber Visualizer */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isListening || spokenText ? 'h-12 mb-3 opacity-100' : 'h-0 opacity-0'}`}>
              <div className="h-full bg-blue-50 border border-blue-200 rounded-lg px-4 flex items-center shadow-inner">
                {isListening ? (
                  <div className="flex items-center space-x-2 w-full">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <p className="text-sm font-medium text-gray-700 truncate w-full">
                      {spokenText || "Listening... Tap mic to stop"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-700 truncate w-full">"{spokenText}"</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleListening}
                className={`flex-shrink-0 w-12 h-[46px] rounded-xl flex items-center justify-center transition-colors shadow-sm border ${
                  isListening 
                    ? 'bg-red-50 border-red-200 text-red-500' 
                    : 'bg-white border-gray-200 text-gray-500 hover:text-primary hover:border-primary/50'
                }`}
              >
                {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
              </button>
              
              <div className="flex-1 relative">
                {!ledgerMode ? (
                  <div className="flex gap-2 w-full">
                    <div className="flex-1 relative">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={customerName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        onFocus={() => customerName.length >= 2 && customerSuggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Customer Name"
                        className="input-field w-full text-base py-3 font-medium h-[46px]"
                      />
                      {showSuggestions && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                          {customerSuggestions.map((c) => (
                            <button
                              key={c.id || c._id}
                              onMouseDown={() => selectCustomer(c)}
                              className="w-full text-left px-4 py-3 hover:bg-primary/5 border-b border-gray-50 last:border-0 transition-colors"
                            >
                              <div className="font-semibold text-sm text-text-dark">{c.name}</div>
                              <div className="text-xs text-gray-500">{c.phone}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="w-[120px] sm:w-[140px]">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="📱 Phone"
                        className="input-field w-full text-base py-3 h-[46px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 h-[46px] bg-white border border-gray-200 rounded-xl px-4 flex items-center justify-between shadow-sm">
                    <span className="font-bold text-gray-800 truncate pr-2">{ledgerCustomer?.name}</span>
                    <span className="text-xs font-semibold text-gray-400 flex-shrink-0">{ledgerCustomer?.phone}</span>
                  </div>
                )}
              </div>
            </div>
            
            {!ledgerMode && (
              <label className="inline-flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm">
                <input
                  type="checkbox"
                  checked={isHomeDelivery}
                  onChange={(e) => setIsHomeDelivery(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="font-medium text-gray-700">Home Delivery Rates</span>
              </label>
            )}
          </div>

          {/* ===== IRONING: QUICK-TAP GRID ===== */}
          <div className="px-5 pt-4 pb-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              ⚡ Ironing — Tap to Add
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {IRONING_ITEMS.map((item) => {
                const price = getIroningPrice(item.id)
                const inCart = cart.find((c) => c.itemId === item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleFixedTap(item)}
                    className={`relative flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 transition-all duration-150 active:scale-95 ${
                      inCart
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                    }`}
                  >
                    <span className="text-2xl mb-1">{item.emoji}</span>
                    <span className="font-bold text-sm text-text-dark">{item.name}</span>
                    <span className="text-xs font-semibold text-primary">₹{price}</span>
                    {inCart && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                        {inCart.qty}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ===== DRY CLEANING: VARIABLE PRICE GRID ===== */}
          <div className="px-5 pt-2 pb-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              🧪 Dry Cleaning — Tap to Set Price
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {DRYCLEAN_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleVariableTap(item)}
                  className="flex flex-col items-center justify-center py-3 px-1 rounded-xl border-2 border-gray-200 bg-white hover:border-red-400/50 hover:shadow-sm transition-all duration-150 active:scale-95"
                >
                  <span className="text-xl mb-0.5">{item.emoji}</span>
                  <span className="font-bold text-xs text-text-dark leading-tight">{item.name}</span>
                  <span className="text-[10px] font-semibold text-red-500">₹{item.defaultPrice}</span>
                </button>
              ))}
            </div>

            {/* Custom Item Button & Camera Button */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="flex-1 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                + Custom Item
              </button>
              
              <label className={`w-[52px] h-[52px] flex items-center justify-center rounded-xl border-2 transition-colors cursor-pointer ${isUploading ? 'bg-purple-100 border-purple-200 text-purple-600' : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300'}`}>
                {isUploading ? <Loader className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                <input type="file" accept="image/*" capture="environment" hidden onChange={handleCameraCapture} disabled={isUploading} />
              </label>
            </div>

            {/* Photo Evidence Thumbnails */}
            {evidencePhotos.length > 0 && (
              <div className="mt-3 bg-purple-50/50 p-2 sm:p-3 rounded-xl border border-purple-100 flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-purple-800 shrink-0">📸 Evidence:</span>
                {evidencePhotos.map((url, i) => (
                  <div key={i} className="relative shrink-0 group">
                    <img src={url} alt="Garment Evidence" className="w-[42px] h-[42px] object-cover rounded-lg border-2 border-white shadow-sm" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setEvidencePhotos(prev => prev.filter((_, index) => index !== i))
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Item Form */}
            {showCustomForm && (
              <div className="mt-2 bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="input-field text-sm py-2.5"
                  />
                  <input
                    type="number"
                    placeholder="Price ₹"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="input-field text-sm py-2.5"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="input-field text-sm py-2.5 flex-1"
                  >
                    <option value="Ironing">Ironing</option>
                    <option value="DryClean">Dry Clean</option>
                  </select>
                  <button onClick={addCustomItem} className="btn-primary px-4 py-2.5 text-sm font-bold">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ===== CART ===== */}
          {cart.length > 0 && (
            <div className="px-5 pb-3">
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Cart ({cart.length} items)
                  </h4>
                  <button
                    onClick={() => setCart([])}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {cart.map((item, idx) => (
                    <div key={idx} className="px-4 py-2.5 flex items-center justify-between bg-white">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text-dark truncate">{item.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.category === 'Ironing' 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {item.category === 'Ironing' ? 'Iron' : 'DC'}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-gray-400 mr-1 font-bold">₹</span>
                          <input
                            type="number"
                            value={item.rate === 0 && item.total === 0 ? '' : item.rate}
                            onChange={(e) => updateItemRate(idx, e.target.value)}
                            className="w-16 text-xs text-primary font-bold bg-gray-100/80 border border-transparent hover:border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all text-center"
                            placeholder="Price"
                          />
                          <span className="text-[10px] text-gray-400 ml-1 font-bold hidden sm:inline">each</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Qty Controls */}
                        <div className="flex items-center bg-gray-100 rounded-lg">
                          <button
                            onClick={() => updateQty(idx, -1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary transition-colors rounded-l-lg hover:bg-gray-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-text-dark">{item.qty}</span>
                          <button
                            onClick={() => updateQty(idx, 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary transition-colors rounded-r-lg hover:bg-gray-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Subtotal */}
                        <span className="font-bold text-sm text-text-dark w-14 text-right">₹{item.total}</span>
                        {/* Delete */}
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* ===== PAYMENT DETAILS ===== */}
          {cart.length > 0 && !ledgerMode && (
            <div className="px-5 pb-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Payment Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Advance Received ₹</label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="0"
                    className="input-field w-full py-2.5 text-base font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input-field w-full py-2.5 text-sm font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== FOOTER: TOTAL + SAVE ===== */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total</p>
              <h3 className="text-3xl font-bold text-primary">₹{getTotal().toLocaleString('en-IN')}</h3>
            </div>
            <button
              onClick={handleSubmit}
              disabled={cart.length === 0}
              className={`px-8 py-3.5 rounded-xl text-lg font-bold shadow-md transition-all ${
                cart.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'btn-primary hover:shadow-lg active:scale-95'
              }`}
            >
              ✅ Save Ticket
            </button>
          </div>
        </div>

        {/* ===== PRICE POPUP OVERLAY ===== */}
        {pricePopup && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => setPricePopup(null)}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <span className="text-4xl">{pricePopup.itemConfig.emoji}</span>
                <h4 className="text-xl font-bold text-text-dark mt-2">{pricePopup.itemConfig.name}</h4>
                <p className="text-xs text-gray-500 mb-2">Set service type, price and quantity</p>
                
                {/* Service Type Toggle */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg max-w-[200px] mx-auto">
                  <button
                    type="button"
                    onClick={() => setPricePopup({...pricePopup, category: 'DryClean'})}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${pricePopup.category === 'DryClean' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    Dry Clean
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricePopup({...pricePopup, category: 'Ironing'})}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${pricePopup.category === 'Ironing' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    Ironing
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Price ₹</label>
                  <input
                    type="number"
                    value={pricePopup.price}
                    onChange={(e) => setPricePopup({ ...pricePopup, price: e.target.value })}
                    className={`input-field text-center text-xl font-bold py-3 ${pricePopup.category === 'Ironing' ? 'text-primary' : 'text-red-500'}`}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Qty</label>
                  <input
                    type="number"
                    value={pricePopup.qty}
                    onChange={(e) => setPricePopup({ ...pricePopup, qty: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="input-field text-center text-xl font-bold py-3"
                  />
                </div>
              </div>

              {/* Stain Charge */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Stain Charge ₹ <span className="text-gray-400 normal-case font-normal">(extra)</span></label>
                <input
                  type="number"
                  value={pricePopup.stain}
                  onChange={(e) => setPricePopup({ ...pricePopup, stain: e.target.value })}
                  placeholder="0"
                  className="input-field text-center text-lg font-bold text-red-500 py-2.5 bg-red-50 border-red-200"
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">Subtotal</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{((parseFloat(pricePopup.price) || 0) * (parseInt(pricePopup.qty) || 1) + (parseFloat(pricePopup.stain) || 0)).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPricePopup(null)}
                  className="btn-secondary py-3 text-base font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPricePopup}
                  className="btn-primary py-3 text-base font-bold"
                >
                  ✓ Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderModal
