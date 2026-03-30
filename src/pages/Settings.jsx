import { useState, useEffect } from 'react'
import { Save, Tag, Users, Store, Shirt } from 'lucide-react'
import { settingsAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { IRONING_ITEMS, DRYCLEAN_ITEMS } from '../utils/voiceParser'
import { validators, validateForm } from '../utils/validation'
import { getErrorMessage } from '../utils/errorHandler'
import { SkeletonLoader } from '../components/DataStates'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('prices') // 'prices', 'wages', 'profile'
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [settings, setSettings] = useState({
    regular: {},
    home: {},
    wages: {},
    shopName: "Angel's Dry Cleaners",
    shopAddress: 'Shop No. 4, MG Road, Pune',
    geminiApiKey: '',
    voiceLanguage: 'en-IN',
    cloudinaryCloudName: '',
    cloudinaryPreset: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await settingsAPI.get()
      const data = response.data || {}
      
      let mergedRegular = { ...data.regular }
      let mergedHome = { ...data.home }
      let mergedWages = { ...data.wages }

      // Read legacy localStorage if API empty
      if (Object.keys(mergedRegular).length === 0) {
        const saved = localStorage.getItem('laundryPrices')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed.regular) mergedRegular = { ...parsed.regular }
            if (parsed.home) mergedHome = { ...parsed.home }
            if (parsed.wages) mergedWages = { ...parsed.wages }
          } catch (e) {}
        }
      }

      // Seed ALL items from the Global voiceParser Dictionaries
      IRONING_ITEMS.forEach(item => {
        if (mergedRegular[item.id] === undefined) mergedRegular[item.id] = item.defaultPrice || 10
        if (mergedHome[item.id] === undefined) mergedHome[item.id] = (item.defaultPrice || 10) + 5
        if (mergedWages[item.id] === undefined) mergedWages[item.id] = 4
      })
      
      DRYCLEAN_ITEMS.forEach(item => {
        if (mergedRegular[item.id] === undefined) mergedRegular[item.id] = item.defaultPrice || 100
        if (mergedHome[item.id] === undefined) mergedHome[item.id] = (item.defaultPrice || 100) + 20
        if (mergedWages[item.id] === undefined) mergedWages[item.id] = 20
      })

      setSettings({
        regular: mergedRegular,
        home: mergedHome,
        wages: mergedWages,
        shopName: data.shopName || "Angel's Dry Cleaners",
        shopAddress: data.shopAddress || "Shop No. 4, MG Road, Pune",
        geminiApiKey: data.geminiApiKey || '',
        voiceLanguage: data.voiceLanguage || 'en-IN',
        cloudinaryCloudName: data.cloudinaryCloudName || '',
        cloudinaryPreset: data.cloudinaryPreset || '',
      })
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Could not connect to settings API')
    } finally {
      setLoading(false)
    }
  }

  const handlePriceChange = (category, itemId, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [itemId]: value === '' ? '' : parseFloat(value),
      },
    }))
  }

  const handleSave = async () => {
    // Validate prices (all should be numbers)
    const validationSchema = {
      regularPrices: [validators.required, validators.amount],
      wages: [validators.required, validators.amount],
    }
    
    const priceValues = Object.values(settings.regular).filter(v => v !== '').length
    const wageValues = Object.values(settings.wages).filter(v => v !== '').length
    
    if (priceValues === 0 || wageValues === 0) {
      toast.error('Please enter at least one price/wage value')
      return
    }

    setSaving(true)
    try {
      // Clean up empty strings to 0
      const cleanSettings = JSON.parse(JSON.stringify(settings))
      Object.keys(cleanSettings.regular).forEach(k => cleanSettings.regular[k] = cleanSettings.regular[k] || 0)
      Object.keys(cleanSettings.home).forEach(k => cleanSettings.home[k] = cleanSettings.home[k] || 0)
      Object.keys(cleanSettings.wages).forEach(k => cleanSettings.wages[k] = cleanSettings.wages[k] || 0)

      await settingsAPI.save(cleanSettings)
      
      // Global backward compatibility
      localStorage.setItem('laundryPrices', JSON.stringify({
        regular: cleanSettings.regular,
        home: cleanSettings.home,
        wages: cleanSettings.wages,
      }))
      localStorage.setItem('voiceLanguage', cleanSettings.voiceLanguage)
      localStorage.setItem('cloudinaryCloudName', cleanSettings.cloudinaryCloudName)
      localStorage.setItem('cloudinaryPreset', cleanSettings.cloudinaryPreset)
      
      toast.success('Settings synchronized globally!')
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'save settings')
      toast.error(errorMsg)
      console.error(error)
    } finally {
      setSaving(false)
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
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-3xl font-bold text-text-dark dark:text-white flex items-center">
            <Store className="h-8 w-8 mr-3 text-primary dark:text-cyan-400" />
            Shop Configuration
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-md">
            Changes made here instantly sync to the Voice Parser, Orders Dashboard, and Worker Logs.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center justify-center space-x-2 px-8 py-3 w-full sm:w-auto text-lg shadow-lg hover:shadow-xl transition-all"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Sync All Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 sm:space-x-4 bg-gray-100/50 p-1 rounded-xl overflow-x-auto border border-gray-200">
        <button
          onClick={() => setActiveTab('prices')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
            activeTab === 'prices' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Tag className="h-4 w-4 mr-2" />
          Customer Prices
        </button>
        <button
          onClick={() => setActiveTab('wages')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
            activeTab === 'wages' ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="h-4 w-4 mr-2" />
          Worker Wages
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
            activeTab === 'profile' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Store className="h-4 w-4 mr-2" />
          Shop Profile
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
            activeTab === 'integrations' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Tag className="h-4 w-4 mr-2" />
          AI & Setup
        </button>
      </div>

      {/* ======================= */}
      {/* TAB 1: CUSTOMER PRICES  */}
      {/* ======================= */}
      {activeTab === 'prices' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          
          <div className="card shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-50/50 border-b border-blue-100 p-4">
              <h4 className="font-bold text-blue-800 flex items-center">
                <Shirt className="h-5 w-5 mr-2" />
                ⚡ Ironing Rates Grid
              </h4>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-gray-500 uppercase">Item Name</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 uppercase text-right w-40">Walk-In (₹)</th>
                      <th className="px-6 py-3 font-semibold text-blue-600 uppercase text-right w-40 bg-blue-50/30">Home Del (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {IRONING_ITEMS.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <span className="text-xl mr-3">{item.emoji}</span>
                            <span className="font-bold text-gray-800">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          <input
                            type="number"
                            value={settings.regular[item.id]}
                            onChange={(e) => handlePriceChange('regular', item.id, e.target.value)}
                            className="w-full text-right p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-border-primary font-bold bg-white"
                          />
                        </td>
                        <td className="px-6 py-2 bg-blue-50/10">
                          <input
                            type="number"
                            value={settings.home[item.id]}
                            onChange={(e) => handlePriceChange('home', item.id, e.target.value)}
                            className="w-full text-right p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-blue-700 bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="bg-red-50/50 border-b border-red-100 p-4">
              <h4 className="font-bold text-red-800 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                🧪 Dry Cleaning Rates Grid
              </h4>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-gray-500 uppercase">Item Name</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 uppercase text-right w-40">Walk-In (₹)</th>
                      <th className="px-6 py-3 font-semibold text-blue-600 uppercase text-right w-40 bg-blue-50/30">Home Del (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {DRYCLEAN_ITEMS.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <span className="text-xl mr-3">{item.emoji}</span>
                            <span className="font-bold text-gray-800">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          <input
                            type="number"
                            value={settings.regular[item.id]}
                            onChange={(e) => handlePriceChange('regular', item.id, e.target.value)}
                            className="w-full text-right p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-border-primary font-bold bg-white"
                          />
                        </td>
                        <td className="px-6 py-2 bg-blue-50/10">
                          <input
                            type="number"
                            value={settings.home[item.id]}
                            onChange={(e) => handlePriceChange('home', item.id, e.target.value)}
                            className="w-full text-right p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-blue-700 bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ======================= */}
      {/* TAB 2: WORKER WAGES     */}
      {/* ======================= */}
      {activeTab === 'wages' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="card shadow-sm border border-green-100 overflow-hidden">
            <div className="bg-green-50/50 border-b border-green-100 p-4">
              <h4 className="font-bold text-green-800 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Piece-Rate Worker Payouts
              </h4>
              <p className="text-xs text-green-700 mt-1">These values auto-fill when a worker submits units on their dashboard.</p>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-gray-500 uppercase">Item Category</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 uppercase">Item Name</th>
                      <th className="px-6 py-3 font-semibold text-green-600 uppercase text-right w-40">Wage (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Combine Iron and DC for unified list */}
                    {[...IRONING_ITEMS.map(i => ({...i, cat: 'Ironing'})), ...DRYCLEAN_ITEMS.map(i => ({...i, cat: 'DryClean'}))].map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3">
                           <span className={`px-2 py-1 text-xs font-bold rounded-full ${item.cat === 'Ironing' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                             {item.cat}
                           </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <span className="text-xl mr-3">{item.emoji}</span>
                            <span className="font-bold text-gray-800">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2 bg-green-50/5">
                          <input
                            type="number"
                            value={settings.wages[item.id]}
                            onChange={(e) => handlePriceChange('wages', item.id, e.target.value)}
                            className="w-full text-right p-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-green-700 bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= */}
      {/* TAB 3: SHOP PROFILE     */}
      {/* ======================= */}
      {activeTab === 'profile' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="card p-5 sm:p-8 shadow-sm max-w-2xl mx-auto">
            <h5 className="text-xl font-bold text-primary mb-6 flex items-center">
              <Store className="h-6 w-6 mr-3" />
              Receipt Details
            </h5>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                  Shop Name (Printed on Bills)
                </label>
                <input
                  type="text"
                  value={settings.shopName}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                  className="input-field dark:bg-slate-700 dark:text-white dark:border-gray-600 py-3 font-semibold text-lg text-text-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                  Shop Address
                </label>
                <textarea
                  value={settings.shopAddress}
                  onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                  rows="3"
                  className="input-field dark:bg-slate-700 dark:text-white dark:border-gray-600 py-3 font-medium text-text-dark resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= */}
      {/* TAB 4: AI INTEGRATIONS  */}
      {/* ======================= */}
      {activeTab === 'integrations' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="card p-5 sm:p-8 shadow-sm max-w-2xl mx-auto border border-purple-100">
            <h5 className="text-xl font-bold text-purple-700 mb-6 flex items-center">
              <span className="text-2xl mr-3">🤖</span>
              AI Integrations
            </h5>
            <div className="space-y-6">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <h6 className="font-bold text-purple-900 mb-2">Google Gemini API Key</h6>
                <p className="text-sm text-purple-700 mb-4">
                  Providing an API key here upgrades the Voice Order Parser from basic keyword-matching to full Natural Language Processing.
                </p>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={settings.geminiApiKey}
                  onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                  className="input-field py-3 font-mono text-sm w-full"
                />
                <p className="text-xs text-purple-500 mt-2">
                  Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio</a>.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h6 className="font-bold text-blue-900 mb-2">Voice Dictation Language</h6>
                <p className="text-sm text-blue-700 mb-4">
                  Choose the language the browser will listen for. This dramatically improves accuracy for regional words before they are sent to the AI.
                </p>
                <select
                  value={settings.voiceLanguage}
                  onChange={(e) => setSettings({ ...settings, voiceLanguage: e.target.value })}
                  className="input-field py-3 font-bold text-sm w-full bg-white"
                >
                  <option value="en-IN">English / Hinglish (en-IN)</option>
                  <option value="mr-IN">Marathi (mr-IN)</option>
                  <option value="hi-IN">Hindi (hi-IN)</option>
                  <option value="gu-IN">Gujarati (gu-IN)</option>
                </select>
              </div>

              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                <h6 className="font-bold text-teal-900 mb-2">Cloudinary Free Tier (Photo Evidence)</h6>
                <p className="text-sm text-teal-700 mb-4">
                  Zero-cost hosting for Garment Photo Evidence. Provide your Cloud Name and Unsigned Upload Preset.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Cloud Name (e.g. dyx...)"
                    value={settings.cloudinaryCloudName}
                    onChange={(e) => setSettings({ ...settings, cloudinaryCloudName: e.target.value })}
                    className="input-field py-3 font-mono text-sm w-full bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Upload Preset (e.g. ml_default)"
                    value={settings.cloudinaryPreset}
                    onChange={(e) => setSettings({ ...settings, cloudinaryPreset: e.target.value })}
                    className="input-field py-3 font-mono text-sm w-full bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Settings