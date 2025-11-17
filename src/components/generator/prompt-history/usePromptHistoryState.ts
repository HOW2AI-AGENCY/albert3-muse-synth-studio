import { useState } from 'react';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { toast } from '@/hooks/use-toast';

export const usePromptHistoryState = () => {
  const { history, templates, isLoading, deletePrompt: deleteMutation, saveAsTemplate: saveMutation } = usePromptHistory();
  const [templateName, setTemplateName] = useState('');
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);

  const deletePrompt = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleSaveAsTemplate = async (id: string) => {
    if (!templateName.trim()) {
      toast({
        variant: 'destructive',
        description: 'Введите имя шаблона перед сохранением',
      });
      return;
    }
    saveMutation.mutate({ id, templateName: templateName });
    setTemplateName('');
    setSavingTemplateId(null);
  };

  const handleStartSaveTemplate = (id: string) => {
    setSavingTemplateId(id);
  };

  const handleCancelSaveTemplate = () => {
    setSavingTemplateId(null);
    setTemplateName('');
  };

  return {
    history,
    templates,
    isLoading,
    deletePrompt,
    templateName,
    setTemplateName,
    savingTemplateId,
    handleSaveAsTemplate,
    handleStartSaveTemplate,
    handleCancelSaveTemplate,
  };
};
