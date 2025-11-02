/**
 * Project Context Provider
 * Manages global project state across the application
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];
type ProjectInsert = Database['public']['Tables']['music_projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['music_projects']['Update'];

interface ProjectContextValue {
  selectedProject: MusicProject | null;
  setSelectedProject: (project: MusicProject | null) => void;
  projects: MusicProject[];
  isLoading: boolean;
  createProject: (params: ProjectInsert) => Promise<MusicProject | null>;
  updateProject: (id: string, params: ProjectUpdate) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<MusicProject | null>(null);
  const [projects, setProjects] = useState<MusicProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from('music_projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      logger.info('Projects refreshed', 'ProjectContext', { count: data?.length || 0 });
    } catch (error) {
      logger.error('Failed to refresh projects', error as Error, 'ProjectContext');
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить проекты',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createProject = useCallback(async (params: ProjectInsert): Promise<MusicProject | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Требуется авторизация',
          description: 'Войдите в систему для создания проектов',
          variant: 'destructive',
        });
        return null;
      }

      const { data, error } = await supabase
        .from('music_projects')
        .insert({ ...params, user_id: session.user.id })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '✅ Проект создан',
        description: `"${data.name}" успешно создан`,
      });

      await refreshProjects();
      logger.info('Project created', 'ProjectContext', { projectId: data.id, name: data.name });

      return data;
    } catch (error) {
      logger.error('Failed to create project', error as Error, 'ProjectContext');
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать проект',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, refreshProjects]);

  const updateProject = useCallback(async (id: string, params: ProjectUpdate) => {
    try {
      const { error } = await supabase
        .from('music_projects')
        .update(params)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: '✅ Проект обновлен',
        description: 'Изменения сохранены',
      });

      await refreshProjects();
      logger.info('Project updated', 'ProjectContext', { projectId: id });
    } catch (error) {
      logger.error('Failed to update project', error as Error, 'ProjectContext', { projectId: id });
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить проект',
        variant: 'destructive',
      });
    }
  }, [toast, refreshProjects]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('music_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: '✅ Проект удален',
        description: 'Проект успешно удален',
      });

      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }

      await refreshProjects();
      logger.info('Project deleted', 'ProjectContext', { projectId: id });
    } catch (error) {
      logger.error('Failed to delete project', error as Error, 'ProjectContext', { projectId: id });
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить проект',
        variant: 'destructive',
      });
    }
  }, [toast, refreshProjects, selectedProject]);

  // Load projects on mount
  React.useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        projects,
        isLoading,
        createProject,
        updateProject,
        deleteProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
