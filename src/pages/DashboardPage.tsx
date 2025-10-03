import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Music, Headphones, Mic } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { projects, createProject } = useProject();

  const handleCreateProject = async () => {
    try {
      await createProject('Новый проект', 'Описание проекта');
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Добро пожаловать, {user?.email}</h1>
          <p className="text-muted-foreground mt-2">
            Создавайте удивительную музыку с помощью ИИ
          </p>
        </div>
        <Button onClick={handleCreateProject} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Новый проект
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Генерация музыки
            </CardTitle>
            <CardDescription>
              Создавайте оригинальные треки с помощью ИИ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Начать создание
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Текст песни
            </CardTitle>
            <CardDescription>
              Генерируйте тексты для ваших композиций
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Создать текст
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              Мои треки
            </CardTitle>
            <CardDescription>
              Управляйте своей музыкальной коллекцией
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Открыть библиотеку
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Ваши проекты</h2>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                У вас пока нет проектов. Создайте свой первый проект!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Открыть проект
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}