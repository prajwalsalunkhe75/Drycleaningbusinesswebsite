/**
 * Error Handling Utility
 * Provides consistent error handling and logging across the app
 */

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * Handle errors with consistent logging and messaging
 */
export const handleError = (error, defaultMessage = 'An error occurred') => {
  let message = defaultMessage
  let status = 500
  let details = null

  // API Error Response
  if (error.response) {
    status = error.response.status
    message = error.response.data?.message || defaultMessage
    details = error.response.data?.details || error.response.data

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`[${status}] API Error:`, {
        message,
        details,
        url: error.config?.url,
        method: error.config?.method,
      })
    }
  }
  // Network Error
  else if (error.request) {
    message = 'Network error. Please check your connection.'
    status = 0
    if (import.meta.env.DEV) {
      console.error('Network Error:', error.request)
    }
  }
  // Other Errors
  else {
    if (import.meta.env.DEV) {
      console.error('Error:', error.message)
    }
  }

  return {
    message,
    status,
    details,
    isNetworkError: !error.response && error.request,
    isValidationError: status === 400,
    isAuthError: status === 401 || status === 403,
    isServerError: status >= 500,
  }
}

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error, operation = 'operation') => {
  const { message, status } = handleError(error)

  const statusMessages = {
    400: `Invalid input. Please check your ${operation} details.`,
    401: 'Your session has expired. Please login again.',
    403: 'You do not have permission to perform this action.',
    404: `The ${operation} was not found.`,
    409: `A conflict occurred during the ${operation}.`,
    500: 'Server error. Please try again later.',
    0: 'Network error. Please check your internet connection.',
  }

  return statusMessages[status] || message
}

/**
 * Log error for debugging
 */
export const logError = (error, context = '') => {
  if (import.meta.env.DEV) {
    const timestamp = new Date().toISOString()
    console.group(`🔴 Error at ${timestamp} ${context}`)
    console.error(error)
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Data:', error.response.data)
    }
    console.groupEnd()
  }
}

/**
 * Validate response structure
 */
export const validateResponse = (data, expectedFields = []) => {
  if (!data) {
    throw new ApiError('Empty response received', 500)
  }

  // Check for expected fields
  if (expectedFields.length > 0) {
    const missing = expectedFields.filter((field) => !(field in data))
    if (missing.length > 0) {
      throw new ApiError(
        `Missing fields in response: ${missing.join(', ')}`,
        500,
        { missingFields: missing }
      )
    }
  }

  return data
}

export default {
  ApiError,
  handleError,
  getErrorMessage,
  logError,
  validateResponse,
}
