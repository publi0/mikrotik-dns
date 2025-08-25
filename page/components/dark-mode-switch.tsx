'use client'

import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

interface DarkModeSwitchProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showText?: boolean
  className?: string
}

export function DarkModeSwitch({
  variant = 'outline',
  size = 'icon',
  showText = false,
  className = ''
}: DarkModeSwitchProps) {
  const { theme, resolvedTheme, setTheme, isLoading } = useTheme()

  const handleToggle = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  if (isLoading) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={className}
      >
        <Sun className="h-4 w-4" />
        {showText && <span className="ml-2">Carregando...</span>}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={`transition-colors ${className}`}
      title={resolvedTheme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      {showText && (
        <span className="ml-2">
          {resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      )}
      <span className="sr-only">
        {resolvedTheme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
      </span>
    </Button>
  )
}

// Variação com texto sempre visível
export function DarkModeSwitchWithText({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme, isLoading } = useTheme()

  const handleToggle = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Sun className="h-4 w-4 mr-2" />
        Carregando...
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={handleToggle}
      className={`transition-colors ${className}`}
    >
      {resolvedTheme === 'dark' ? (
        <>
          <Sun className="h-4 w-4 mr-2" />
          Modo Claro
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 mr-2" />
          Modo Escuro
        </>
      )}
    </Button>
  )
}

// Variação compacta apenas com ícone
export function CompactDarkModeSwitch({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme, isLoading } = useTheme()

  const handleToggle = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  if (isLoading) {
    return (
      <button
        disabled
        className={`p-2 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors ${className}`}
      >
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors ${className}`}
      title={resolvedTheme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}

// Switch estilo toggle
export function DarkModeToggleSwitch({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme, isLoading } = useTheme()

  const handleToggle = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Sun className="h-4 w-4 text-muted-foreground" />
        <div className="w-11 h-6 bg-muted rounded-full opacity-50" />
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Sun className={`h-4 w-4 transition-colors ${
        resolvedTheme === 'light' ? 'text-primary' : 'text-muted-foreground'
      }`} />
      <button
        onClick={handleToggle}
        className="relative w-11 h-6 bg-muted rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        role="switch"
        aria-checked={resolvedTheme === 'dark'}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-background rounded-full shadow-md transform transition-transform ${
            resolvedTheme === 'dark' ? 'translate-x-5 bg-primary' : 'translate-x-0'
          }`}
        />
      </button>
      <Moon className={`h-4 w-4 transition-colors ${
        resolvedTheme === 'dark' ? 'text-primary' : 'text-muted-foreground'
      }`} />
    </div>
  )
}
