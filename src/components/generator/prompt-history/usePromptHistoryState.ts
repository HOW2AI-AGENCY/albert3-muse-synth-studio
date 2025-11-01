import { useState } from 'react';
import { usePromptHistory } from '@/hooks/usePromptHistory';

export const usePromptHistoryState = () => {
  const { history, templates, isLoading, deletePrompt, saveAsTemplate } = usePromptHistory();
  const [templateName, setTemplateName] = useState('');
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);

  const handleSaveAsTemplate = async (id: string) => {
    if (!templateName.trim()) return;
    await saveAsTemplate({ id, template_name: templateName });
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
