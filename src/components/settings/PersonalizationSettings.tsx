import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useUserPreferences, AccentColor, DensityMode } from '@/hooks/useUserPreferences';
import { Check } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

const accentColors: Array<{ value: AccentColor; label: string; preview: string }> = [
  { value: 'purple', label: 'Фиолетовый', preview: 'bg-[hsl(271,91%,65%)]' },
  { value: 'blue', label: 'Синий', preview: 'bg-[hsl(221,83%,53%)]' },
  { value: 'green', label: 'Зелёный', preview: 'bg-[hsl(142,71%,45%)]' },
  { value: 'pink', label: 'Розовый', preview: 'bg-[hsl(330,81%,60%)]' },
];

const densityModes: Array<{ value: DensityMode; label: string; description: string }> = [
  { value: 'compact', label: 'Компактный', description: 'Больше контента на экране' },
  { value: 'comfortable', label: 'Комфортный', description: 'Сбалансированный вид (по умолчанию)' },
  { value: 'spacious', label: 'Просторный', description: 'Больше пространства, лучше читаемость' },
];

/**
 * Компонент настроек персонализации
 * Позволяет выбрать accent color и density mode
 */
const PersonalizationSettings = () => {
  const { preferences, setAccentColor, setDensityMode, resetPreferences } = useUserPreferences();

  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle>Акцентный цвет</CardTitle>
          <CardDescription>
            Выберите цветовую схему для интерфейса
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {accentColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  'hover:border-primary/50',
                  preferences.accentColor === color.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <div className={cn('w-12 h-12 rounded-full', color.preview)} />
                <span className="text-sm font-medium">{color.label}</span>
                {preferences.accentColor === color.value && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="h-5 w-5 p-0 rounded-full">
                      <Check className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Density Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Плотность интерфейса</CardTitle>
          <CardDescription>
            Настройте количество пространства между элементами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.densityMode}
            onValueChange={(value) => setDensityMode(value as DensityMode)}
            className="space-y-3"
          >
            {densityModes.map((mode) => (
              <div
                key={mode.value}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer',
                  'hover:border-primary/50',
                  preferences.densityMode === mode.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
                <Label htmlFor={mode.value} className="flex-1 cursor-pointer">
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {mode.description}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Card>
        <CardHeader>
          <CardTitle>Сброс настроек</CardTitle>
          <CardDescription>
            Вернуть все настройки персонализации к значениям по умолчанию
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={resetPreferences}
            className="text-sm text-destructive hover:underline"
          >
            Сбросить настройки
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalizationSettings;
