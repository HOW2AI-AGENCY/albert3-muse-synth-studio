import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Z-index для overlay tour (должен быть поверх всего)
// Соответствует --z-maximum из design-tokens.css
const Z_TOUR_OVERLAY = 10000;

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="header"]',
    content: (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Добро пожаловать! 🎵</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Albert3 Muse Synth Studio - платформа для AI-генерации музыки с поддержкой Suno AI и Mureka AI.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Давайте быстро пройдёмся по основным функциям интерфейса.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="mode-selector"]',
    content: (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Simple vs Custom Mode</h3>
        <div className="space-y-2">
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-semibold text-primary">Simple Mode</p>
            <p className="text-xs text-muted-foreground mt-1">
              Быстрая генерация одним промптом. AI автоматически создаст текст песни.
            </p>
          </div>
          <div className="p-2 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-sm font-semibold text-accent-foreground">Custom Mode</p>
            <p className="text-xs text-muted-foreground mt-1">
              Полный контроль: свой текст, стили, параметры генерации.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 <strong>Совет:</strong> Начните с Simple Mode для экспериментов
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="prompt-input"]',
    content: (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Опишите музыку</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Расскажите AI, какую музыку вы хотите создать. Укажите жанр, настроение, инструменты.
        </p>
        <div className="p-2 rounded-lg bg-muted/30">
          <p className="text-xs font-semibold mb-2">Примеры промптов:</p>
          <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
            <li>"Спокойный лоу-фай бит с джазовым пианино и виниловым треском"</li>
            <li>"Энергичная электронная танцевальная музыка с синтезаторами"</li>
            <li>"Меланхоличная акустическая баллада с гитарой и виолончелью"</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          ⚡ Чем детальнее описание, тем точнее результат
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="ai-boost"]',
    content: (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          AI улучшение ✨
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Наш AI проанализирует ваш промпт и автоматически улучшит его для лучшего результата.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p className="text-xs text-muted-foreground">Добавит профессиональные музыкальные термины</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p className="text-xs text-muted-foreground">Порекомендует оптимальные теги стилей</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p className="text-xs text-muted-foreground">Оптимизирует описание для Suno AI</p>
          </div>
        </div>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="generate-button"]',
    content: (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Готово к генерации! 🎉</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Нажмите кнопку "Создать музыку", чтобы запустить AI-генерацию вашего трека.
        </p>
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/30">
          <p className="text-xs font-semibold text-accent-foreground mb-1">Что происходит дальше:</p>
          <ul className="text-xs list-decimal list-inside space-y-1 text-muted-foreground">
            <li>AI анализирует ваш промпт</li>
            <li>Генерирует музыку (~2-3 минуты)</li>
            <li>Создаёт обложку трека</li>
            <li>Трек появится в вашей библиотеке</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          ⏱️ Среднее время генерации: <strong>2-3 минуты</strong>
        </p>
      </div>
    ),
    placement: 'top',
  },
];

export const GeneratorTour = () => {
  const [hasSeenTour, setHasSeenTour] = useLocalStorage('generator-tour-seen', false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Skip auto-start on mobile
    const isMobile = window.innerWidth < 768;
    
    if (!hasSeenTour && !isMobile) {
      // Запуск через 1.5 секунды после маунта (для загрузки DOM)
      const timer = setTimeout(() => setRunTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setHasSeenTour(true);
      setRunTour(false);
    }
  };

  if (!runTour) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      disableScrolling={false}
      spotlightClicks={false}
      disableOverlayClose={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: Z_TOUR_OVERLAY, // Joyride requires numeric value
          arrowColor: 'hsl(var(--popover))',
          backgroundColor: 'hsl(var(--popover))',
          textColor: 'hsl(var(--popover-foreground))',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
        },
        tooltip: {
          borderRadius: 'var(--radius)',
          padding: '0',
          maxWidth: '400px',
          fontSize: '14px',
          backgroundColor: 'hsl(var(--popover))',
          color: 'hsl(var(--popover-foreground))',
          boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.4)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: '1rem 1.25rem',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 'var(--radius)',
          padding: '0.5rem 1.25rem',
          fontSize: '14px',
          fontWeight: '500',
          outline: 'none',
          border: 'none',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: '0.5rem',
          fontSize: '14px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: '14px',
        },
        buttonClose: {
          color: 'hsl(var(--muted-foreground))',
        },
        spotlight: {
          borderRadius: 'var(--radius)',
        },
      }}
      locale={{
        back: 'Назад',
        close: 'Закрыть',
        last: 'Завершить',
        next: 'Далее',
        skip: 'Пропустить',
      }}
    />
  );
};
