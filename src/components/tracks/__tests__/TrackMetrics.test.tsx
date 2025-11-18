import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackMetrics, formatDuration, formatCount } from '../TrackMetrics';

describe('TrackMetrics', () => {
  describe('Rendering', () => {
    it('renders duration metric', () => {
      render(<TrackMetrics duration={180} />);

      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders likes metric', () => {
      render(<TrackMetrics likes={1250} />);

      expect(screen.getByText('1.3K')).toBeInTheDocument();
    });

    it('renders views metric', () => {
      render(<TrackMetrics views={5600} />);

      expect(screen.getByText('5.6K')).toBeInTheDocument();
    });

    it('renders plays metric', () => {
      render(<TrackMetrics plays={3400} />);

      expect(screen.getByText('3.4K')).toBeInTheDocument();
    });

    it('renders all metrics together', () => {
      render(<TrackMetrics duration={180} likes={1250} views={5600} plays={3400} />);

      expect(screen.getByText('3:00')).toBeInTheDocument();
      expect(screen.getByText('1.3K')).toBeInTheDocument();
      expect(screen.getByText('5.6K')).toBeInTheDocument();
      expect(screen.getByText('3.4K')).toBeInTheDocument();
    });

    it('renders nothing when no metrics provided', () => {
      const { container } = render(<TrackMetrics />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Duration Formatting', () => {
    it('formats seconds under a minute', () => {
      render(<TrackMetrics duration={45} />);

      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('formats minutes and seconds', () => {
      render(<TrackMetrics duration={185} />);

      expect(screen.getByText('3:05')).toBeInTheDocument();
    });

    it('formats hours, minutes, and seconds', () => {
      render(<TrackMetrics duration={3665} />);

      expect(screen.getByText('1:01:05')).toBeInTheDocument();
    });

    it('pads single-digit seconds with zero', () => {
      render(<TrackMetrics duration={63} />);

      expect(screen.getByText('1:03')).toBeInTheDocument();
    });

    it('handles zero duration', () => {
      render(<TrackMetrics duration={0} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });

  describe('Count Formatting', () => {
    it('formats numbers under 1000 without suffix', () => {
      render(<TrackMetrics likes={999} />);

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('formats thousands with K suffix', () => {
      render(<TrackMetrics likes={1500} />);

      expect(screen.getByText('1.5K')).toBeInTheDocument();
    });

    it('formats millions with M suffix', () => {
      render(<TrackMetrics likes={1500000} />);

      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });

    it('handles zero count', () => {
      render(<TrackMetrics likes={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Selective Display', () => {
    it('displays only specified metrics', () => {
      render(
        <TrackMetrics
          duration={180}
          likes={1250}
          views={5600}
          plays={3400}
          display={['duration', 'likes']}
        />
      );

      expect(screen.getByText('3:00')).toBeInTheDocument();
      expect(screen.getByText('1.3K')).toBeInTheDocument();
      expect(screen.queryByText('5.6K')).not.toBeInTheDocument();
      expect(screen.queryByText('3.4K')).not.toBeInTheDocument();
    });

    it('displays only duration when specified', () => {
      render(
        <TrackMetrics duration={180} likes={1250} views={5600} display={['duration']} />
      );

      expect(screen.getByText('3:00')).toBeInTheDocument();
      expect(screen.queryByText('1.3K')).not.toBeInTheDocument();
      expect(screen.queryByText('5.6K')).not.toBeInTheDocument();
    });
  });

  describe('Layouts', () => {
    it('renders horizontal layout by default', () => {
      const { container } = render(<TrackMetrics duration={180} likes={1250} />);

      const wrapper = container.querySelector('[class*="flex-row"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders vertical layout', () => {
      const { container } = render(
        <TrackMetrics duration={180} likes={1250} layout="vertical" />
      );

      const wrapper = container.querySelector('[class*="flex-col"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders compact layout', () => {
      const { container } = render(
        <TrackMetrics duration={180} likes={1250} layout="compact" />
      );

      const wrapper = container.querySelector('[class*="flex-wrap"]');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<TrackMetrics duration={180} size="sm" />);

      const text = container.querySelector('[class*="text-\\[10px\\]"]');
      expect(text).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      const { container } = render(<TrackMetrics duration={180} size="md" />);

      const text = container.querySelector('[class*="text-xs"]');
      expect(text).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<TrackMetrics duration={180} size="lg" />);

      const text = container.querySelector('[class*="text-sm"]');
      expect(text).toBeInTheDocument();
    });
  });

  describe('Labels', () => {
    it('hides labels by default', () => {
      render(<TrackMetrics duration={180} />);

      expect(screen.queryByText('Длительность')).not.toBeInTheDocument();
    });

    it('shows labels when showLabels is true', () => {
      render(<TrackMetrics duration={180} showLabels />);

      expect(screen.getByText('Длительность')).toBeInTheDocument();
    });

    it('shows all labels for all metrics', () => {
      render(
        <TrackMetrics
          duration={180}
          likes={1250}
          views={5600}
          plays={3400}
          showLabels
        />
      );

      expect(screen.getByText('Длительность')).toBeInTheDocument();
      expect(screen.getByText('Лайков')).toBeInTheDocument();
      expect(screen.getByText('Просмотров')).toBeInTheDocument();
      expect(screen.getByText('Прослушиваний')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders icons for each metric', () => {
      const { container } = render(
        <TrackMetrics duration={180} likes={1250} views={5600} plays={3400} />
      );

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBe(4);
    });

    it('hides icons from screen readers', () => {
      const { container } = render(<TrackMetrics duration={180} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Accessibility', () => {
    it('provides tooltip when labels are hidden', () => {
      const { container } = render(<TrackMetrics duration={180} />);

      const metricElement = container.querySelector('[title]');
      expect(metricElement).toHaveAttribute('title', 'Длительность');
    });

    it('uses tabular-nums for consistent number width', () => {
      const { container } = render(<TrackMetrics likes={1250} />);

      const numberElement = container.querySelector('[class*="tabular-nums"]');
      expect(numberElement).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <TrackMetrics duration={180} className="custom-metrics" />
      );

      expect(container.querySelector('.custom-metrics')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined metrics gracefully', () => {
      const { container } = render(
        <TrackMetrics duration={undefined} likes={undefined} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('handles very large numbers', () => {
      render(<TrackMetrics likes={9999999} />);

      expect(screen.getByText('10.0M')).toBeInTheDocument();
    });

    it('handles very long durations', () => {
      render(<TrackMetrics duration={36000} />);

      expect(screen.getByText('10:00:00')).toBeInTheDocument();
    });
  });
});

describe('formatDuration utility', () => {
  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds under 60', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats exactly 60 seconds', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats exactly 1 hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3665)).toBe('1:01:05');
  });

  it('pads minutes with zero in hour format', () => {
    expect(formatDuration(3605)).toBe('1:00:05');
  });

  it('handles negative numbers', () => {
    expect(formatDuration(-10)).toBe('0:00');
  });
});

describe('formatCount utility', () => {
  it('formats numbers under 1000', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1)).toBe('1');
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands', () => {
    expect(formatCount(1000)).toBe('1.0K');
    expect(formatCount(1500)).toBe('1.5K');
    expect(formatCount(9999)).toBe('10.0K');
  });

  it('formats millions', () => {
    expect(formatCount(1000000)).toBe('1.0M');
    expect(formatCount(1500000)).toBe('1.5M');
    expect(formatCount(9999999)).toBe('10.0M');
  });
});
