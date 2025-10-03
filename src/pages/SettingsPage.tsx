import React from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground mt-2">
          Настройте приложение под свои предпочтения
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Внешний вид</CardTitle>
            <CardDescription>
              Настройте тему и внешний вид приложения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Тема</Label>
                <p className="text-sm text-muted-foreground">
                  Выберите светлую или темную тему
                </p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Светлая</SelectItem>
                  <SelectItem value="dark">Темная</SelectItem>
                  <SelectItem value="system">Системная</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Язык</Label>
                <p className="text-sm text-muted-foreground">
                  Выберите язык интерфейса
                </p>
              </div>
              <Select 
                value={settings.language} 
                onValueChange={(value: 'ru' | 'en') => updateSettings({ language: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Генерация музыки</CardTitle>
            <CardDescription>
              Настройки для создания музыки с ИИ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Качество аудио</Label>
                <p className="text-sm text-muted-foreground">
                  Выберите качество генерируемого аудио
                </p>
              </div>
              <Select 
                value={settings.audioQuality} 
                onValueChange={(value: 'low' | 'medium' | 'high') => updateSettings({ audioQuality: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкое</SelectItem>
                  <SelectItem value="medium">Среднее</SelectItem>
                  <SelectItem value="high">Высокое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Провайдер по умолчанию</Label>
                <p className="text-sm text-muted-foreground">
                  Выберите сервис для генерации музыки
                </p>
              </div>
              <Select 
                value={settings.defaultProvider} 
                onValueChange={(value: 'replicate' | 'suno') => updateSettings({ defaultProvider: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suno">Suno AI</SelectItem>
                  <SelectItem value="replicate">Replicate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Максимум одновременных генераций</Label>
                <p className="text-sm text-muted-foreground">
                  Количество треков, генерируемых одновременно
                </p>
              </div>
              <Select 
                value={settings.maxConcurrentGenerations.toString()} 
                onValueChange={(value) => updateSettings({ maxConcurrentGenerations: parseInt(value) })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Общие настройки</CardTitle>
            <CardDescription>
              Основные настройки приложения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автосохранение</Label>
                <p className="text-sm text-muted-foreground">
                  Автоматически сохранять изменения
                </p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={(checked) => updateSettings({ autoSave: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Уведомления</Label>
                <p className="text-sm text-muted-foreground">
                  Получать уведомления о завершении генерации
                </p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => updateSettings({ notifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сброс настроек</CardTitle>
            <CardDescription>
              Вернуть все настройки к значениям по умолчанию
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={resetSettings}>
              Сбросить все настройки
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}