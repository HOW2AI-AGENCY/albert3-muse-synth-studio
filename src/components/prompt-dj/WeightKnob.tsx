import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WeightKnobProps {
  value: number; // 0-1
  audioLevel: number; // 0-1 (для гало)
  onChange: (value: number) => void;
  isActive: boolean;
}

export const WeightKnob = memo(({ value, audioLevel, onChange, isActive }: WeightKnobProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    e.preventDefault();
  }, [value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaY = startYRef.current - e.clientY;
    const sensitivity = 0.005;
    const newValue = Math.max(0, Math.min(1, startValueRef.current + deltaY * sensitivity));
    
    onChange(newValue);
  }, [isDragging, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="relative w-16 h-16 touch-optimized" ref={knobRef}>
      {/* Пульсирующее гало */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          boxShadow: 'var(--shadow-glow-primary)',
        }}
        animate={{
          scale: 1 + audioLevel * 0.3,
          opacity: audioLevel * 0.6,
        }}
        transition={{ duration: 0.1 }}
      />
      
      {/* Ручка */}
      <motion.div
        className={cn(
          "relative w-full h-full rounded-full border-4 cursor-ns-resize transition-all",
          "bg-gradient-to-br from-surface to-surface-variant",
          isActive 
            ? "border-primary shadow-lg" 
            : "border-border hover:border-accent",
          isDragging && "scale-95"
        )}
        style={{
          boxShadow: isActive ? 'var(--shadow-glow-primary)' : 'none',
        }}
        onMouseDown={handleMouseDown}
        whileHover={{ scale: 1.05 }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-label="Вес промпта"
      >
        {/* Индикатор уровня с градиентом */}
        <div 
          className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all"
          style={{ 
            height: `${value * 100}%`,
            background: 'var(--gradient-primary)',
            opacity: isActive ? 0.8 : 0.3,
          }}
        />
        
        {/* Значение */}
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
          {Math.round(value * 100)}%
        </div>
      </motion.div>
    </div>
  );
});

WeightKnob.displayName = 'WeightKnob';
