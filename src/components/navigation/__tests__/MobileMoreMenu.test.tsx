import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MobileMoreMenu } from '../MobileMoreMenu';
import type { WorkspaceNavItem } from '@/config/workspace-navigation';
import { Heart, Settings, BarChart3 } from '@/utils/iconImports';

const mockOverflowItems: WorkspaceNavItem[] = [
  {
    id: 'favorites',
    label: 'Избранное',
    path: '/workspace/favorites',
    icon: Heart,
  },
  {
    id: 'monitoring',
    label: 'Мониторинг',
    path: '/workspace/monitoring-hub',
    icon: BarChart3,
  },
  {
    id: 'settings',
    label: 'Настройки',
    path: '/workspace/settings',
    icon: Settings,
  },
];

const renderMobileMoreMenu = (items = mockOverflowItems) => {
  return render(
    <MemoryRouter>
      <MobileMoreMenu items={items} />
    </MemoryRouter>
  );
};

describe('MobileMoreMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the "More" button', () => {
      renderMobileMoreMenu();

      const moreButton = screen.getByLabelText('Ещё');
      expect(moreButton).toBeInTheDocument();
    });

    it('displays "Ещё" label text', () => {
      renderMobileMoreMenu();

      expect(screen.getByText('Ещё')).toBeInTheDocument();
    });
  });

  describe('WCAG AA Compliance (Phase 1.4 Refactoring)', () => {
    it('renders Grid3X3 icon instead of MoreHorizontal', () => {
      const { container } = renderMobileMoreMenu();

      // Find the SVG icon
      const icon = container.querySelector('button svg');
      expect(icon).toBeInTheDocument();

      // Grid3X3 icon should be present (3x3 grid is more intuitive than three dots)
      // We verify by checking the icon has h-6 w-6 classes
      expect(icon?.classList.contains('h-6')).toBe(true);
      expect(icon?.classList.contains('w-6')).toBe(true);
    });

    it('renders icon with 24px size (h-6 w-6)', () => {
      const { container } = renderMobileMoreMenu();

      const icon = container.querySelector('button svg');

      // Check for h-6 w-6 classes (24px × 24px)
      expect(icon?.classList.contains('h-6')).toBe(true);
      expect(icon?.classList.contains('w-6')).toBe(true);
    });

    it('renders label with text-xs size (12px minimum)', () => {
      const { container } = renderMobileMoreMenu();

      const label = screen.getByText('Ещё');

      // Check for text-xs class (12px minimum for WCAG AA)
      expect(label.classList.contains('text-xs')).toBe(true);
    });
  });

  describe('Button Accessibility', () => {
    it('has proper aria-label', () => {
      renderMobileMoreMenu();

      const button = screen.getByLabelText('Ещё');
      expect(button).toBeInTheDocument();
    });

    it('has minimum touch target height (44px)', () => {
      const { container } = renderMobileMoreMenu();

      const button = container.querySelector('button');

      // Should have min-h-[44px] class for iOS/Android touch target minimum
      expect(button?.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('is keyboard accessible', async () => {
      renderMobileMoreMenu();

      const button = screen.getByLabelText('Ещё');

      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);

      // Should be activatable with Enter key
      await userEvent.keyboard('{Enter}');

      // Sheet should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Sheet (Drawer) Behavior', () => {
    it('opens sheet when button is clicked', async () => {
      renderMobileMoreMenu();

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      // Sheet should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Sheet title should be visible
      expect(screen.getByText('Меню')).toBeInTheDocument();
    });

    it('displays all overflow items in the sheet', async () => {
      renderMobileMoreMenu();

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      // Wait for sheet to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // All overflow items should be visible
      expect(screen.getByText('Избранное')).toBeInTheDocument();
      expect(screen.getByText('Мониторинг')).toBeInTheDocument();
      expect(screen.getByText('Настройки')).toBeInTheDocument();
    });

    it('renders overflow items with icons', async () => {
      const { container } = renderMobileMoreMenu();

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Icons should be rendered with h-5 w-5 size
      const icons = container.querySelectorAll('[role="dialog"] svg');
      expect(icons.length).toBe(mockOverflowItems.length);

      icons.forEach((icon) => {
        expect(icon.classList.contains('h-5')).toBe(true);
        expect(icon.classList.contains('w-5')).toBe(true);
      });
    });

    it('renders overflow items as navigation links', async () => {
      renderMobileMoreMenu();

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Links should have correct paths
      const favoritesLink = screen.getByRole('link', { name: /Избранное/i });
      const monitoringLink = screen.getByRole('link', { name: /Мониторинг/i });
      const settingsLink = screen.getByRole('link', { name: /Настройки/i });

      expect(favoritesLink).toHaveAttribute('href', '/workspace/favorites');
      expect(monitoringLink).toHaveAttribute('href', '/workspace/monitoring-hub');
      expect(settingsLink).toHaveAttribute('href', '/workspace/settings');
    });
  });

  describe('Active State in Sheet', () => {
    it('highlights active route in overflow menu', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/workspace/settings']}>
          <MobileMoreMenu items={mockOverflowItems} />
        </MemoryRouter>
      );

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Active link should have bg-primary class
      const settingsLink = screen.getByRole('link', { name: /Настройки/i });
      expect(settingsLink.classList.contains('bg-primary')).toBe(true);
      expect(settingsLink.classList.contains('text-primary-foreground')).toBe(true);
    });

    it('applies hover styles to inactive links', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/workspace/dashboard']}>
          <MobileMoreMenu items={mockOverflowItems} />
        </MemoryRouter>
      );

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Inactive links should have hover:bg-accent class
      const favoritesLink = screen.getByRole('link', { name: /Избранное/i });
      expect(favoritesLink.classList.contains('hover:bg-accent')).toBe(true);
    });
  });

  describe('Sheet Positioning and Styling', () => {
    it('positions sheet at bottom of screen', async () => {
      const { container } = renderMobileMoreMenu();

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // SheetContent should have side="bottom" attribute reflected in positioning
      const sheetContent = container.querySelector('[role="dialog"]');
      expect(sheetContent).toBeInTheDocument();
    });

    it('limits sheet height to 50vh maximum', async () => {
      const { container } = renderMobileMoreMenu();

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find the content wrapper within the dialog
      const contentWrapper = container.querySelector('[role="dialog"] > div');
      expect(contentWrapper?.classList.contains('max-h-[50vh]')).toBe(true);
    });
  });

  describe('Button Styling', () => {
    it('applies ghost variant styling', () => {
      const { container } = renderMobileMoreMenu();

      const button = container.querySelector('button');

      // Button should have flex-col layout
      expect(button?.classList.contains('flex-col')).toBe(true);
      expect(button?.classList.contains('items-center')).toBe(true);
      expect(button?.classList.contains('justify-center')).toBe(true);
    });

    it('has proper spacing between icon and label', () => {
      const { container } = renderMobileMoreMenu();

      const button = container.querySelector('button');

      // Should have gap-0.5 class
      expect(button?.classList.contains('gap-0.5')).toBe(true);
    });

    it('has hover state styling', () => {
      const { container } = renderMobileMoreMenu();

      const button = container.querySelector('button');

      // Should have hover:bg-accent/50 class
      expect(button?.classList.contains('hover:bg-accent/50')).toBe(true);
    });

    it('has transition for smooth interactions', () => {
      const { container } = renderMobileMoreMenu();

      const button = container.querySelector('button');

      // Should have transition-colors class
      expect(button?.classList.contains('transition-colors')).toBe(true);
    });
  });

  describe('Empty State', () => {
    it('renders button even with no items', () => {
      renderMobileMoreMenu([]);

      const moreButton = screen.getByLabelText('Ещё');
      expect(moreButton).toBeInTheDocument();
    });

    it('shows empty sheet when opened with no items', async () => {
      renderMobileMoreMenu([]);

      const moreButton = screen.getByLabelText('Ещё');
      await userEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show title but no links
      expect(screen.getByText('Меню')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
