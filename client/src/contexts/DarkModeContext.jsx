import { createContext, useContext } from 'react'
import useDarkMode from '../hooks/useDarkMode'

const DarkModeContext = createContext(null)

export function DarkModeProvider({ children }) {
  const darkMode = useDarkMode()
  return (
    <DarkModeContext.Provider value={darkMode}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkModeContext = () => {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error('useDarkModeContext must be used within a DarkModeProvider')
  }
  return context
}
