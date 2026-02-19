import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { ordersAPI } from '../utils/api'
import toast from 'react-hot-toast'

const OrderModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    isHomeDelivery: false,
  })
  const [cart, setCart] = useState([])
  const [ironingType, setIroningType] = useState('shirt')
  const [ironingQty, setIroningQty] = useState(1)
  const [ironingRate, setIroningRate] = useState(8)
  const [showIroning, setShowIroning] = useState(true)
  const [showDryClean, setShowDryClean] = useState(false)
  const [dryCleanItem, setDryCleanItem] = useState('')
  const [dryCleanRate, setDryCleanRate] = useState('')
  const [dryCleanQty, setDryCleanQty] = useState(1)
  const [dryCleanStain, setDryCleanStain] = useState('')
  const [customIronName, setCustomIronName] = useState('')
  const [customIronRate, setCustomIronRate] = useState('')

  const IRONING_PRICES = {
    regular: { shirt: 8, pant: 8, saree: 120, blazer: 120, bedsheet: 30 },
    home: { shirt: 15, pant: 15, saree: 150, blazer: 150, bedsheet: 40 },
  }

  useEffect(() => {
    const savedPrices = localStorage.getItem('laundryPrices')
    if (savedPrices) {
      const parsed = JSON.parse(savedPrices)
      if (parsed.regular) {
        IRONING_PRICES.regular = parsed.regular
        IRONING_PRICES.home = parsed.home
      }
    }
  }, [])

  const getIroningRate = () => {
    if (ironingType === 'other' || ironingType === 'steam') {
      return parseFloat(customIronRate) || 0
    }
    const prices = formData.isHomeDelivery ? IRONING_PRICES.home : IRONING_PRICES.regular
    return prices[ironingType] || 0
  }

  const addIroningItem = () => {
    const rate = getIroningRate()
    if (rate <= 0) {
      toast.error('Please enter a valid rate')
      return
    }

    let name = ''
    if (ironingType === 'other' || ironingType === 'steam') {
      if (!customIronName) {
        toast.error('Please enter item name')
        return
      }
      name = `${customIronName} (${ironingType === 'steam' ? 'Steam' : 'Other'})`
    } else {
      name = ironingType.charAt(0).toUpperCase() + ironingType.slice(1)
    }

    const total = rate * ironingQty
    setCart([...cart, { name, category: 'Ironing', qty: ironingQty, rate, total }])
    
    // Reset
    setCustomIronName('')
    setCustomIronRate('')
    setIroningQty(1)
  }

  const addDryCleanItem = () => {
    if (!dryCleanItem || !dryCleanRate) {
      toast.error('Please fill all fields')
      return
    }
    const rate = parseFloat(dryCleanRate)
    const qty = parseInt(dryCleanQty) || 1
    const stain = parseFloat(dryCleanStain) || 0
    const total = rate * qty + stain
    const name = stain > 0 ? `${dryCleanItem} (+₹${stain} Stain)` : dryCleanItem

    setCart([...cart, { name, category: 'DryClean', qty, rate, total }])
    
    // Reset
    setDryCleanItem('')
    setDryCleanRate('')
    setDryCleanQty(1)
    setDryCleanStain('')
  }

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }

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

  const handleSubmit = async () => {
    if (!formData.customerName) {
      toast.error('Please enter customer name')
      return
    }
    if (cart.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    try {
      const ticketId = generateTicketId()
      const newOrder = {
        id: ticketId,
        customerName: formData.customerName,
        phone: formData.phone,
        items: cart.map((item) => ({
          type: item.name,
          qty: item.qty,
          price: item.total,
        })),
        totalAmount: getTotal(),
        status: 'Pending',
        paymentStatus: 'Unpaid',
        origin: 'dashboard',
        date: new Date(),
      }

      await ordersAPI.create(newOrder)
      toast.success(`Ticket ${ticketId} created successfully!`)
      
      // Reset form
      setFormData({ customerName: '', phone: '', isHomeDelivery: false })
      setCart([])
      onSuccess()
    } catch (error) {
      toast.error('Failed to create order')
      console.error(error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary text-white p-6 flex justify-between items-center">
          <h3 className="text-2xl font-bold">Create New Ticket</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-6">
              {/* Customer Details */}
              <div>
                <h6 className="text-lg font-bold text-primary mb-3">1. Customer Details</h6>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHomeDelivery}
                    onChange={(e) =>
                      setFormData({ ...formData, isHomeDelivery: e.target.checked })
                    }
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm font-medium">Home Delivery Rates</span>
                </label>
              </div>

              {/* Add Clothes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h6 className="text-lg font-bold text-primary">2. Add Clothes</h6>
                  <div className="flex gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showIroning}
                        onChange={(e) => setShowIroning(e.target.checked)}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span className="text-sm font-medium">Ironing</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDryClean}
                        onChange={(e) => setShowDryClean(e.target.checked)}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span className="text-sm font-medium">Dry Clean</span>
                    </label>
                  </div>
                </div>

                {/* Ironing Form */}
                {showIroning && (
                  <div className="bg-bg-light p-4 rounded-xl mb-3 border-l-4 border-primary">
                    <select
                      value={ironingType}
                      onChange={(e) => setIroningType(e.target.value)}
                      className="input-field mb-2"
                    >
                      <option value="shirt">Shirt</option>
                      <option value="pant">Pant</option>
                      <option value="saree">Saree</option>
                      <option value="blazer">Blazer</option>
                      <option value="bedsheet">Bedsheet</option>
                      <option value="other">Other (Specify)</option>
                      <option value="steam">Steam Press (Variable)</option>
                    </select>
                    {(ironingType === 'other' || ironingType === 'steam') && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Item Name"
                          value={customIronName}
                          onChange={(e) => setCustomIronName(e.target.value)}
                          className="input-field"
                        />
                        <input
                          type="number"
                          placeholder="Rate ₹"
                          value={customIronRate}
                          onChange={(e) => setCustomIronRate(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={ironingQty}
                        onChange={(e) => setIroningQty(parseInt(e.target.value) || 1)}
                        min="1"
                        className="input-field"
                      />
                      <button onClick={addIroningItem} className="btn-primary">
                        <Plus className="h-4 w-4 inline mr-1" />
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Dry Clean Form */}
                {showDryClean && (
                  <div className="bg-red-50 p-4 rounded-xl mb-3 border-l-4 border-red-500">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={dryCleanItem}
                        onChange={(e) => setDryCleanItem(e.target.value)}
                        className="input-field col-span-2"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={dryCleanRate}
                        onChange={(e) => setDryCleanRate(e.target.value)}
                        className="input-field"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={dryCleanQty}
                        onChange={(e) => setDryCleanQty(parseInt(e.target.value) || 1)}
                        min="1"
                        className="input-field"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Stain Charge ₹"
                        value={dryCleanStain}
                        onChange={(e) => setDryCleanStain(e.target.value)}
                        className="input-field"
                      />
                      <button onClick={addDryCleanItem} className="btn-primary bg-red-600 hover:bg-red-700">
                        <Plus className="h-4 w-4 inline mr-1" />
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Cart */}
                <div className="bg-gray-50 p-4 rounded-xl min-h-[100px]">
                  {cart.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm">No items yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white p-2 rounded-lg"
                        >
                          <div>
                            <span className="font-semibold text-sm">
                              {item.qty} x {item.name}
                            </span>
                            <br />
                            <span
                              className={`text-xs ${
                                item.category === 'Ironing' ? 'text-primary' : 'text-red-600'
                              }`}
                            >
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">₹{item.total}</span>
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t mt-4">
                  <h4 className="text-2xl font-bold text-primary">₹{getTotal()}</h4>
                  <button onClick={handleSubmit} className="btn-primary px-6">
                    Generate Receipt
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Receipt Preview */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-center border-b pb-3 mb-3">
                  <h6 className="font-bold text-lg uppercase">Angel's Dry Cleaners</h6>
                  <small className="text-gray-600">Ticket #{generateTicketId()}</small>
                </div>
                <div className="mb-3 text-sm">
                  <div>
                    <strong>Name:</strong> {formData.customerName || '---'}
                  </div>
                  <div>
                    <strong>Phone:</strong> {formData.phone || '---'}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date().toLocaleDateString()}
                  </div>
                </div>
                <div className="border-t pt-3 space-y-1 mb-3">
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center">No items</p>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.qty} x {item.name}</span>
                        <span>₹{item.total}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{getTotal()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderModal
