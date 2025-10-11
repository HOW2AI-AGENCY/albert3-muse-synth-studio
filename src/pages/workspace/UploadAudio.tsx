import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadExtendDialog } from '@/components/tracks/UploadExtendDialog';
import { AddInstrumentalDialog } from '@/components/tracks/AddInstrumentalDialog';
import { Button } from '@/components/ui/button';
import { Upload, Wand2 } from 'lucide-react';

export default function UploadAudio() {
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [instrumentalDialogOpen, setInstrumentalDialogOpen] = useState(false);

  return (
    <PageContainer>
      <PageHeader
        title="Загрузка и обработка аудио"
        description="Расширяйте треки или добавляйте инструментал к вокалу"
      />

      <div className="max-w-4xl mx-auto py-8">
        <Tabs defaultValue="extend" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="extend">Расширить аудио</TabsTrigger>
            <TabsTrigger value="instrumental">Добавить инструментал</TabsTrigger>
          </TabsList>

          <TabsContent value="extend" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Расширить аудио трек
                </CardTitle>
                <CardDescription>
                  Загрузите аудиофайл и создайте его расширенную версию с сохранением стиля
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Поддержка файлов до 2 минут</li>
                  <li>Сохранение оригинального стиля</li>
                  <li>Настраиваемая точка продолжения</li>
                  <li>Режим с вокалом или инструментал</li>
                </ul>
                <Button onClick={() => setExtendDialogOpen(true)} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Загрузить и расширить
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instrumental" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Добавить инструментал
                </CardTitle>
                <CardDescription>
                  Загрузите вокальный трек и сгенерируйте для него инструментальное сопровождение
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Автоматическое создание аранжировки</li>
                  <li>Настройка стилей и жанров</li>
                  <li>Исключение нежелательных элементов</li>
                  <li>Высокое качество AI-генерации</li>
                </ul>
                <Button onClick={() => setInstrumentalDialogOpen(true)} className="w-full">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Создать инструментал
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <UploadExtendDialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        onSuccess={() => {
          // Можно добавить навигацию к библиотеке
        }}
      />

      <AddInstrumentalDialog
        open={instrumentalDialogOpen}
        onOpenChange={setInstrumentalDialogOpen}
        onSuccess={() => {
          // Можно добавить навигацию к библиотеке
        }}
      />
    </PageContainer>
  );
}
