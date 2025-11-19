import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BalanceDisplay } from '../BalanceDisplay';

// Mock useProviderBalance hook
const mockRefetch = vi.fn();
const mockUseProviderBalance = vi.fn();

vi.mock('@/hooks/useProviderBalance', () => ({
  useProviderBalance: () => mockUseProviderBalance(),
}));

describe('BalanceDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('renders loading state with spinner', () => {
      render(<BalanceDisplay />);

      expect(screen.getByText('Загрузка...')).toBeInTheDocument();
    });

    it('shows spinner icon in loading state', () => {
      const { container } = render(<BalanceDisplay />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides text in minimal variant during loading', () => {
      render(<BalanceDisplay variant="minimal" />);

      expect(screen.queryByText('Загрузка...')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: null,
        isLoading: false,
        error: 'Network error',
        refetch: mockRefetch,
      });
    });

    it('renders error state with message', () => {
      render(<BalanceDisplay />);

      expect(screen.getByText('Ошибка')).toBeInTheDocument();
    });

    it('shows full error message in full variant', () => {
      render(<BalanceDisplay variant="full" />);

      expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
    });

    it('shows retry button by default', () => {
      const { container } = render(<BalanceDisplay />);

      const retryButton = container.querySelector('button[title="Повторить загрузку"]');
      expect(retryButton).toBeInTheDocument();
    });

    it('hides retry button when showRetry is false', () => {
      const { container } = render(<BalanceDisplay showRetry={false} />);

      const retryButton = container.querySelector('button[title="Повторить загрузку"]');
      expect(retryButton).not.toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const { container } = render(<BalanceDisplay />);

      const retryButton = container.querySelector(
        'button[title="Повторить загрузку"]'
      ) as HTMLButtonElement;

      await userEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('displays error icon', () => {
      const { container } = render(<BalanceDisplay />);

      // AlertCircle icon should be present
      const badge = screen.getByText('Ошибка').closest('span');
      expect(badge?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 50.75, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('renders balance value', () => {
      render(<BalanceDisplay />);

      expect(screen.getByText('50.75')).toBeInTheDocument();
    });

    it('shows Coins icon', () => {
      const { container } = render(<BalanceDisplay />);

      const badge = screen.getByText('50.75').closest('span');
      expect(badge?.querySelector('svg')).toBeInTheDocument();
    });

    it('formats balance with 2 decimal places in compact variant', () => {
      render(<BalanceDisplay variant="compact" />);

      expect(screen.getByText('50.75')).toBeInTheDocument();
    });

    it('shows "кредитов" text in full variant', () => {
      render(<BalanceDisplay variant="full" />);

      expect(screen.getByText(/50\.75 кредитов/)).toBeInTheDocument();
    });

    it('uses compact format in minimal variant', () => {
      render(<BalanceDisplay variant="minimal" />);

      // Value should be formatted as integer in minimal mode
      expect(screen.queryByText('50.75')).not.toBeInTheDocument();
      expect(screen.queryByText('51')).toBeInTheDocument();
    });
  });

  describe('Low Balance Warning', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 5.0, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('shows low balance styling when balance < 10', () => {
      const { container } = render(<BalanceDisplay />);

      const badge = screen.getByText('5.00').closest('span');
      expect(badge?.className).toContain('text-orange');
    });

    it('uses outline variant for low balance', () => {
      render(<BalanceDisplay />);

      const badge = screen.getByText('5.00').closest('span');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Zero Balance', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 0, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('renders zero balance', () => {
      render(<BalanceDisplay />);

      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('uses destructive variant for zero balance', () => {
      render(<BalanceDisplay />);

      const badge = screen.getByText('0.00').closest('span');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Large Balance Formatting', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 1500, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('formats large balance in minimal variant with K suffix', () => {
      render(<BalanceDisplay variant="minimal" />);

      expect(screen.getByText('1.5K')).toBeInTheDocument();
    });

    it('shows full value in compact variant', () => {
      render(<BalanceDisplay variant="compact" />);

      expect(screen.getByText('1500.00')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 50, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('renders small size', () => {
      const { container } = render(<BalanceDisplay size="sm" />);

      const badge = container.querySelector('[class*="text-\\[10px\\]"]');
      expect(badge).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      const { container } = render(<BalanceDisplay size="md" />);

      const badge = container.querySelector('[class*="text-xs"]');
      expect(badge).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<BalanceDisplay size="lg" />);

      const badge = container.querySelector('[class*="text-sm"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 50, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('calls onClick handler when clicked', async () => {
      const onClick = vi.fn();
      render(<BalanceDisplay onClick={onClick} />);

      const badge = screen.getByText('50.00');
      await userEvent.click(badge);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows pointer cursor when onClick is provided', () => {
      const onClick = vi.fn();
      const { container } = render(<BalanceDisplay onClick={onClick} />);

      const badge = container.querySelector('[class*="cursor-pointer"]');
      expect(badge).toBeInTheDocument();
    });

    it('shows help cursor when onClick is not provided', () => {
      const { container } = render(<BalanceDisplay />);

      const badge = container.querySelector('[class*="cursor-help"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 50, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('provides tooltip with balance information', async () => {
      render(<BalanceDisplay />);

      const badge = screen.getByText('50.00');
      await userEvent.hover(badge);

      await waitFor(() => {
        expect(screen.getByText(/Баланс: 50\.00 кредитов/)).toBeInTheDocument();
      });
    });

    it('provides tooltip with error details in error state', async () => {
      mockUseProviderBalance.mockReturnValue({
        balance: null,
        isLoading: false,
        error: 'Network timeout',
        refetch: mockRefetch,
      });

      render(<BalanceDisplay />);

      const badge = screen.getByText('Ошибка');
      await userEvent.hover(badge);

      await waitFor(() => {
        expect(screen.getByText('Не удалось загрузить баланс')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Styling', () => {
    beforeEach(() => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 50, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('applies custom className', () => {
      const { container } = render(<BalanceDisplay className="custom-balance" />);

      expect(container.querySelector('.custom-balance')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null balance gracefully', () => {
      mockUseProviderBalance.mockReturnValue({
        balance: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<BalanceDisplay />);

      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('handles undefined balance object', () => {
      mockUseProviderBalance.mockReturnValue({
        balance: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<BalanceDisplay />);

      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('handles very large balance values', () => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: 999999.99, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<BalanceDisplay />);

      expect(screen.getByText('999999.99')).toBeInTheDocument();
    });

    it('handles negative balance values', () => {
      mockUseProviderBalance.mockReturnValue({
        balance: { balance: -10, lastUpdated: new Date().toISOString() },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<BalanceDisplay />);

      expect(screen.getByText('-10.00')).toBeInTheDocument();
    });
  });
});
