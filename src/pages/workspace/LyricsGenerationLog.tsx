/**
 * Страница логов генерации текстов песен
 * SPRINT 31: Система просмотра всех сгенерированных текстов
 */
import { useState } from 'react';
import { useLyricsGenerationLog, useLyricsGenerationStats } from '@/hooks/useLyricsGenerationLog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function LyricsGenerationLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: logs, isLoading } = useLyricsGenerationLog();
  const { data: stats } = useLyricsGenerationStats();

  const filteredLogs = logs?.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.prompt.toLowerCase().includes(query) ||
      log.generated_lyrics?.toLowerCase().includes(query) ||
      log.generated_title?.toLowerCase().includes(query)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Завершено</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">Ошибка</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">В процессе</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок и статистика */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Логи генерации текстов</h1>
        <p className="text-muted-foreground">История всех запросов на генерацию текстов песен</p>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Всего запросов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Успешных</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ошибок</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Успешность
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по промпту, тексту или названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Список логов */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLogs && filteredLogs.length > 0 ? (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(log.status)}
                        <CardTitle className="text-base">
                          {log.generated_title || 'Без названия'}
                        </CardTitle>
                        {getStatusBadge(log.status)}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Промпт:</p>
                    <p className="text-sm text-muted-foreground">{log.prompt}</p>
                  </div>

                  {log.status === 'completed' && log.generated_lyrics && (
                    <Tabs defaultValue="preview" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
                        <TabsTrigger value="full">Полный текст</TabsTrigger>
                      </TabsList>
                      <TabsContent value="preview" className="mt-3">
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm whitespace-pre-wrap line-clamp-4">
                            {log.generated_lyrics}
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent value="full" className="mt-3">
                        <ScrollArea className="h-60">
                          <div className="bg-muted/50 p-3 rounded-md">
                            <p className="text-sm whitespace-pre-wrap">
                              {log.generated_lyrics}
                            </p>
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  )}

                  {log.status === 'failed' && log.error_message && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md">
                      <p className="text-sm text-red-500">
                        <span className="font-medium">Ошибка:</span> {log.error_message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Логи не найдены</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Еще не было генераций текстов'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
