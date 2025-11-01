import { memo } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles } from '@/utils/iconImports';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onBoost?: () => void;
  isBoosting?: boolean;
  isGenerating: boolean;
  isRequired?: boolean;
  hasLyrics?: boolean;
  customMode?: boolean;
  placeholder?: string;
  label?: string;
  rows?: number;
  minHeight?: string;
  maxLength?: number;
}

export const PromptInput = memo(({
  value,
  onChange,
  onBoost,
  isBoosting = false,
  isGenerating,
  isRequired = false,
  hasLyrics = false,
  customMode = false,
  placeholder = "Опишите стиль, настроение и жанр...",
  label = "Описание музыки",
  rows = 2,
  minHeight = "60px",
  maxLength,
}: PromptInputProps) => {
  // ✅ Адаптивный плейсхолдер в зависимости от режима
  const effectivePlaceholder = customMode
    ? "Опишите стиль, жанр, настроение (если есть текст, он будет петься)"
    : placeholder || "Опишите желаемый стиль музыки (жанр, настроение, инструменты)";
  return (
    <div className="space-y-1">
      <Label htmlFor="prompt" className="text-xs font-medium">
        {label}
        {isRequired && !value.trim() && !hasLyrics && (
          <span className="text-destructive ml-0.5">*</span>
        )}
      </Label>
      <div className="relative">
        <Textarea
          id="prompt"
          placeholder={effectivePlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.classList.add('focus:min-h-[90px]')}
          onBlur={(e) => e.target.classList.remove('focus:min-h-[90px]')}
          className={`min-h-[${minHeight}] sm:min-h-[70px] text-sm resize-none transition-all duration-200 ${onBoost ? 'pr-10' : ''}`}
          disabled={isGenerating}
          rows={rows}
          maxLength={maxLength}
          aria-label="Промпт для генерации музыки"
        />
        {onBoost && value.trim() && (
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
              onClick={onBoost}
              disabled={isBoosting || isGenerating}
              title="Улучшить промпт с помощью AI"
            >
              {isBoosting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </motion.div>
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
});

PromptInput.displayName = 'PromptInput';
