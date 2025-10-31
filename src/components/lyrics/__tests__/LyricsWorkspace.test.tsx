import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LyricsWorkspace } from '../workspace/LyricsWorkspace';

describe('LyricsWorkspace', () => {
  const mockOnChange = vi.fn();
  const mockOnGenerate = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    value: '[Verse]\nTest lyrics content\n\n[Chorus]\nTest chorus',
    onChange: mockOnChange,
    onGenerate: mockOnGenerate,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render lyrics content', () => {
    render(<LyricsWorkspace {...defaultProps} />);
    
    expect(screen.getByText(/Verse/i)).toBeInTheDocument();
    expect(screen.getByText(/Test lyrics content/i)).toBeInTheDocument();
  });

  it('should call onChange when content is modified', () => {
    render(<LyricsWorkspace {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New lyrics' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('New lyrics');
  });

  it('should display section count correctly', () => {
    render(<LyricsWorkspace {...defaultProps} />);
    
    // Should have 2 sections (Verse and Chorus)
    expect(screen.getByText(/2 sections/i)).toBeInTheDocument();
  });

  it('should handle empty lyrics', () => {
    render(<LyricsWorkspace {...defaultProps} value="" />);
    
    expect(screen.getByText(/No lyrics yet/i)).toBeInTheDocument();
  });

  it('should render toolbar when showAITools is true', () => {
    render(<LyricsWorkspace {...defaultProps} showAITools={true} />);
    
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
  });

  it('should not render AI tools when showAITools is false', () => {
    render(<LyricsWorkspace {...defaultProps} showAITools={false} />);
    
    expect(screen.queryByRole('button', { name: /Generate/i })).not.toBeInTheDocument();
  });

  it('should be read-only when readOnly prop is true', () => {
    render(<LyricsWorkspace {...defaultProps} readOnly={true} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('readonly');
  });

  it('should parse sections correctly', () => {
    const lyrics = '[Verse 1]\nFirst verse\n\n[Chorus]\nChorus part\n\n[Verse 2]\nSecond verse';
    render(<LyricsWorkspace {...defaultProps} value={lyrics} />);
    
    expect(screen.getByText(/3 sections/i)).toBeInTheDocument();
  });

  it('should display word count', () => {
    render(<LyricsWorkspace {...defaultProps} />);
    
    // "Test lyrics content Test chorus" = 4 words
    expect(screen.getByText(/4 words/i)).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', () => {
    render(<LyricsWorkspace {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('should handle compact mode', () => {
    const { container } = render(<LyricsWorkspace {...defaultProps} compact={true} />);
    
    expect(container.firstChild).toHaveClass('compact');
  });

  it('should display lint issues when present', () => {
    const lyricsWithIssues = '[Verse]\nShort\n\n[Chorus]\nAlso short';
    render(<LyricsWorkspace {...defaultProps} value={lyricsWithIssues} />);
    
    // Should show warnings about short sections
    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('should support section reordering', () => {
    render(<LyricsWorkspace {...defaultProps} showSectionControls={true} />);
    
    const moveUpButton = screen.getAllByLabelText(/Move up/i)[0];
    expect(moveUpButton).toBeInTheDocument();
  });

  it('should support adding tags when enabled', () => {
    render(<LyricsWorkspace {...defaultProps} showTags={true} />);
    
    expect(screen.getByPlaceholder(/Add tag/i)).toBeInTheDocument();
  });
});
