"use client"

import { useEffect, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
}

export function AnimatedNumber({ value, duration = 1000, className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  useEffect(() => {
    if (value !== prevValue) {
      const startTime = Date.now()
      const startValue = displayValue
      const endValue = value
      const difference = endValue - startValue

      const animate = () => {
        const currentTime = Date.now()
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Use easeOut animation
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const newValue = Math.round(startValue + (difference * easeOut))
        
        setDisplayValue(newValue)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      requestAnimationFrame(animate)
      setPrevValue(value)
    }
  }, [value, prevValue, displayValue, duration])

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  )
}