/**
 * Shared Card Actions Hook
 * Sprint 31 - Week 2: Code Quality & Refactoring
 * Task 2.1: Extract shared components
 */

import { useCallback } from 'react';
import { toast } from 'sonner';

interface UseCardActionsProps {
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  onDelete?: (id: string) => void;
  onCopy?: (content: string) => void;
  onDownload?: (url: string, filename: string) => void;
  deleteConfirmMessage?: string;
}

export const useCardActions = ({
  onToggleFavorite,
  onDelete,
  onCopy,
  onDownload,
  deleteConfirmMessage = 'Вы уверены, что хотите удалить этот элемент?',
}: UseCardActionsProps = {}) => {
  const handleToggleFavorite = useCallback((e: React.MouseEvent, id: string, isFavorite: boolean) => {
    e.stopPropagation();
    onToggleFavorite?.(id, isFavorite);
  }, [onToggleFavorite]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(deleteConfirmMessage)) {
      onDelete?.(id);
    }
  }, [onDelete, deleteConfirmMessage]);

  const handleCopy = useCallback((e: React.MouseEvent, content: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    toast.success('Скопировано в буфер обмена');
    onCopy?.(content);
  }, [onCopy]);

  const handleDownload = useCallback((e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    toast.success('Загрузка началась');
    onDownload?.(url, filename);
  }, [onDownload]);

  return {
    handleToggleFavorite,
    handleDelete,
    handleCopy,
    handleDownload,
  };
};
