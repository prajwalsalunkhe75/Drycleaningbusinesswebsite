/**
 * Dark Mode Utility - Theme management
 */

export const initDarkMode = () => {
  const saved = localStorage.getItem('darkMode')
  if (saved !== null) {
    return JSON.parse(saved)
  }
  // Check system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const setDarkMode = (isDark) => {
  localStorage.setItem('darkMode', JSON.stringify(isDark))
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const toggleDarkMode = () => {
  const current = JSON.parse(localStorage.getItem('darkMode') || 'false')
  setDarkMode(!current)
  return !current
}

export const getDarkMode = () => {
  const saved = localStorage.getItem('darkMode')
  if (saved !== null) {
    return JSON.parse(saved)
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
