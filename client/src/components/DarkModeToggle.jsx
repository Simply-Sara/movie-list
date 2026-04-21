import { useDarkModeContext } from '../contexts/DarkModeContext'

export default function DarkModeToggle({ size = 'md' }) {
  const { darkMode, toggle } = useDarkModeContext()

  // Determine current icon based on mode
  // If mode is 'system', we need to check actual isDark via the context's computed state
  const isActuallyDark = darkMode === 'dark' || (darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const icon = isActuallyDark ? '🌙' : '☀️'

  // Size classes
  const sizeClasses = size === 'sm' ? 'p-2 text-lg' : 'p-2 text-xl'

  // Base styles for both light and dark modes (using muted colors)
  const baseClasses = `rounded-full transition-colors ${sizeClasses}
    bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
    focus:outline-none focus:ring-2 focus:ring-indigo-500`

  return (
    <button
      type="button"
      onClick={toggle}
      className={baseClasses}
      title={darkMode === 'system' ? 'Theme: System (auto)' : `Theme: ${darkMode === 'dark' ? 'Dark' : 'Light'} (click to toggle)`}
      aria-label="Toggle dark mode"
    >
      {icon}
    </button>
  )
}
