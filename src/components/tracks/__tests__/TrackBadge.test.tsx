/**
 * Unit tests for TrackBadge and TrackBadgeGroup
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrackBadge, TrackBadgeGroup, TrackBadgeProps } from '../TrackBadge';
import { TooltipProvider } from '@/components/ui/tooltip';

// Helper to render with the required TooltipProvider
const renderBadge = (props: TrackBadgeProps) => {
  return render(
    <TooltipProvider>
      <TrackBadge {...props} />
    </TooltipProvider>
  );
};

describe('TrackBadge', () => {
  describe('Rendering based on type', () => {
    it('renders instrumental badge', () => {
      renderBadge({ type: 'instrumental' });
      expect(screen.getByText('Instrumental')).toBeInTheDocument();
    });

    it('renders vocals badge', () => {
      renderBadge({ type: 'vocals' });
      expect(screen.getByText('Vocals')).toBeInTheDocument();
    });

    it('renders stems badge', () => {
      renderBadge({ type: 'stems' });
      expect(screen.getByText('Stems')).toBeInTheDocument();
    });

    it('renders version badge with version number', () => {
      renderBadge({ type: 'version', versionNumber: 3 });
      expect(screen.getByText('V3')).toBeInTheDocument();
    });

    it('renders version badge with default version 1', () => {
      renderBadge({ type: 'version' });
      expect(screen.getByText('V1')).toBeInTheDocument();
    });
  });

  describe('Customization props', () => {
    it('renders custom label', () => {
      renderBadge({ type: 'vocals', label: 'Backing Vocals' });
      expect(screen.getByText('Backing Vocals')).toBeInTheDocument();
    });

    it('shows icon by default', () => {
      const { container } = renderBadge({ type: 'instrumental' });
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      const { container } = renderBadge({ type: 'instrumental', showIcon: false });
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible title attribute from label', () => {
      renderBadge({ type: 'instrumental' });
      // The component applies the title attribute to its root element
      expect(screen.getByText('Instrumental').closest('div')).toHaveAttribute('title', 'Instrumental');
    });

    it('uses custom tooltip for title attribute', () => {
      renderBadge({ type: 'instrumental', tooltip: 'Трек без вокала' });
      expect(screen.getByText('Instrumental').closest('div')).toHaveAttribute('title', 'Трек без вокала');
    });

    it('hides icon from screen readers', () => {
      const { container } = renderBadge({ type: 'instrumental' });
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('TrackBadgeGroup', () => {
    it('renders multiple badges with correct layout', () => {
        const { container } = render(
            <TrackBadgeGroup>
                <TrackBadge type="instrumental" />
                <TrackBadge type="vocals" />
            </TrackBadgeGroup>
        );
        expect(screen.getByText('Instrumental')).toBeInTheDocument();
        expect(screen.getByText('Vocals')).toBeInTheDocument();
        expect(container.firstChild).toHaveClass('inline-flex flex-wrap items-center gap-1');
    });

    it('applies custom className', () => {
        const { container } = render(
            <TrackBadgeGroup className="mt-4">
                <TrackBadge type="stems" />
            </TrackBadgeGroup>
        );
        expect(container.firstChild).toHaveClass('mt-4');
    });
});
