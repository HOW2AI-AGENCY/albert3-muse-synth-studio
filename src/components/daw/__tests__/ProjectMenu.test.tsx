
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ProjectMenu } from '../ProjectMenu';
import { useDAWProjects } from '@/hooks/useDAWProjects';

// Mock child components and hooks
vi.mock('@/hooks/useDAWProjects');
vi.mock('../ProjectBrowser', () => ({
  ProjectBrowser: ({ open }) => (open ? <div>Project Browser Open</div> : null),
}));

const mockUseDAWProjects = useDAWProjects as vi.Mock;

describe('ProjectMenu', () => {
  const mockOnSave = vi.fn();
  const mockOnSaveAs = vi.fn();
  const mockOnLoadProject = vi.fn();
  const mockOnNew = vi.fn();

  beforeEach(() => {
    mockUseDAWProjects.mockReturnValue({
      projects: [],
      isLoading: false,
      deleteProject: vi.fn(),
    });
    vi.clearAllMocks();
  });

  it('renders all menu buttons', () => {
    render(
      <ProjectMenu
        currentProject={null}
        onSave={mockOnSave}
        onSaveAs={mockOnSaveAs}
        onLoadProject={mockOnLoadProject}
        onNew={mockOnNew}
      />
    );

    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save As...' })).toBeInTheDocument();
  });

  it('disables the Save button when there is no current project', () => {
    render(
      <ProjectMenu
        currentProject={null}
        onSave={mockOnSave}
        onSaveAs={mockOnSaveAs}
        onLoadProject={mockOnLoadProject}
        onNew={mockOnNew}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables the Save button when there is a current project', () => {
    const mockProject = { id: '1', name: 'Test Project', data: {} };
    render(
      <ProjectMenu
        currentProject={mockProject}
        onSave={mockOnSave}
        onSaveAs={mockOnSaveAs}
        onLoadProject={mockOnLoadProject}
        onNew={mockOnNew}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('calls the correct handlers when buttons are clicked', () => {
    const mockProject = { id: '1', name: 'Test Project', data: {} };
    render(
      <ProjectMenu
        currentProject={mockProject}
        onSave={mockOnSave}
        onSaveAs={mockOnSaveAs}
        onLoadProject={mockOnLoadProject}
        onNew={mockOnNew}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(mockOnNew).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockOnSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));
    expect(mockOnSaveAs).toHaveBeenCalledTimes(1);
  });

  it('opens the ProjectBrowser when the Open button is clicked', () => {
    render(
      <ProjectMenu
        currentProject={null}
        onSave={mockOnSave}
        onSaveAs={mockOnSaveAs}
        onLoadProject={mockOnLoadProject}
        onNew={mockOnNew}
      />
    );

    expect(screen.queryByText('Project Browser Open')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByText('Project Browser Open')).toBeInTheDocument();
  });
});
