import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { MusicGenerator } from '../MusicGenerator';

vi.mock('@/hooks/useMusicGeneration', () => ({
  useMusicGeneration: () => ({
    generateMusic: vi.fn(),
    improvePrompt: vi.fn(),
    isGenerating: false,
    isImproving: false,
  }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ vibrate: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useProviderBalance', () => ({
  useProviderBalance: () => ({
    balance: { balance: 3, currency: 'credits', provider: 'suno' },
    isLoading: false,
    error: null,
  }),
}));

describe('MusicGenerator smoke test', () => {
  it('renders core UI elements of redesigned form', () => {
    render(<MusicGenerator />);

    expect(screen.getByText('Заголовок (опционально)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Опишите желаемую музыку, настроение и ключевые инструменты')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Рандом' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить лирику' })).toBeInTheDocument();
  });
});
