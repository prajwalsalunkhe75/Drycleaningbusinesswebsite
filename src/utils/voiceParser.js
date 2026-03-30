export const IRONING_ITEMS = [
  { id: 'shirt', name: 'Shirt', emoji: '👔', defaultPrice: 10 },
  { id: 'pant', name: 'Pant', emoji: '👖', defaultPrice: 10 },
  { id: 'bedsheet', name: 'Bedsheet', emoji: '🛏️', defaultPrice: 30 },
  { id: 'saree', name: 'Saree', emoji: '🧣', defaultPrice: 80 },
  { id: 'blazer', name: 'Blazer', emoji: '🧥', defaultPrice: 50 },
  { id: 'suit', name: 'Suit', emoji: '👔', defaultPrice: 100 },
  { id: 'lehnga', name: 'Lehnga', emoji: '👗', defaultPrice: 150 },
  { id: 'coat', name: 'Coat', emoji: '🧥', defaultPrice: 80 },
  { id: 'curtain', name: 'Curtain', emoji: '🪟', defaultPrice: 50 },
  { id: 'blanket', name: 'Blanket', emoji: '🛏️', defaultPrice: 60 },
  { id: 'sherwani', name: 'Sherwani', emoji: '👘', defaultPrice: 120 },
]

export const DRYCLEAN_ITEMS = [
  { id: 'dc_blazer', name: 'Blazer', emoji: '🧥', defaultPrice: 100 },
  { id: 'dc_saree', name: 'Saree', emoji: '🧣', defaultPrice: 150 },
  { id: 'dc_suit', name: 'Suit', emoji: '👔', defaultPrice: 200 },
  { id: 'dc_lehnga', name: 'Lehnga', emoji: '👗', defaultPrice: 300 },
  { id: 'dc_coat', name: 'Coat', emoji: '🧥', defaultPrice: 150 },
  { id: 'dc_curtain', name: 'Curtain', emoji: '🪟', defaultPrice: 100 },
  { id: 'dc_blanket', name: 'Blanket', emoji: '🛏️', defaultPrice: 120 },
  { id: 'dc_sherwani', name: 'Sherwani', emoji: '👘', defaultPrice: 350 },
]

const numberWords = {
  // English
  'one': 1, 'a': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  // Hindi
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'che': 6,
  'saat': 7, 'aath': 8, 'no': 9, 'das': 10,
  // Marathi
  'don': 2, 'tin': 3, 'pach': 5, 'saha': 6, 'sat': 7, 'nau': 9, 'daha': 10
}

const localTerms = {
  // Top wear
  'sadicha': 'dc_saree', 'sadi': 'dc_saree', 'saree': 'dc_saree', 'sari': 'dc_saree',
  'kot': 'dc_coat', 'coat': 'dc_coat', 'jacket': 'dc_coat', 'sweater': 'dc_coat', 'hoodie': 'dc_coat',
  'shirt': 'shirt', 'tshirt': 'shirt', 'top': 'shirt', 'kurta': 'shirt', 'kurtha': 'shirt', 'kurti': 'shirt', 'karta': 'shirt', 'jhabla': 'shirt', 'blouse': 'shirt', 'regular': 'shirt',
  
  // Bottom wear
  'pant': 'pant', 'jeans': 'pant', 'trouser': 'pant', 'pyjama': 'pant', 'pajama': 'pant', 'paijama': 'pant', 'pezama': 'pant', 'pajami': 'pant', 'chudidar': 'pant', 'salwar': 'pant', 'trackpant': 'pant', 'short': 'pant', 'shorts': 'pant',
  
  // Traditional / Sets
  'suit': 'dc_suit', 'safari': 'dc_suit', 'jodi': 'dc_suit', 'salwarkameez': 'dc_suit', 'kurtapajama': 'dc_suit', 'pair': 'dc_suit',
  'lehnga': 'dc_lehnga', 'ghagra': 'dc_lehnga', 'choli': 'dc_lehnga',
  'sherwani': 'dc_sherwani',
  'dupatta': 'dc_saree', 'chunni': 'dc_saree', 'shawl': 'dc_saree', 'stole': 'dc_saree', 'scarf': 'dc_saree',
  
  // Household
  'padada': 'dc_curtain', 'parda': 'dc_curtain', 'curtain': 'dc_curtain', 'drapery': 'dc_curtain',
  'kambal': 'dc_blanket', 'blanket': 'dc_blanket', 'godhadi': 'dc_blanket', 'razai': 'dc_blanket', 'quilt': 'dc_blanket',
  'chadar': 'bedsheet', 'bedsheet': 'bedsheet', 'takiya': 'bedsheet', 'cover': 'bedsheet'
}

const fillerWords = ['and', 'aani', 'ani', 'va', 'mala', 'tar', 'ekdam', 'please', 'for', 'of', 'sathi', 'karne', 'karo', 'red', 'blue', 'black', 'white', 'chota', 'motha', 'small', 'big', 'color', 'phone', 'mobile', 'number', 'no', 'customer', 'worker']
const ironKeywords = ['iron', 'ironing', 'istari', 'press', 'istri', 'pressing']
const dcKeywords = ['dryclean', 'dhulai', 'washing', 'wash']
const priceKeywords = ['rupee', 'rupees', 'rs', 'rupaye', 'ruppe']

