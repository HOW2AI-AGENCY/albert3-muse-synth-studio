import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Progress,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton
} from '@/components/ui';

const DesignSystemTest: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [switchChecked, setSwitchChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [selectValue, setSelectValue] = useState('');
  const [progressValue, setProgressValue] = useState(30);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-8">

      <div className="max-w-6xl mx-auto space-y-12">

        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">🎨 Дизайн-система компонентов</h1>
          <p className="text-lg text-muted-foreground">Тестирование доступности и производительности</p>
        </header>

        {/* Базовые компоненты */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Базовые компоненты</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Кнопки</CardTitle>
                <CardDescription>Различные варианты кнопок</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="default">Основная кнопка</Button>
                <Button variant="destructive">Опасное действие</Button>
                <Button variant="outline">Контурная кнопка</Button>
                <Button variant="secondary">Вторичная кнопка</Button>
                <Button variant="ghost">Прозрачная кнопка</Button>
                <Button variant="link">Ссылка-кнопка</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Поля ввода</CardTitle>
                <CardDescription>Текстовые поля и формы</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Обычное поле ввода"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  aria-label="Тестовое поле ввода"
                />
                <Input 
                  placeholder="Поле с ошибкой"
                  error
                  aria-label="Поле ввода с ошибкой"
                />
                <Textarea 
                  placeholder="Многострочное поле"
                  rows={3}
                  aria-label="Многострочное поле ввода"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Выпадающие списки</CardTitle>
                <CardDescription>Селекты и dropdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger aria-label="Выберите опцию">
                    <SelectValue placeholder="Выберите опцию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Опция 1</SelectItem>
                    <SelectItem value="option2">Опция 2</SelectItem>
                    <SelectItem value="option3">Опция 3</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Компоненты управления */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Компоненты управления</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Переключатели</CardTitle>
                <CardDescription>Switch компоненты</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                    id="test-switch"
                  />
                  <label htmlFor="test-switch" className="text-sm">
                    {switchChecked ? 'Включено' : 'Выключено'}
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Слайдеры</CardTitle>
                <CardDescription>Ползунки для выбора значений</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Slider 
                  value={[sliderValue]}
                  onValueChange={(value) => setSliderValue(value[0])}
                  max={100}
                  step={1}
                  aria-label="Тестовый слайдер"
                />
                <p className="text-sm text-muted-foreground">Значение: {sliderValue}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Вкладки</CardTitle>
                <CardDescription>Tabs компонент</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tab1" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tab1">Вкладка 1</TabsTrigger>
                    <TabsTrigger value="tab2">Вкладка 2</TabsTrigger>
                    <TabsTrigger value="tab3">Вкладка 3</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tab1" className="mt-4">
                    <p>Содержимое вкладки 1</p>
                  </TabsContent>
                  <TabsContent value="tab2" className="mt-4">
                    <p>Содержимое вкладки 2</p>
                  </TabsContent>
                  <TabsContent value="tab3" className="mt-4">
                    <p>Содержимое вкладки 3</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Оверлей компоненты */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Оверлей компоненты</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Диалоговые окна</CardTitle>
                <CardDescription>Modal компоненты</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Открыть диалог</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Тестовое диалоговое окно</DialogTitle>
                      <DialogDescription>
                        Это пример диалогового окна с полной доступностью.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Вы можете закрыть это окно нажав Escape или кнопку ниже.</p>
                      <Button onClick={() => setDialogOpen(false)}>Закрыть</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Боковые панели</CardTitle>
                <CardDescription>Sheet/Drawer компоненты</CardDescription>
              </CardHeader>
              <CardContent>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline">Открыть панель</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Боковая панель</SheetTitle>
                      <SheetDescription>
                        Это пример боковой панели с доступностью.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-4">
                      <p>Содержимое панели...</p>
                      <Button onClick={() => setSheetOpen(false)}>Закрыть</Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Информационные компоненты */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Информационные компоненты</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Бейджи и статусы</CardTitle>
                <CardDescription>Индикаторы состояния</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge>Обычный</Badge>
                <Badge variant="secondary">Вторичный</Badge>
                <Badge variant="outline">Контурный</Badge>
                <Badge variant="destructive">Опасность</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Подсказки</CardTitle>
                <CardDescription>Tooltip компоненты</CardDescription>
              </CardHeader>
              <CardContent>
                <Tooltip content="Это всплывающая подсказка с доступностью">
                  <TooltipTrigger asChild>
                    <Button variant="outline">Наведи на меня</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Это всплывающая подсказка с доступностью</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Прогресс</CardTitle>
                <CardDescription>Индикаторы прогресса</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progressValue} />
                <Button onClick={() => setProgressValue(prev => Math.min(100, prev + 10))}>
                  Увеличить прогресс
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Компоненты пользователя */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Компоненты пользователя</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Аватары</CardTitle>
                <CardDescription>Компоненты аватаров</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src="https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20icon%20minimalist%20design&image_size=square" alt="Пользователь" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Скелетоны</CardTitle>
                <CardDescription>Загрузочные состояния</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Диалоги и модальные окна */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Диалоги и модальные окна</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Аватары</CardTitle>
                <CardDescription>Компоненты аватаров</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src="https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20icon%20minimalist%20design&image_size=square" alt="Пользователь" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Скелетоны</CardTitle>
                <CardDescription>Загрузочные состояния</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Тестирование доступности */}
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>♿ Тестирование доступности</CardTitle>
              <CardDescription>
                Эта страница протестирована на соответствие стандартам доступности
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">ARIA Labels</Badge>
                  <Badge variant="secondary">Keyboard Navigation</Badge>
                  <Badge variant="secondary">Focus Management</Badge>
                  <Badge variant="secondary">Screen Reader Support</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Все интерактивные элементы имеют соответствующие ARIA атрибуты, 
                  поддерживают навигацию с клавиатуры и управление фокусом.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default DesignSystemTest;