import { useState, useEffect } from 'react'
import { Save, Tag, Users, Store } from 'lucide-react'
import toast from 'react-hot-toast'

const Settings = () => {
  const [settings, setSettings] = useState({
    regular: { shirt: 8, pant: 8, saree: 120, blazer: 120, bedsheet: 30 },
    home: { shirt: 15, pant: 15, saree: 150, blazer: 150, bedsheet: 40 },
    wages: { shirt: 3.5, pant: 3.5, saree: 10, blazer: 20, bedsheet: 5 },
  })
  const [selectedCategory, setSelectedCategory] = useState({
    regular: 'shirt',
    home: 'shirt',
    wages: 'shirt',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('laundryPrices')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings({
          regular: parsed.regular || settings.regular,
          home: parsed.home || settings.home,
          wages: parsed.wages || settings.wages,
        })
      } catch (error) {
        console.error('Failed to parse saved settings')
      }
    }
  }, [])

  const handlePriceChange = (category, item, value) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [item]: parseFloat(value) || 0,
      },
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem('laundryPrices', JSON.stringify(settings))
      setTimeout(() => {
        toast.success('Settings saved successfully!')
        setSaving(false)
      }, 800)
    } catch (error) {
      toast.error('Failed to save settings')
      setSaving(false)
    }
  }

  const items = ['shirt', 'pant', 'saree', 'blazer', 'bedsheet']

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-text-dark">Settings & Rates</h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage prices using the dropdown menus below.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center justify-center space-x-2 px-6 w-full sm:w-auto py-3 sm:py-2 text-lg sm:text-base shadow-md"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: CUSTOMER PRICE LIST           */}
        {/* ========================================== */}
        <div className="card p-5 sm:p-6 shadow-sm">
          <h5 className="text-lg sm:text-xl font-bold text-primary mb-6 flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Customer Price List
          </h5>

          {/* Standard Rates */}
          <div className="bg-gray-50 p-4 sm:p-5 rounded-xl mb-4 border border-gray-100">
            <h6 className="font-bold text-text-dark mb-3 border-b border-gray-200 pb-2">Standard Rates (Walk-in)</h6>
            
            {/* Grid changes from 1 column on mobile to 2 columns on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Select Item
                </label>
                <select
                  value={selectedCategory.regular}
                  onChange={(e) =>
                    setSelectedCategory({ ...selectedCategory, regular: e.target.value })
                  }
                  className="input-field bg-white"
                >
                  {items.map((item) => (
                    <option key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={settings.regular[selectedCategory.regular]}
                    onChange={(e) =>
                      handlePriceChange('regular', selectedCategory.regular, e.target.value)
                    }
                    className="input-field pl-8 bg-white font-semibold text-primary text-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Home Delivery Rates */}
          <div className="bg-blue-50/50 p-4 sm:p-5 rounded-xl border border-blue-100">
            <h6 className="font-bold text-primary mb-3 border-b border-blue-200 pb-2">Home Delivery Rates (+Charge)</h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-800 mb-1.5">
                  Select Item
                </label>
                <select
                  value={selectedCategory.home}
                  onChange={(e) =>
                    setSelectedCategory({ ...selectedCategory, home: e.target.value })
                  }
                  className="input-field bg-white border-blue-200"
                >
                  {items.map((item) => (
                    <option key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-800 mb-1.5">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={settings.home[selectedCategory.home]}
                    onChange={(e) =>
                      handlePriceChange('home', selectedCategory.home, e.target.value)
                    }
                    className="input-field pl-8 bg-white border-blue-200 font-semibold text-blue-700 text-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: WORKER WAGES & PROFILE       */}
        {/* ========================================== */}
        <div className="space-y-6">
          
          {/* Worker Wages */}
          <div className="card p-5 sm:p-6 shadow-sm">
            <h5 className="text-lg sm:text-xl font-bold text-primary mb-2 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Worker Wages (Payout)
            </h5>
            <p className="text-sm text-gray-600 mb-4">
              Set the amount paid to the worker per piece.
            </p>

            <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:items-end">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Select Item
                  </label>
                  <select
                    value={selectedCategory.wages}
                    onChange={(e) =>
                      setSelectedCategory({ ...selectedCategory, wages: e.target.value })
                    }
                    className="input-field bg-white"
                  >
                    {items.map((item) => (
                      <option key={item} value={item}>
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Wage
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={settings.wages[selectedCategory.wages]}
                      onChange={(e) =>
                        handlePriceChange('wages', selectedCategory.wages, e.target.value)
                      }
                      className="input-field pl-8 bg-white font-semibold text-green-600 text-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <p className="text-sm text-gray-700">
                  Select an item above to edit its specific wage.
                </p>
              </div>
            </div>
          </div>

          {/* Shop Profile */}
          <div className="card p-5 sm:p-6 shadow-sm">
            <h5 className="text-lg sm:text-xl font-bold text-primary mb-5 flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Shop Profile
            </h5>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Shop Name
                </label>
                <input
                  type="text"
                  defaultValue="Angel's Dry Cleaners"
                  className="input-field font-medium text-text-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Address
                </label>
                <textarea
                  defaultValue="Shop No. 4, MG Road, Pune"
                  rows="2"
                  className="input-field font-medium text-text-dark resize-none"
                />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default Settings