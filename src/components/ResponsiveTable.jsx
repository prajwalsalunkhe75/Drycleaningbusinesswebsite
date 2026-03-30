/**
 * Responsive Table Component
 * Accessible, responsive table with dark mode support
 */
export const ResponsiveTable = ({
  columns = [], // [{ key: 'id', label: 'ID', sortable: true }, ...]
  data = [],
  loading = false,
  onSort = null,
  sortBy = null,
  sortOrder = 'asc',
  renderCell = null,
  onRowClick = null,
  selectable = false,
  onSelectRows = null,
  selectedRows = [],
}) => {
  const handleSort = (key) => {
    if (!onSort) return
    if (sortBy === key) {
      onSort(key, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'asc')
    }
  }

  const handleSelectAll = (e) => {
    if (onSelectRows) {
      if (e.target.checked) {
        onSelectRows(data.map((_, i) => i))
      } else {
        onSelectRows([])
      }
    }
  }

  const handleSelectRow = (idx, e) => {
    e.stopPropagation()
    if (onSelectRows) {
      if (selectedRows.includes(idx)) {
        onSelectRows(selectedRows.filter(i => i !== idx))
      } else {
        onSelectRows([...selectedRows, idx])
      }
    }
  }

  if (data.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
            {selectable && (
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedRows.length === data.length && data.length > 0}
                  className="rounded"
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300"
              >
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center space-x-1 hover:text-primary transition"
                    aria-sort={
                      sortBy === col.key
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <span>{col.label}</span>
                    {sortBy === col.key && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick?.(row, rowIdx)}
              className={`border-b border-gray-200 dark:border-slate-700 transition ${
                onRowClick ? 'hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer' : ''
              } ${selectedRows.includes(rowIdx) ? 'bg-blue-50 dark:bg-slate-600' : ''}`}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {selectable && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(rowIdx)}
                    onChange={(e) => handleSelectRow(rowIdx, e)}
                    className="rounded"
                    aria-label={`Select row ${rowIdx + 1}`}
                  />
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={`${rowIdx}-${col.key}`}
                  className="px-4 py-3 text-gray-900 dark:text-gray-100"
                >
                  {renderCell?.(row[col.key], col.key, row) || row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {loading && (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      )}
    </div>
  )
}

/**
 * Mobile Card View (used on small screens instead of table)
 */
export const MobileCardView = ({
  data = [],
  columns = [],
  loading = false,
  renderCard = null,
  onCardClick = null,
}) => {
  if (data.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) =>
        renderCard ? (
          <div
            key={idx}
            onClick={() => onCardClick?.(item, idx)}
            className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 ${
              onCardClick ? 'cursor-pointer hover:shadow-md' : ''
            } transition`}
          >
            {renderCard(item, idx)}
          </div>
        ) : (
          <div
            key={idx}
            className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between mb-2 last:mb-0">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {col.label}:
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {item[col.key]}
                </span>
              </div>
            ))}
          </div>
        )
      )}
      {loading && (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      )}
    </div>
  )
}

export default ResponsiveTable
