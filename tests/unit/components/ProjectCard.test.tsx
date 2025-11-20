/**
 * ProjectCard Component Tests
 * Week 1, Phase 1.2 - Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '@/components/projects/ProjectCard';

const mockProject = {
  id: '1',
  user_id: 'user-123',
  name: 'My Test Album',
  description: 'A test album description',
  genre: 'Electronic',
  mood: 'Energetic',
  total_tracks: 5,
  completed_tracks: 3,
  total_duration: 900,
  ai_generated: false,
  ai_concept: null,
  planned_tracklist: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('ProjectCard Component', () => {
  it('should render project name', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('My Test Album')).toBeInTheDocument();
  });

  it('should render project description', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('A test album description')).toBeInTheDocument();
  });

  it('should render project genre', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText(/Electronic/i)).toBeInTheDocument();
  });

  it('should render track count', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText(/5 треков/i)).toBeInTheDocument();
  });

  it('should render completed tracks count', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText(/3\/5 завершено/i)).toBeInTheDocument();
  });

  it('should render total duration', () => {
    render(<ProjectCard project={mockProject} />);
    // 900 seconds = 15 minutes
    expect(screen.getByText(/15:00/i)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ProjectCard project={mockProject} onClick={handleClick} />);

    const card = screen.getByText('My Test Album').closest('div')?.parentElement;
    expect(card).toBeTruthy();
    fireEvent.click(card!);

    expect(handleClick).toHaveBeenCalled();
  });

  it('should show project type badge', () => {
    render(<ProjectCard project={mockProject} />);
    // Default project_type is 'single' if not set
    expect(screen.getByText(/single/i)).toBeInTheDocument();
  });

  it('should show custom project type badge', () => {
    const albumProject = { ...mockProject, project_type: 'album' };
    render(<ProjectCard project={albumProject} />);

    expect(screen.getByText(/album/i)).toBeInTheDocument();
  });

  it('should handle missing description', () => {
    const projectWithoutDesc = { ...mockProject, description: null };
    render(<ProjectCard project={projectWithoutDesc} />);

    expect(screen.queryByText('A test album description')).not.toBeInTheDocument();
  });

  it('should handle missing genre and mood', () => {
    const projectWithoutGenre = {
      ...mockProject,
      genre: null,
      mood: null,
    };
    render(<ProjectCard project={projectWithoutGenre} />);

    expect(screen.getByText('My Test Album')).toBeInTheDocument();
  });

  it('should handle zero tracks', () => {
    const emptyProject = {
      ...mockProject,
      total_tracks: 0,
      completed_tracks: 0,
      total_duration: 0,
    };
    render(<ProjectCard project={emptyProject} />);

    // When total_tracks is 0, the component doesn't show track count or progress
    expect(screen.queryByText(/треков/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/завершено/i)).not.toBeInTheDocument();
  });

  it('should apply hover state', () => {
    const { container } = render(<ProjectCard project={mockProject} />);

    const card = container.querySelector('.group');
    expect(card).toBeTruthy();
    expect(card).toHaveClass('hover:border-primary/50');
  });
});
