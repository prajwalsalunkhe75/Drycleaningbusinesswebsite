/**
 * Pagination Utility - Handle pagination logic
 */

export const createPaginationHelper = (items, itemsPerPage = 10) => {
  const totalPages = Math.ceil(items.length / itemsPerPage)

  return {
    totalPages,
    totalItems: items.length,
    itemsPerPage,

    getPage: (pageNumber) => {
      if (pageNumber < 1 || pageNumber > totalPages) return []
      const start = (pageNumber - 1) * itemsPerPage
      const end = start + itemsPerPage
      return items.slice(start, end)
    },

    getPageInfo: (pageNumber) => {
      const start = (pageNumber - 1) * itemsPerPage + 1
      const end = Math.min(pageNumber * itemsPerPage, items.length)
      return { start, end, total: items.length }
    },
  }
}

/**
 * Hook-compatible pagination state management
 */
export const usePagination = (initialPage = 1, itemsPerPage = 10) => {
  return {
    currentPage: initialPage,
    itemsPerPage,
    goToPage: (page) => page,
    nextPage: (current) => current + 1,
    prevPage: (current) => (current > 1 ? current - 1 : 1),
  }
}
