/**
 * Unit Tests for AIFieldImprovement Component
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIFieldImprovement } from '@/components/generator/ui/AIFieldImprovement';
import * as useAIImproveFieldModule from '@/hooks/useAIImproveField';

// Mock useAIImproveField hook
const mockImproveField = vi.fn();
vi.mock('@/hooks/useAIImproveField', () => ({
  useAIImproveField: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('AIFieldImprovement', () => {
  const defaultProps = {
    field: 'prompt',
    value: 'Test prompt',
    onResult: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAIImproveFieldModule.useAIImproveField).mockReturnValue({
      improveField: mockImproveField,
      isImproving: false,
      error: null,
    });
  });

  describe('Rendering', () => {
    it('should render AI improvement button', () => {
      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should show dropdown menu on button click', async () => {
      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('✨ Улучшить')).toBeInTheDocument();
        expect(screen.getByText('🎯 Сгенерировать')).toBeInTheDocument();
        expect(screen.getByText('🔄 Переписать')).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AIFieldImprovement {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should show loading state when isImproving is true', () => {
      vi.mocked(useAIImproveFieldModule.useAIImproveField).mockReturnValue({
        improveField: mockImproveField,
        isImproving: true,
        error: null,
      });

      render(<AIFieldImprovement {...defaultProps} />);
      
      expect(screen.getByText(/Обработка/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call improveField with "improve" action', async () => {
      mockImproveField.mockResolvedValueOnce(undefined);

      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const improveOption = screen.getByText('✨ Улучшить');
        fireEvent.click(improveOption);
      });

      expect(mockImproveField).toHaveBeenCalledWith({
        field: 'prompt',
        value: 'Test prompt',
        action: 'improve',
        context: undefined,
        additionalContext: undefined,
      });
    });

    it('should call improveField with "generate" action', async () => {
      mockImproveField.mockResolvedValueOnce(undefined);

      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const generateOption = screen.getByText('🎯 Сгенерировать');
        fireEvent.click(generateOption);
      });

      expect(mockImproveField).toHaveBeenCalledWith({
        field: 'prompt',
        value: 'Test prompt',
        action: 'generate',
        context: undefined,
        additionalContext: undefined,
      });
    });

    it('should call improveField with "rewrite" action', async () => {
      mockImproveField.mockResolvedValueOnce(undefined);

      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const rewriteOption = screen.getByText('🔄 Переписать');
        fireEvent.click(rewriteOption);
      });

      expect(mockImproveField).toHaveBeenCalledWith({
        field: 'prompt',
        value: 'Test prompt',
        action: 'rewrite',
        context: undefined,
        additionalContext: undefined,
      });
    });

    it('should pass context to improveField', async () => {
      mockImproveField.mockResolvedValueOnce(undefined);

      render(
        <AIFieldImprovement 
          {...defaultProps} 
          context="Electronic music project"
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const improveOption = screen.getByText('✨ Улучшить');
        fireEvent.click(improveOption);
      });

      expect(mockImproveField).toHaveBeenCalledWith({
        field: 'prompt',
        value: 'Test prompt',
        action: 'improve',
        context: 'Electronic music project',
        additionalContext: undefined,
      });
    });

    it('should not call improveField when value is empty', async () => {
      render(<AIFieldImprovement {...defaultProps} value="" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const improveOption = screen.getByText('✨ Улучшить');
        fireEvent.click(improveOption);
      });

      expect(mockImproveField).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should disable menu when isImproving is true', () => {
      vi.mocked(useAIImproveFieldModule.useAIImproveField).mockReturnValue({
        improveField: mockImproveField,
        isImproving: true,
        error: null,
      });

      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show correct loading text for different actions', async () => {
      const { rerender } = render(<AIFieldImprovement {...defaultProps} />);

      // Simulate improve action
      vi.mocked(useAIImproveFieldModule.useAIImproveField).mockReturnValue({
        improveField: mockImproveField,
        isImproving: true,
        error: null,
      });

      rerender(<AIFieldImprovement {...defaultProps} />);
      expect(screen.getByText(/Обработка/i)).toBeInTheDocument();
    });
  });

  describe('Integration with Project Context', () => {
    it('should pass additionalContext correctly', async () => {
      mockImproveField.mockResolvedValueOnce(undefined);

      const additionalContext = {
        genre: 'Electronic',
        mood: 'Energetic',
        tags: ['edm', 'dance'],
      };

      render(
        <AIFieldImprovement 
          {...defaultProps}
          additionalContext={additionalContext}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const improveOption = screen.getByText('✨ Улучшить');
        fireEvent.click(improveOption);
      });

      expect(mockImproveField).toHaveBeenCalledWith({
        field: 'prompt',
        value: 'Test prompt',
        action: 'improve',
        context: undefined,
        additionalContext,
      });
    });
  });

  describe('Icon Rendering', () => {
    it('should render correct icon for each action', async () => {
      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Check for emoji icons in menu items
        expect(screen.getByText('✨ Улучшить')).toBeInTheDocument();
        expect(screen.getByText('🎯 Сгенерировать')).toBeInTheDocument();
        expect(screen.getByText('🔄 Переписать')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button', () => {
      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should be keyboard accessible', async () => {
      render(<AIFieldImprovement {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });
  });
});
