/**
 * Custom Hooks for Common Patterns
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { handleError, getErrorMessage } from '../utils/errorHandler'
import toast from 'react-hot-toast'

/**
 * useFetch Hook - Handle data fetching with loading and error states
 */
export const useFetch = (fetchFn, dependencies = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      setData(result.data || result)
    } catch (err) {
      const { message } = handleError(err)
      setError(message)
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

/**
 * usePaginatedData Hook - Handle paginated data fetching
 */
export const usePaginatedData = (fetchFn) => {
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const itemsPerPage = 10

  const fetch = useCallback(
    async (pageNum) => {
      try {
        setLoading(true)
        setError(null)
        const result = await fetchFn(pageNum, itemsPerPage)
        setData(result.data.data || [])
        setTotalItems(result.data.pagination.total)
        setTotalPages(result.data.pagination.totalPages)
        setPage(pageNum)
      } catch (err) {
        const { message } = handleError(err)
        setError(message)
        toast.error(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    },
    [fetchFn]
  )

  useEffect(() => {
    fetch(1)
  }, [])

  return {
    data,
    page,
    totalPages,
    totalItems,
    loading,
    error,
    goToPage: fetch,
    nextPage: () => fetch(Math.min(page + 1, totalPages)),
    prevPage: () => fetch(Math.max(page - 1, 1)),
  }
}

/**
 * useForm Hook - Handle form state and validation
 */
export const useForm = (initialValues, onSubmit) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))
  }

  const handleSubmit = async (e, validationSchema) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (validationSchema) {
        const { isValid, errors: validationErrors } = validationSchema(values)
        if (!isValid) {
          setErrors(validationErrors)
          setIsSubmitting(false)
          return
        }
      }

      await onSubmit(values)
      setValues(initialValues)
      setErrors({})
      setTouched({})
    } catch (error) {
      toast.error('Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue: (name, value) =>
      setValues((prev) => ({ ...prev, [name]: value })),
    setFieldError: (name, error) =>
      setErrors((prev) => ({ ...prev, [name]: error })),
  }
}

/**
 * useConfirm Hook - Manage confirmation dialogs
 */
export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({
    title: 'Confirm',
    message: 'Are you sure?',
    isDangerous: false,
  })
  const callbackRef = useRef(null)

  const confirm = (title, message, callback, isDangerous = false) => {
    setConfig({ title, message, isDangerous })
    callbackRef.current = callback
    setIsOpen(true)
  }

  const handleConfirm = () => {
    callbackRef.current?.()
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
  }
}

/**
 * useLocalStorage Hook - Persist state to localStorage
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

export default {
  useFetch,
  usePaginatedData,
  useForm,
  useConfirm,
  useLocalStorage,
}
