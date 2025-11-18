
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ProjectBrowser } from '../ProjectBrowser';
import React from 'react';

// Mock the useDAWProjects hook
vi.mock('@/hooks/useDAWProjects', () => ({
  useDAWProjects: () => ({
    projects: [
      { id: '1', name: 'Project Alpha' },
      { id: '2', name: 'Project Beta' },
    ],
    isLoading: false,
    deleteProject: vi.fn(),
  }),
}));

describe('ProjectBrowser', () => {
  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnOpenChange = vi.fn();

  const mockProjects = [
    { id: '1', name: 'Project Alpha', data: { name: 'Project Alpha' } },
    { id: '2', name: 'Project Beta', data: { name: 'Project Beta' } },
  ];

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
        onOpenChange={mockOnOpenChange}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        isLoading={true}
        projects={[]}
      />
    );

    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });
});
