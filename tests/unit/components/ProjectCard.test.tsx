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
    expect(screen.getByText(/5 tracks/i)).toBeInTheDocument();
  });

  it('should render completed tracks count', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText(/3 completed/i)).toBeInTheDocument();
  });

  it('should render total duration', () => {
    render(<ProjectCard project={mockProject} />);
    // 900 seconds = 15 minutes
    expect(screen.getByText(/15:00/i)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ProjectCard project={mockProject} onClick={handleClick} />);

    const card = screen.getByRole('article');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledWith(mockProject.id);
  });

  it('should show AI badge for AI-generated projects', () => {
    const aiProject = { ...mockProject, ai_generated: true };
    render(<ProjectCard project={aiProject} />);

    expect(screen.getByText(/AI/i)).toBeInTheDocument();
  });

  it('should not show AI badge for manual projects', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.queryByText(/AI/i)).not.toBeInTheDocument();
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

    expect(screen.getByText(/0 tracks/i)).toBeInTheDocument();
  });

  it('should apply hover state', () => {
    render(<ProjectCard project={mockProject} />);

    const card = screen.getByRole('article');
    fireEvent.mouseEnter(card);

    expect(card).toHaveClass('hover:shadow-lg');
  });
});
