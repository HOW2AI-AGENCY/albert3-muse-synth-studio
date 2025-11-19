
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { ProjectBrowser } from '../ProjectBrowser';

// Mock the useVirtualizer hook to control what is "visible"
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }) => {
    const virtualItems = Array.from({ length: count }, (_, index) => ({
      index,
      key: index,
      start: index * 44,
      size: 44,
    }));
    return {
      getVirtualItems: () => virtualItems,
      getTotalSize: () => count * 44,
    };
  },
}));

describe('ProjectBrowser', () => {
  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnOpenChange = vi.fn();

  const mockProjects = [
    { id: '1', name: 'Project Alpha', data: {} },
    { id: '2', name: 'Project Beta', data: {} },
  ] as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of projects', () => {
    render(
      <ProjectBrowser
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        isLoading={false}
        projects={mockProjects}
      />
    );

    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('calls onSelect when a project name is clicked', () => {
    render(
      <ProjectBrowser
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        isLoading={false}
        projects={mockProjects}
      />
    );

    fireEvent.click(screen.getByText('Project Alpha'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockProjects[0]);
  });

  it('calls onDelete when the delete button is clicked', () => {
    render(
      <ProjectBrowser
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        isLoading={false}
        projects={mockProjects}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('shows a loading message when isLoading is true', () => {
    render(
      <ProjectBrowser
        open={true}
        onOpen-change={mockOnOpenChange}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        isLoading={true}
        projects={[]}
      />
    );

    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });
});
