import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackBadge, TrackBadgeGroup } from '../TrackBadge';

describe('TrackBadge', () => {
  describe('Badge Types', () => {
    it('renders instrumental badge', () => {
      render(<TrackBadge type="instrumental" />);

      expect(screen.getByText('Instrumental')).toBeInTheDocument();
    });

    it('renders vocals badge', () => {
      render(<TrackBadge type="vocals" />);

      expect(screen.getByText('Vocals')).toBeInTheDocument();
    });

    it('renders stems badge', () => {
      render(<TrackBadge type="stems" />);

      expect(screen.getByText('Stems')).toBeInTheDocument();
    });

    it('renders version badge with version number', () => {
      render(<TrackBadge type="version" versionNumber={2} />);

      expect(screen.getByText('V2')).toBeInTheDocument();
    });

    it('renders version badge with default version 1', () => {
      render(<TrackBadge type="version" />);

      expect(screen.getByText('V1')).toBeInTheDocument();
    });
  });

  describe('Custom Labels', () => {
    it('renders custom label for instrumental', () => {
      render(<TrackBadge type="instrumental" label="Instrumentalная версия" />);

      expect(screen.getByText('Instrumentalная версия')).toBeInTheDocument();
    });

    it('renders custom label for vocals', () => {
      render(<TrackBadge type="vocals" label="С вокалом" />);

      expect(screen.getByText('С вокалом')).toBeInTheDocument();
    });

    it('renders custom label for stems', () => {
      render(<TrackBadge type="stems" label="Разделено" />);

      expect(screen.getByText('Разделено')).toBeInTheDocument();
    });

    it('renders custom label for version', () => {
      render(<TrackBadge type="version" label="Версия 3" />);

      expect(screen.getByText('Версия 3')).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('shows icon by default', () => {
      const { container } = render(<TrackBadge type="instrumental" />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      const { container } = render(<TrackBadge type="instrumental" showIcon={false} />);

      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('renders correct icon for each type', () => {
      const { container: instrumentalContainer } = render(
        <TrackBadge type="instrumental" data-testid="instrumental" />
      );
      expect(instrumentalContainer.querySelector('svg')).toBeInTheDocument();

      const { container: vocalsContainer } = render(
        <TrackBadge type="vocals" data-testid="vocals" />
      );
      expect(vocalsContainer.querySelector('svg')).toBeInTheDocument();

      const { container: stemsContainer } = render(
        <TrackBadge type="stems" data-testid="stems" />
      );
      expect(stemsContainer.querySelector('svg')).toBeInTheDocument();

      const { container: versionContainer } = render(
        <TrackBadge type="version" data-testid="version" />
      );
      expect(versionContainer.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders xs size', () => {
      const { container } = render(<TrackBadge type="instrumental" size="xs" />);

      const badge = container.querySelector('[class*="text-\\[9px\\]"]');
      expect(badge).toBeInTheDocument();
    });

    it('renders sm size (default)', () => {
      const { container } = render(<TrackBadge type="instrumental" size="sm" />);

      const badge = container.querySelector('[class*="text-\\[10px\\]"]');
      expect(badge).toBeInTheDocument();
    });

    it('renders md size', () => {
      const { container } = render(<TrackBadge type="instrumental" size="md" />);

      const badge = container.querySelector('[class*="text-xs"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies default variant', () => {
      render(<TrackBadge type="instrumental" variant="default" />);

      expect(screen.getByText('Instrumental')).toBeInTheDocument();
    });

    it('applies secondary variant', () => {
      render(<TrackBadge type="instrumental" variant="secondary" />);

      expect(screen.getByText('Instrumental')).toBeInTheDocument();
    });

    it('applies outline variant', () => {
      render(<TrackBadge type="instrumental" variant="outline" />);

      expect(screen.getByText('Instrumental')).toBeInTheDocument();
    });

    it('applies ghost variant', () => {
      render(<TrackBadge type="instrumental" variant="outline" />);

      expect(screen.getByText('Instrumental')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible title attribute', () => {
      render(<TrackBadge type="instrumental" />);

      const badge = screen.getByText('Instrumental').closest('span');
      expect(badge).toHaveAttribute('title', 'Instrumental');
    });

    it('uses custom tooltip text', () => {
      render(<TrackBadge type="instrumental" tooltip="Трек без вокала" />);

      const badge = screen.getByText('Instrumental').closest('span');
      expect(badge).toHaveAttribute('title', 'Трек без вокала');
    });

    it('hides icon from screen readers', () => {
      const { container } = render(<TrackBadge type="instrumental" />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <TrackBadge type="instrumental" className="custom-class" />
      );

      const badge = container.querySelector('.custom-class');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Color Schemes', () => {
    it('applies blue color scheme for instrumental', () => {
      const { container } = render(<TrackBadge type="instrumental" />);

      const badge = container.querySelector('[class*="text-blue"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies purple color scheme for vocals', () => {
      const { container } = render(<TrackBadge type="vocals" />);

      const badge = container.querySelector('[class*="text-purple"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies green color scheme for stems', () => {
      const { container } = render(<TrackBadge type="stems" />);

      const badge = container.querySelector('[class*="text-green"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies slate color scheme for version', () => {
      const { container } = render(<TrackBadge type="version" />);

      const badge = container.querySelector('[class*="text-slate"]');
      expect(badge).toBeInTheDocument();
    });
  });
});

describe('TrackBadgeGroup', () => {
  it('renders multiple badges', () => {
    render(
      <TrackBadgeGroup>
        <TrackBadge type="instrumental" />
        <TrackBadge type="stems" />
        <TrackBadge type="version" versionNumber={2} />
      </TrackBadgeGroup>
    );

    expect(screen.getByText('Instrumental')).toBeInTheDocument();
    expect(screen.getByText('Stems')).toBeInTheDocument();
    expect(screen.getByText('V2')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <TrackBadgeGroup className="custom-group-class">
        <TrackBadge type="instrumental" />
      </TrackBadgeGroup>
    );

    const group = container.querySelector('.custom-group-class');
    expect(group).toBeInTheDocument();
  });

  it('renders with flex-wrap layout', () => {
    const { container } = render(
      <TrackBadgeGroup>
        <TrackBadge type="instrumental" />
        <TrackBadge type="vocals" />
        <TrackBadge type="stems" />
      </TrackBadgeGroup>
    );

    const group = container.querySelector('[class*="flex-wrap"]');
    expect(group).toBeInTheDocument();
  });
});
