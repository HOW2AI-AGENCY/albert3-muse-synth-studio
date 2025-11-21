/**
 * Hook for managing Library filters and sorting
 * Extracted from Library.tsx to reduce component complexity
 */

import { useState, useMemo, useCallback } from 'react';
import type { DisplayTrack } from '@/types/track';

export type ViewMode = 'grid' | 'list' | 'optimized';
export type SortBy = 'created_at' | 'title' | 'duration' | 'like_count';
export type SortOrder = 'asc' | 'desc';

interface UseLibraryFiltersOptions {
  tracks: DisplayTrack[];
}

export interface LibraryFiltersState {
  // View state
  viewMode: ViewMode;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  selectedStatus: string;

  // Filtered/sorted tracks
  filteredTracks: DisplayTrack[];
  availableStatuses: Array<{ value: string; label: string; count: number }>;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setSelectedStatus: (status: string) => void;
  toggleSortOrder: () => void;
  handleSortChange: (newSortBy: SortBy) => void;
}

export const useLibraryFilters = ({ tracks }: UseLibraryFiltersOptions): LibraryFiltersState => {
  // View mode (persisted in localStorage)
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('library-view-mode');
    return (saved as ViewMode) || 'grid';
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('library-view-mode', mode);
  }, []);

  // Filter/sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Handle sort change (toggle order if same sortBy)
  const handleSortChange = useCallback(
    (newSortBy: SortBy) => {
      if (sortBy === newSortBy) {
        toggleSortOrder();
      } else {
        setSortBy(newSortBy);
        setSortOrder('asc');
      }
    },
    [sortBy, toggleSortOrder]
  );

  // Calculate available statuses with counts
  const availableStatuses = useMemo(() => {
    const statusCounts = tracks.reduce(
      (acc, track) => {
        const status = track.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const statusLabels: Record<string, string> = {
      completed: 'Завершено',
      processing: 'Генерация',
      pending: 'В очереди',
      failed: 'Ошибка',
      draft: 'Черновик',
      unknown: 'Неизвестно',
    };

    return [
      { value: 'all', label: 'Все треки', count: tracks.length },
      ...Object.entries(statusCounts).map(([status, count]) => ({
        value: status,
        label: statusLabels[status] || status,
        count,
      })),
    ];
  }, [tracks]);

  // Filter and sort tracks
  const filteredTracks = useMemo(() => {
    let result = [...tracks];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (track) =>
          track.title?.toLowerCase().includes(query) ||
          track.style_tags?.join(' ').toLowerCase().includes(query) ||
          track.prompt?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      result = result.filter((track) => track.status === selectedStatus);
    }

    // Sort tracks
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'like_count':
          aValue = a.like_count || 0;
          bValue = b.like_count || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tracks, searchQuery, selectedStatus, sortBy, sortOrder]);

  return {
    viewMode,
    searchQuery,
    sortBy,
    sortOrder,
    selectedStatus,
    filteredTracks,
    availableStatuses,
    setViewMode,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setSelectedStatus,
    toggleSortOrder,
    handleSortChange,
  };
};
