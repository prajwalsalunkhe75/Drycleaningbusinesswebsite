import { Inbox, AlertCircle } from 'lucide-react'

/**
 * Empty State Component
 * Displayed when there's no data
 */
export const EmptyState = ({
  title = 'No items found',
  description = 'There are no items to display',
  icon: Icon = Inbox,
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Error State Component
 * Displayed when there's an error
 */
export const ErrorState = ({
  title = 'Something went wrong',
  description = 'An error occurred while loading data',
  onRetry = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * Loading Skeleton Component
 * Shows placeholder while data is loading
 */
export const SkeletonLoader = ({ count = 5, variant = 'table' }) => {
  if (variant === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse">
            <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  // Table variant
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse"
        ></div>
      ))}
    </div>
  )
}

export default {
  EmptyState,
  ErrorState,
  SkeletonLoader,
}
