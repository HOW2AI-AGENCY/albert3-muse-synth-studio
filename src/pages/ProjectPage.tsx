import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Download, Share } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { projects } = useProject();
  
  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Проект не найден</h1>
          <Link to="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к дашборду
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Поделиться
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Треки проекта</CardTitle>
              <CardDescription>
                Управляйте треками в вашем проекте
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  В проекте пока нет треков
                </p>
                <Button>
                  Создать первый трек
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Настройки проекта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название проекта</label>
                <input 
                  type="text" 
                  value={project.name}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium">Описание</label>
                <textarea 
                  value={project.description || ''}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  rows={3}
                  readOnly
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start">
                <Play className="w-4 h-4 mr-2" />
                Создать трек
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Импорт аудио
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Настройки проекта
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Треков:</span>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Создан:</span>
                <span className="text-sm font-medium">
                  {new Date(project.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Обновлен:</span>
                <span className="text-sm font-medium">
                  {new Date(project.updated_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}