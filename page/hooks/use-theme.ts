'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export interface UseThemeReturn {
  /** The current theme */
  theme: Theme | undefined
  /** The resolved theme (light/dark) */
  resolvedTheme: 'light' | 'dark' | undefined
  /** Set the theme */
  setTheme: (theme: Theme) => void
  /** Toggle between light and dark themes */
  toggleTheme: () => void
  /** Whether the theme is being initialized */
  isLoading: boolean
}

export function useTheme(): UseThemeReturn {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Wait for hydration to complete
    setIsLoading(false)
  }, [])

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return {
    theme: theme as Theme | undefined,
    resolvedTheme: resolvedTheme as 'light' | 'dark' | undefined,
    setTheme: setTheme as (theme: Theme) => void,
    toggleTheme,
    isLoading,
  }
}
