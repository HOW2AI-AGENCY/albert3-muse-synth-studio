import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LyricsWorkspace, LyricsWorkspaceProps } from '../workspace/LyricsWorkspace';
import { TooltipProvider } from '@/components/ui/tooltip'; // TooltipProvider is required by some child components

// Mock child components to isolate the workspace logic
vi.mock('../workspace/LyricsToolbar', () => ({
  LyricsToolbar: (props: any) => (
    <div data-testid="lyrics-toolbar">
      <button onClick={props.onAddSection}>Add Section</button>
      <button onClick={() => props.onSave(props.currentLyrics)}>Save</button>
      {props.showAITools && <button onClick={props.onGenerate}>Generate</button>}
      <span>{`${props.stats.sections} sections`}</span>
      <span>{`${props.stats.words} words`}</span>
      {props.lintIssues.map((issue: any) => <div key={issue.message}>{issue.severity}</div>)}
    </div>
  ),
}));

vi.mock('../workspace/LyricsContent', () => ({
  LyricsContent: (props: any) => (
    <div data-testid="lyrics-content">
      <textarea
        value={props.document.sections.map((s: any) => `[${s.title}]\n${s.content}`).join('\n\n')}
        onChange={(e) => props.onDocumentChange({ ...props.document, sections: [{ title: 'Verse', content: e.target.value }] })}
        readOnly={props.readOnly}
      />
      {props.showSectionControls && <button aria-label="Move up">Move up</button>}
      {props.showTags && <input placeholder="Add tag" />}
    </div>
  ),
}));

vi.mock('../workspace/SectionPresetDialog', () => ({
    SectionPresetDialog: ({ open, onOpenChange, onSelectPreset }: any) => {
        if (!open) return null;
        return (
            <div data-testid="preset-dialog">
                <button onClick={() => onSelectPreset({ title: 'Verse', content: '' })}>
                    Select Verse
                </button>
                <button onClick={() => onOpenChange(false)}>Close</button>
            </div>
        );
    },
}));


const renderWithProvider = (props: LyricsWorkspaceProps) => {
    return render(
        <TooltipProvider>
            <LyricsWorkspace {...props} />
        </TooltipProvider>
    );
};


describe('LyricsWorkspace', () => {
  const mockOnChange = vi.fn();
  const mockOnGenerate = vi.fn();
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  const defaultProps: LyricsWorkspaceProps = {
    mode: 'edit' as const,
    value: '[Verse]\nTest lyrics content\n\n[Chorus]\nTest chorus',
    onChange: mockOnChange,
    onGenerate: mockOnGenerate,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the toolbar with stats', () => {
    renderWithProvider(defaultProps);
    expect(screen.getByTestId('lyrics-toolbar')).toBeInTheDocument();
    expect(screen.getByText('2 sections')).toBeInTheDocument();
  });

  it('should call onChange when content is modified via LyricsContent', async () => {
    renderWithProvider(defaultProps);
    const textarea = screen.getByRole('textbox');
    
    // Simulate a change in a section's content
    await userEvent.type(textarea, ' new text');

    // The mock for LyricsContent calls onDocumentChange, which triggers onChange in the parent.
    // We check if it was called, not the exact value which is determined by the mock.
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should display section count correctly', () => {
    renderWithProvider(defaultProps);
    expect(screen.getByText(/2 sections/i)).toBeInTheDocument();
  });

  it('should handle empty lyrics', () => {
    renderWithProvider({ ...defaultProps, value: "" });
    // With empty value, there are 0 sections and 0 words
    expect(screen.getByText(/0 sections/i)).toBeInTheDocument();
    expect(screen.getByText(/0 words/i)).toBeInTheDocument();
  });

  it('should render AI tools when showAITools is true', () => {
    renderWithProvider({ ...defaultProps, showAITools: true });
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
  });

  it('should not render AI tools when showAITools is false', () => {
    renderWithProvider({ ...defaultProps, showAITools: false });
    expect(screen.queryByRole('button', { name: /Generate/i })).not.toBeInTheDocument();
  });

  it('should pass readOnly prop to LyricsContent', () => {
    renderWithProvider({ ...defaultProps, readOnly: true });
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('readonly');
  });

  it('should parse sections correctly', () => {
    const lyrics = '[Verse 1]\nFirst verse\n\n[Chorus]\nChorus part\n\n[Verse 2]\nSecond verse';
    renderWithProvider({ ...defaultProps, value: lyrics });
    expect(screen.getByText(/3 sections/i)).toBeInTheDocument();
  });

  it('should display word count', () => {
    renderWithProvider(defaultProps);
    // "Test lyrics content Test chorus" = 4 words
    expect(screen.getByText(/4 words/i)).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked in toolbar', async () => {
    renderWithProvider(defaultProps);
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledWith(defaultProps.value);
  });

  it('should add compact class when compact prop is true', () => {
    const { container } = renderWithProvider({ ...defaultProps, compact: true });
    expect(container.firstChild).toHaveClass('compact');
  });

  it('should display lint issues when present', () => {
    // This lint rule is simple: line is too short.
    const lyricsWithIssues = '[Verse]\nShort';
    renderWithProvider({ ...defaultProps, value: lyricsWithIssues });
    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('should pass down section controls visibility', () => {
    renderWithProvider({ ...defaultProps, showSectionControls: true });
    expect(screen.getByLabelText(/Move up/i)).toBeInTheDocument();
  });

  it('should pass down tags visibility', () => {
    renderWithProvider({ ...defaultProps, showTags: true });
    expect(screen.getByPlaceholderText(/Add tag/i)).toBeInTheDocument();
  });
});
