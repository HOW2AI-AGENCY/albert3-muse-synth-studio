/**
 * Guided Wizard Component
 * Phase 1.2: UX Improvements - Пошаговая генерация для новичков
 */

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  Mic, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle 
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface WizardStep {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface GenrePreset {
  id: string;
  name: string;
  tags: string[];
  prompt: string;
  icon: string;
}

interface GuidedWizardProps {
  onComplete: (params: WizardResult) => void;
  onCancel: () => void;
}

export interface WizardResult {
  genre: string;
  prompt: string;
  hasVocals: boolean;
  tags: string[];
}

const GENRE_PRESETS: GenrePreset[] = [
  { 
    id: 'pop', 
    name: 'Pop', 
    tags: ['pop', 'catchy', 'upbeat'],
    prompt: 'энергичная поп-музыка с запоминающейся мелодией',
    icon: '🎵'
  },
  { 
    id: 'rock', 
    name: 'Rock', 
    tags: ['rock', 'electric guitar', 'energetic'],
    prompt: 'драйвовый рок с мощными гитарами',
    icon: '🎸'
  },
  { 
    id: 'electronic', 
    name: 'Electronic', 
    tags: ['electronic', 'synth', 'dance'],
    prompt: 'электронная музыка с синтезаторами и битами',
    icon: '🎹'
  },
  { 
    id: 'jazz', 
    name: 'Jazz', 
    tags: ['jazz', 'smooth', 'saxophone'],
    prompt: 'плавный джаз с саксофоном',
    icon: '🎷'
  },
  { 
    id: 'classical', 
    name: 'Classical', 
    tags: ['classical', 'orchestral', 'elegant'],
    prompt: 'классическая оркестровая музыка',
    icon: '🎻'
  },
  { 
    id: 'ambient', 
    name: 'Ambient', 
    tags: ['ambient', 'atmospheric', 'calm'],
    prompt: 'атмосферная эмбиент музыка для релаксации',
    icon: '🌌'
  },
];

const STEPS: WizardStep[] = [
  { 
    step: 1, 
    title: 'Выберите стиль', 
    description: 'Какой жанр музыки вы хотите создать?',
    icon: <Music className="w-6 h-6" />
  },
  { 
    step: 2, 
    title: 'Опишите идею', 
    description: 'Расскажите, какую музыку хотите услышать',
    icon: <Sparkles className="w-6 h-6" />
  },
  { 
    step: 3, 
    title: 'Вокал', 
    description: 'Нужен ли вокал в вашем треке?',
    icon: <Mic className="w-6 h-6" />
  },
  { 
    step: 4, 
    title: 'Готово!', 
    description: 'Проверьте параметры и начните генерацию',
    icon: <CheckCircle className="w-6 h-6" />
  },
];

export const GuidedWizard = memo(({ onComplete, onCancel }: GuidedWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState<GenrePreset | null>(null);
  const [prompt, setPrompt] = useState('');
  const [hasVocals, setHasVocals] = useState<boolean | null>(null);

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleGenreSelect = useCallback((genre: GenrePreset) => {
    setSelectedGenre(genre);
    setPrompt(genre.prompt);
    handleNext();
  }, [handleNext]);

  const handleComplete = useCallback(() => {
    if (!selectedGenre || hasVocals === null) return;

    onComplete({
      genre: selectedGenre.name,
      prompt: prompt || selectedGenre.prompt,
      hasVocals,
      tags: selectedGenre.tags,
    });
  }, [selectedGenre, prompt, hasVocals, onComplete]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedGenre !== null;
      case 2: return prompt.trim().length > 0;
      case 3: return hasVocals !== null;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Шаг {currentStep} из {STEPS.length}
          </span>
          <span className="font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div 
            key={step.step}
            className={cn(
              'flex flex-col items-center gap-2 flex-1',
              index < currentStep - 1 && 'text-primary',
              index === currentStep - 1 && 'text-foreground',
              index > currentStep - 1 && 'text-muted-foreground/50'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
              index < currentStep - 1 && 'bg-primary border-primary',
              index === currentStep - 1 && 'border-primary bg-primary/10',
              index > currentStep - 1 && 'border-muted'
            )}>
              {step.icon}
            </div>
            <span className="text-xs font-medium hidden md:block">{step.title}</span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {STEPS[currentStep - 1].icon}
                {STEPS[currentStep - 1].title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {STEPS[currentStep - 1].description}
              </p>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {/* Step 1: Genre Selection */}
              {currentStep === 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {GENRE_PRESETS.map((genre) => (
                    <Button
                      key={genre.id}
                      variant={selectedGenre?.id === genre.id ? 'default' : 'outline'}
                      className="h-auto py-6 flex flex-col gap-2 hover:scale-105 transition-transform"
                      onClick={() => handleGenreSelect(genre)}
                    >
                      <span className="text-3xl">{genre.icon}</span>
                      <span className="font-semibold">{genre.name}</span>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {genre.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Button>
                  ))}
                </div>
              )}

              {/* Step 2: Prompt Input */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Например: энергичная электронная музыка для тренировки с мощным басом"
                    className="min-h-[200px] resize-none"
                  />
                  <div className="text-sm text-muted-foreground">
                    <p>💡 Совет: Опишите настроение, темп, инструменты</p>
                  </div>
                </div>
              )}

              {/* Step 3: Vocal Options */}
              {currentStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={hasVocals === false ? 'default' : 'outline'}
                    className="h-auto py-8 flex flex-col gap-4 hover:scale-105 transition-transform"
                    onClick={() => {
                      setHasVocals(false);
                      handleNext();
                    }}
                  >
                    <Music className="w-12 h-12" />
                    <div className="text-center">
                      <p className="font-semibold text-lg">Только музыка</p>
                      <p className="text-sm text-muted-foreground">Инструментальный трек</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant={hasVocals === true ? 'default' : 'outline'}
                    className="h-auto py-8 flex flex-col gap-4 hover:scale-105 transition-transform"
                    onClick={() => {
                      setHasVocals(true);
                      handleNext();
                    }}
                  >
                    <Mic className="w-12 h-12" />
                    <div className="text-center">
                      <p className="font-semibold text-lg">С вокалом</p>
                      <p className="text-sm text-muted-foreground">AI создаст текст и мелодию</p>
                    </div>
                  </Button>
                </div>
              )}

              {/* Step 4: Summary */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Стиль</p>
                      <p className="font-semibold flex items-center gap-2">
                        <span>{selectedGenre?.icon}</span>
                        {selectedGenre?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Описание</p>
                      <p className="font-medium">{prompt}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Вокал</p>
                      <p className="font-semibold">
                        {hasVocals ? '🎤 С вокалом' : '🎵 Инструментал'}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg gap-2"
                    onClick={handleComplete}
                  >
                    <Sparkles className="w-5 h-5" />
                    Создать трек
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={currentStep === 1 ? onCancel : handleBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStep === 1 ? 'Отмена' : 'Назад'}
        </Button>

        {currentStep < STEPS.length && currentStep !== 3 && (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            Далее
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

GuidedWizard.displayName = 'GuidedWizard';
