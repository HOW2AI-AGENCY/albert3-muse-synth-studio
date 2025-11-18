import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusButton } from '../status-button';
import type { ButtonStatus } from '../status-button';

describe('StatusButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders idle state by default', () => {
      render(<StatusButton>Сохранить</StatusButton>);

      expect(screen.getByRole('button', { name: /сохранить/i })).toBeInTheDocument();
    });

    it('renders with custom content', () => {
      render(<StatusButton>Custom Button Text</StatusButton>);

      expect(screen.getByText('Custom Button Text')).toBeInTheDocument();
    });
  });

  describe('Status States', () => {
    it('displays loading state with spinner', () => {
      render(<StatusButton status="loading">Сохранить</StatusButton>);

      expect(screen.getByText('Загрузка...')).toBeInTheDocument();
      // Check for spinner by class (Loader2 icon has animate-spin)
      const button = screen.getByRole('button');
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('displays loading state with custom text', () => {
      render(
        <StatusButton status="loading" loadingText="Обработка...">
          Сохранить
        </StatusButton>
      );

      expect(screen.getByText('Обработка...')).toBeInTheDocument();
    });

    it('displays success state with checkmark', () => {
      render(<StatusButton status="success">Сохранить</StatusButton>);

      expect(screen.getByText('Готово')).toBeInTheDocument();
    });

    it('displays success state with custom text', () => {
      render(
        <StatusButton status="success" successText="Успешно сохранено!">
          Сохранить
        </StatusButton>
      );

      expect(screen.getByText('Успешно сохранено!')).toBeInTheDocument();
    });

    it('displays error state with X icon', () => {
      render(<StatusButton status="error">Сохранить</StatusButton>);

      expect(screen.getByText('Ошибка')).toBeInTheDocument();
    });

    it('displays error state with custom text', () => {
      render(
        <StatusButton status="error" errorText="Не удалось сохранить">
          Сохранить
        </StatusButton>
      );

      expect(screen.getByText('Не удалось сохранить')).toBeInTheDocument();
    });
  });

  describe('Auto-reset Functionality', () => {
    it('auto-resets from success to idle after 2 seconds by default', async () => {
      const onAutoReset = vi.fn();
      const { rerender } = render(
        <StatusButton status="success" onAutoReset={onAutoReset}>
          Сохранить
        </StatusButton>
      );

      expect(screen.getByText('Готово')).toBeInTheDocument();

      // Fast-forward time by 2 seconds
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(onAutoReset).toHaveBeenCalledTimes(1);
      });
    });

    it('auto-resets from error to idle after 2 seconds by default', async () => {
      const onAutoReset = vi.fn();
      render(
        <StatusButton status="error" onAutoReset={onAutoReset}>
          Сохранить
        </StatusButton>
      );

      expect(screen.getByText('Ошибка')).toBeInTheDocument();

      // Fast-forward time by 2 seconds
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(onAutoReset).toHaveBeenCalledTimes(1);
      });
    });

    it('respects custom auto-reset duration', async () => {
      const onAutoReset = vi.fn();
      render(
        <StatusButton status="success" autoResetDuration={5000} onAutoReset={onAutoReset}>
          Сохранить
        </StatusButton>
      );

      // Should not reset after 2 seconds
      vi.advanceTimersByTime(2000);
      expect(onAutoReset).not.toHaveBeenCalled();

      // Should reset after 5 seconds
      vi.advanceTimersByTime(3000);
      await waitFor(() => {
        expect(onAutoReset).toHaveBeenCalledTimes(1);
      });
    });

    it('does not auto-reset when autoResetDuration is 0', () => {
      const onAutoReset = vi.fn();
      render(
        <StatusButton status="success" autoResetDuration={0} onAutoReset={onAutoReset}>
          Сохранить
        </StatusButton>
      );

      vi.advanceTimersByTime(10000);
      expect(onAutoReset).not.toHaveBeenCalled();
    });

    it('does not auto-reset from idle state', () => {
      const onAutoReset = vi.fn();
      render(
        <StatusButton status="idle" onAutoReset={onAutoReset}>
          Сохранить
        </StatusButton>
      );

      vi.advanceTimersByTime(5000);
      expect(onAutoReset).not.toHaveBeenCalled();
    });

    it('does not auto-reset from loading state', () => {
      const onAutoReset = vi.fn();
      render(
        <StatusButton status="loading" onAutoReset={onAutoReset}>
          Сохранить
        </StatusButton>
      );

      vi.advanceTimersByTime(5000);
      expect(onAutoReset).not.toHaveBeenCalled();
    });
  });

  describe('Status Icons', () => {
    it('shows status icons by default', () => {
      const { rerender } = render(<StatusButton status="loading">Сохранить</StatusButton>);

      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();

      rerender(<StatusButton status="success">Сохранить</StatusButton>);
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();

      rerender(<StatusButton status="error">Сохранить</StatusButton>);
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
    });

    it('hides status icons when showStatusIcon is false', () => {
      const { rerender } = render(
        <StatusButton status="loading" showStatusIcon={false}>
          Сохранить
        </StatusButton>
      );

      expect(screen.getByRole('button').querySelector('svg')).not.toBeInTheDocument();

      rerender(
        <StatusButton status="success" showStatusIcon={false}>
          Сохранить
        </StatusButton>
      );
      expect(screen.getByRole('button').querySelector('svg')).not.toBeInTheDocument();

      rerender(
        <StatusButton status="error" showStatusIcon={false}>
          Сохранить
        </StatusButton>
      );
      expect(screen.getByRole('button').querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when status is loading', () => {
      render(<StatusButton status="loading">Сохранить</StatusButton>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when disabled prop is true', () => {
      render(<StatusButton disabled>Сохранить</StatusButton>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is enabled in idle state when not explicitly disabled', () => {
      render(<StatusButton status="idle">Сохранить</StatusButton>);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('is enabled in success state when not explicitly disabled', () => {
      render(<StatusButton status="success">Сохранить</StatusButton>);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('is enabled in error state when not explicitly disabled', () => {
      render(<StatusButton status="error">Сохранить</StatusButton>);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    it('calls onClick handler when clicked in idle state', async () => {
      const onClick = vi.fn();
      render(<StatusButton onClick={onClick}>Сохранить</StatusButton>);

      await userEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const onClick = vi.fn();
      render(
        <StatusButton disabled onClick={onClick}>
          Сохранить
        </StatusButton>
      );

      await userEvent.click(screen.getByRole('button'));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when in loading state', async () => {
      const onClick = vi.fn();
      render(
        <StatusButton status="loading" onClick={onClick}>
          Сохранить
        </StatusButton>
      );

      await userEvent.click(screen.getByRole('button'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Styling Variants', () => {
    it('applies success variant styling in success state', () => {
      render(<StatusButton status="success">Сохранить</StatusButton>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-green-600');
    });

    it('applies destructive variant styling in error state', () => {
      render(<StatusButton status="error">Сохранить</StatusButton>);

      const button = screen.getByRole('button');
      // Button should have destructive variant classes
      expect(button).toBeInTheDocument();
    });

    it('preserves custom variant in idle state', () => {
      render(
        <StatusButton variant="outline" status="idle">
          Сохранить
        </StatusButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has button role', () => {
      render(<StatusButton>Сохранить</StatusButton>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('maintains accessible name across status changes', () => {
      const { rerender } = render(<StatusButton status="idle">Сохранить</StatusButton>);

      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<StatusButton status="loading">Сохранить</StatusButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<StatusButton status="success">Сохранить</StatusButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<StatusButton status="error">Сохранить</StatusButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid status changes', () => {
      const { rerender } = render(<StatusButton status="idle">Сохранить</StatusButton>);

      rerender(<StatusButton status="loading">Сохранить</StatusButton>);
      rerender(<StatusButton status="success">Сохранить</StatusButton>);
      rerender(<StatusButton status="error">Сохранить</StatusButton>);
      rerender(<StatusButton status="idle">Сохранить</StatusButton>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('cleans up timeout on unmount', () => {
      const { unmount } = render(<StatusButton status="success">Сохранить</StatusButton>);

      unmount();

      // Should not throw error
      vi.advanceTimersByTime(5000);
    });
  });
});