/**
 * Universal Semantic Voice Parser
 * Takes raw spoken text and tokenizes it into Customer Name, Phone Number, and Structured Items.
 */
export const parseVoiceCommand = (text) => {
  let normalizedText = text
    .toLowerCase()
    .replace(/dry clean/g, 'dryclean')
    .replace(/dry cleaning/g, 'dryclean')
    .replace(/drycleaning/g, 'dryclean')
    .replace(/bed sheet/g, 'bedsheet')
    .replace(/pillow cover/g, 'pillowcover')
    .replace(/salwar kameez/g, 'salwarkameez')
    .replace(/kurta pajama/g, 'kurtapajama')
    .replace(/kurta payjama/g, 'kurtapajama')
    .replace(/kurthi/g, 'kurti')

  Object.entries(numberWords).forEach(([word, num]) => {
    const regMap = new RegExp(`\\b${word}\\b`, 'g')
    normalizedText = normalizedText.replace(regMap, num)
  })

  // Extact Phone Number (exactly 10 consecutive digits)
  let extractedPhone = ''
  normalizedText = normalizedText.replace(/(?<!\d)(?:(?:\d)\s*){10}(?!\d)/g, (match) => {
    extractedPhone = match.replace(/\s+/g, '')
    return ' ' // Strip from global stream
  })

  const rawWords = normalizedText.split(' ').map(w => w.replace(/[^a-z0-9]/g, '')).filter(Boolean)

  const tokens = []
  rawWords.forEach(word => {
    if (fillerWords.includes(word)) return

    if (!isNaN(parseInt(word))) {
      tokens.push({ type: 'NUMBER', value: parseInt(word) })
      return
    }
    if (ironKeywords.includes(word)) {
      tokens.push({ type: 'MODE', value: 'Ironing' })
      return
    }
    if (dcKeywords.includes(word)) {
      tokens.push({ type: 'MODE', value: 'DryClean' })
      return
    }
    if (priceKeywords.includes(word)) {
      tokens.push({ type: 'PRICE_TAG' })
      return
    }

    const mappedId = localTerms[word] || word
    const fixedItemMatch = IRONING_ITEMS.find(i => mappedId.includes(i.id) || i.id.includes(mappedId))
    if (fixedItemMatch) {
      tokens.push({ type: 'ITEM', item: fixedItemMatch, isFixed: true, raw: word })
      return
    }

    const varItemMatch = DRYCLEAN_ITEMS.find(i => mappedId.includes(i.id.replace('dc_', '')) || i.name.toLowerCase().includes(mappedId))
    if (varItemMatch) {
        tokens.push({ type: 'ITEM', item: varItemMatch, isFixed: false, raw: word })
        return
    }

    tokens.push({ type: 'UNKNOWN', value: word })
  })

  let extractedName = []
  let pendingQty = 1
  let pendingMode = null
  const finalItems = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === 'UNKNOWN') {
      if (finalItems.length === 0 && pendingQty === 1 && pendingMode === null) {
        extractedName.push(token.value.charAt(0).toUpperCase() + token.value.slice(1))
      } else {
        const customName = token.value.charAt(0).toUpperCase() + token.value.slice(1)
        const fakeItem = { id: 'custom_' + token.value, name: customName, defaultPrice: 50 }
        finalItems.push({
          itemConfig: fakeItem,
          isFixed: false,
          qty: pendingQty,
          overrideMode: pendingMode,
          explicitMode: false,
          overridePrice: null
        })
        pendingQty = 1
      }
    }

    if (token.type === 'NUMBER') {
      if (i + 1 < tokens.length && tokens[i+1].type === 'PRICE_TAG') {
        if (finalItems.length > 0) {
          finalItems[finalItems.length - 1].overridePrice = token.value
        }
        i++ // Skip PRICE_TAG
      } else {
        pendingQty = token.value
      }
    }

    if (token.type === 'MODE') {
      for (let j = finalItems.length - 1; j >= 0; j--) {
        if (!finalItems[j].explicitMode) {
          finalItems[j].overrideMode = token.value
          finalItems[j].explicitMode = true
        } else {
          break
        }
      }
      pendingMode = token.value
    }

    if (token.type === 'ITEM') {
      finalItems.push({
        itemConfig: token.item,
        isFixed: token.isFixed,
        qty: pendingQty,
        overrideMode: pendingMode,
        explicitMode: false,
        overridePrice: null
      })
      pendingQty = 1
    }
  }

  return {
    names: extractedName,
    phone: extractedPhone,
    items: finalItems
  }
}

import { aiAPI } from './api'

/**
 * AI Powered Semantic Voice Parser via Gemini
 * Uses the backend proxy endpoint configured with an API key
 */
export const parseVoiceCommandAI = async (text, apiKey) => {
  const response = await aiAPI.parseVoice(text, apiKey)
  return response.data // Should match { names: [], phone: "", items: [{name, qty, category, price}] }
}
