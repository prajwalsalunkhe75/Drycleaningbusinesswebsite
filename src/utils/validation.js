/**
 * Validation Utility - Centralized input validation for forms
 */

export const validators = {
  // Phone validation (10+ digits)
  phone: (value) => {
    const phone = String(value).replace(/\D/g, '')
    if (!phone) return { valid: false, error: 'Phone number is required' }
    if (phone.length < 10) return { valid: false, error: 'Phone number must be at least 10 digits' }
    if (phone.length > 15) return { valid: false, error: 'Phone number is too long' }
    return { valid: true }
  },

  // Email validation
  email: (value) => {
    const email = String(value).trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return { valid: false, error: 'Email is required' }
    if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' }
    return { valid: true }
  },

  // Name validation (2+ characters, no numbers)
  name: (value) => {
    const name = String(value).trim()
    if (!name) return { valid: false, error: 'Name is required' }
    if (name.length < 2) return { valid: false, error: 'Name must be at least 2 characters' }
    if (/^\d+$/.test(name)) return { valid: false, error: 'Name cannot contain only numbers' }
    return { valid: true }
  },

  // Amount/Price validation (positive number)
  amount: (value) => {
    const amount = Number(value)
    if (isNaN(amount)) return { valid: false, error: 'Must be a valid number' }
    if (amount <= 0) return { valid: false, error: 'Amount must be greater than 0' }
    if (amount > 999999) return { valid: false, error: 'Amount is too large' }
    return { valid: true }
  },

  // Quantity validation (positive integer)
  quantity: (value) => {
    const qty = Number(value)
    if (isNaN(qty)) return { valid: false, error: 'Must be a valid number' }
    if (qty < 1) return { valid: false, error: 'Quantity must be at least 1' }
    if (!Number.isInteger(qty)) return { valid: false, error: 'Quantity must be a whole number' }
    if (qty > 1000) return { valid: false, error: 'Quantity is too large' }
    return { valid: true }
  },

  // Address validation (3+ characters)
  address: (value) => {
    const addr = String(value).trim()
    if (!addr) return { valid: false, error: 'Address is required' }
    if (addr.length < 3) return { valid: false, error: 'Address must be at least 3 characters' }
    return { valid: true }
  },

  // Ticket number validation
  ticketNo: (value) => {
    const ticket = String(value).trim()
    if (!ticket) return { valid: false, error: 'Ticket number is required' }
    if (ticket.length < 1) return { valid: false, error: 'Invalid ticket number' }
    return { valid: true }
  },

  // Generic required field
  required: (value, fieldName = 'This field') => {
    if (!value || String(value).trim() === '') {
      return { valid: false, error: `${fieldName} is required` }
    }
    return { valid: true }
  },
}

/**
 * Validate an object against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema { fieldName: 'validatorName' or { validator: 'name', message: 'custom' } }
 * @returns {Object} { isValid: boolean, errors: { fieldName: 'error message' } }
 */
export const validateForm = (data, schema) => {
  const errors = {}
  const results = { isValid: true, errors }

  Object.entries(schema).forEach(([fieldName, config]) => {
    const value = data[fieldName]
    let validator = config
    let customMessage = null

    // Handle object config format
    if (typeof config === 'object') {
      validator = config.validator
      customMessage = config.message
    }

    if (validators[validator]) {
      const result = validators[validator](value)
      if (!result.valid) {
        errors[fieldName] = customMessage || result.error
        results.isValid = false
      }
    }
  })

  return results
}

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
