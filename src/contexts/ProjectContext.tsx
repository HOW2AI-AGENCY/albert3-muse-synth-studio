import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Здесь будет запрос к Supabase для получения проектов
      // const { data, error } = await supabase
      //   .from('projects')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('updated_at', { ascending: false });
      
      // if (error) throw error;
      // setProjects(data || []);
      
      // Временная заглушка
      setProjects([]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description?: string): Promise<Project> => {
    if (!user) throw new Error('User not authenticated');

    // Здесь будет создание проекта в Supabase
    // const { data, error } = await supabase
    //   .from('projects')
    //   .insert([{ name, description, user_id: user.id }])
    //   .select()
    //   .single();

    // if (error) throw error;

    // Временная заглушка
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.id,
    };

    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    // Здесь будет обновление проекта в Supabase
    // const { error } = await supabase
    //   .from('projects')
    //   .update(updates)
    //   .eq('id', id);

    // if (error) throw error;

    setProjects(prev => 
      prev.map(project => 
        project.id === id 
          ? { ...project, ...updates, updated_at: new Date().toISOString() }
          : project
      )
    );

    if (currentProject?.id === id) {
      setCurrentProject(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteProject = async (id: string) => {
    // Здесь будет удаление проекта из Supabase
    // const { error } = await supabase
    //   .from('projects')
    //   .delete()
    //   .eq('id', id);

    // if (error) throw error;

    setProjects(prev => prev.filter(project => project.id !== id));
    
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, [user]);

  const value = {
    projects,
    currentProject,
    loading,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    refreshProjects,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}