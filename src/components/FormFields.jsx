/**
 * Form Input Component with Validation
 * Reusable input field with error display and accessibility features
 */
export const FormInput = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  autoComplete,
  inputRef,
  onBlur,
  maxLength,
  pattern,
  min,
  max,
  step,
}) => {
  const inputId = `input-${label?.toLowerCase().replace(/\s+/g, '-')}-${Math.random()}`

  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        pattern={pattern}
        min={min}
        max={max}
        step={step}
        ref={inputRef}
        className={`w-full px-4 py-2 rounded-lg border transition-all ${
          error
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
            : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'
        } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-red-600 dark:text-red-400 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Form Select Component
 */
export const FormSelect = ({
  label,
  value,
  onChange,
  options = [],
  error,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
}) => {
  const selectId = `select-${label?.toLowerCase().replace(/\s+/g, '-')}-${Math.random()}`

  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-4 py-2 rounded-lg border transition-all ${
          error
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
            : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'
        } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-red-600 dark:text-red-400 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Form Textarea Component
 */
export const FormTextarea = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
}) => {
  const textareaId = `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}-${Math.random()}`

  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={`w-full px-4 py-2 rounded-lg border transition-all resize-none ${
          error
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
            : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'
        } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-red-600 dark:text-red-400 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

export default {
  FormInput,
  FormSelect,
  FormTextarea,
}
