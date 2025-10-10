import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MusicGenerator } from '../MusicGenerator';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mocks
vi.mock('@/stores/useMusicGenerationStore', () => ({
  useMusicGenerationStore: () => ({
    generateMusic: vi.fn(),
    isGenerating: false,
  }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ vibrate: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

describe('MusicGenerator smoke test', () => {
  it('renders core UI elements of the redesigned form', () => {
    render(<TestWrapper><MusicGenerator /></TestWrapper>);

    // Check for the mode switcher
    expect(screen.getByRole('tab', { name: 'Простой' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Продвинутый' })).toBeInTheDocument();

    // Check for the main prompt textarea in simple mode
    expect(screen.getByPlaceholderText(/Например, энергичный рок/i)).toBeInTheDocument();

    // Check for the main generation button
    expect(screen.getByRole('button', { name: /Создать/i })).toBeInTheDocument();
  });
});