import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="header"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-semibold text-base">Добро пожаловать! 🎵</h3>
        <p className="text-sm">Albert3 Muse Synth Studio - платформа для AI-генерации музыки.</p>
        <p className="text-sm">Давайте быстро пройдёмся по основным функциям.</p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="mode-selector"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-semibold text-base">Simple vs Custom Mode</h3>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li><strong>Simple:</strong> Быстрая генерация (1 prompt)</li>
          <li><strong>Custom:</strong> Полный контроль (текст, стиль, параметры)</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">💡 Начните с Simple Mode</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="prompt-input"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-semibold text-base">Опишите музыку</h3>
        <p className="text-sm">Расскажите, какую музыку хотите создать:</p>
        <ul className="text-xs list-disc list-inside space-y-0.5 mt-2">
          <li>"Спокойный лоу-фай бит с джазовым пианино"</li>
          <li>"Энергичная электронная танцевальная музыка"</li>
          <li>"Меланхоличная акустическая баллада"</li>
        </ul>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="ai-boost"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-semibold text-base">AI улучшение ✨</h3>
        <p className="text-sm">Наш AI улучшит ваш промпт, добавив:</p>
        <ul className="text-xs list-disc list-inside space-y-0.5 mt-1">
          <li>Музыкальные термины</li>
          <li>Рекомендованные теги стилей</li>
          <li>Оптимизацию для Suno AI</li>
        </ul>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="generate-button"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-semibold text-base">Готово к генерации! 🎉</h3>
        <p className="text-sm">Нажмите кнопку, чтобы создать трек.</p>
        <p className="text-xs text-muted-foreground mt-2">
          ⏱️ Генерация занимает ~2-3 минуты
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
    if (!hasSeenTour) {
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
          zIndex: 10000,
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
