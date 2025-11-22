import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  minStepsBetweenThumbs?: number
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ 
    className, 
    value = [0], 
    onValueChange, 
    min = 0, 
    max = 100, 
    step = 1, 
    minStepsBetweenThumbs = 0,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value)
    const trackRef = React.useRef<HTMLDivElement>(null)
    
    const currentValue = value !== undefined ? value : internalValue
    
    const handleInputChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(event.target.value)
      const newValues = [...currentValue]
      newValues[index] = newValue
      
      if (onValueChange) {
        onValueChange(newValues)
      } else {
        setInternalValue(newValues)
      }
    }

    const percentage = ((currentValue[0] - min) / (max - min)) * 100

    return (
      <div ref={ref} className={cn('relative flex w-full touch-none select-none items-center', className)}>
        <div 
          ref={trackRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
        >
          <div 
            className="absolute h-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue[0]}
          onChange={handleInputChange(0)}
          className="absolute w-full h-2 bg-transparent opacity-0 cursor-pointer"
          {...props}
        />
        <div 
          className="absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
