import { useState, useEffect } from 'react'

const STORAGE_KEY = 'dark-mode'

export default function useDarkMode() {
  // State: 'light' | 'dark' | 'system'
  const [darkMode, setDarkModeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
    return 'system' // Default to system preference
  })

  // Computed: actual dark mode active state after system resolution
  const [isDark, setIsDark] = useState(false)

  // Apply/remove dark class on html element
  useEffect(() => {
    const root = document.documentElement

    const applyDarkMode = () => {
      let shouldBeDark = false

      if (darkMode === 'dark') {
        shouldBeDark = true
      } else if (darkMode === 'light') {
        shouldBeDark = false
      } else {
        // system: check OS preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        shouldBeDark = prefersDark
      }

      setIsDark(shouldBeDark)

      if (shouldBeDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyDarkMode()

    // Listen for system preference changes if in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (e) => {
      if (darkMode === 'system') {
        applyDarkMode()
      }
    }

    // Modern browsers use addEventListener
    mediaQuery.addEventListener('change', handleSystemChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
    }
  }, [darkMode])

  // Setter that also persists to localStorage
  const setDarkMode = (value) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') {
      console.warn('Invalid darkMode value. Use "light", "dark", or "system".')
      return
    }
    localStorage.setItem(STORAGE_KEY, value)
    setDarkModeState(value)
  }

  // Toggle between light and dark (ignores system)
  const toggleLightDark = () => {
    setDarkMode(darkMode === 'dark' ? 'light' : 'dark')
  }

  return {
    darkMode,
    setDarkMode,
    isDark,
    toggle: toggleLightDark
  }
}
