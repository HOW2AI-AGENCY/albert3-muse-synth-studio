import { useState, useCallback } from 'react';
import type { TrackVariant } from '@/features/tracks/types/variant';

export interface UseVariantStateReturn {
  isExpanded: boolean;
  toggleExpanded: () => void;
  deleteDialogOpen: boolean;
  variantToDelete: TrackVariant | null;
  openDeleteDialog: (variant: TrackVariant) => void;
  closeDeleteDialog: () => void;
}

export const useVariantState = (): UseVariantStateReturn => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<TrackVariant | null>(null);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const openDeleteDialog = useCallback((variant: TrackVariant) => {
    setVariantToDelete(variant);
    setDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setVariantToDelete(null);
  }, []);

  return {
    isExpanded,
    toggleExpanded,
    deleteDialogOpen,
    variantToDelete,
    openDeleteDialog,
    closeDeleteDialog,
  };
};
