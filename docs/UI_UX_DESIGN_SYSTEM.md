# 🎨 UI/UX Дизайн система и паттерны

## 🎯 Дизайн-система

### Цветовая палитра

```mermaid
graph LR
    subgraph "Primary Colors"
        P1[Primary<br/>Основной акцент]
        P2[Primary Variant<br/>Светлый вариант]
        P3[Primary Glow<br/>Эффект свечения]
    end
    
    subgraph "Semantic Colors"
        S1[Success<br/>Успешные действия]
        S2[Warning<br/>Предупреждения]
        S3[Error<br/>Ошибки]
        S4[Info<br/>Информация]
    end
    
    subgraph "Neutral Colors"
        N1[Background<br/>Фон]
        N2[Foreground<br/>Текст]
        N3[Muted<br/>Приглушенный]
        N4[Border<br/>Границы]
    end
    
    style "Primary Colors" fill:#818cf8
    style "Semantic Colors" fill:#34d399
    style "Neutral Colors" fill:#94a3b8
```

### Типографика

```mermaid
graph TB
    subgraph "Заголовки"
        H1[h1 - 2.5rem<br/>Page titles]
        H2[h2 - 2rem<br/>Section headers]
        H3[h3 - 1.5rem<br/>Subsections]
        H4[h4 - 1.25rem<br/>Card titles]
    end
    
    subgraph "Тексты"
        Body[body - 1rem<br/>Main text]
        Small[small - 0.875rem<br/>Captions]
        Tiny[tiny - 0.75rem<br/>Labels]
    end
    
    subgraph "Специальные"
        Code[code - Monospace<br/>Code snippets]
        Quote[blockquote<br/>Цитаты]
    end
```

---

## 🎨 UI Компоненты

### Иерархия компонентов

```mermaid
graph TB
    subgraph "Atoms - Базовые элементы"
        Button[Button]
        Input[Input]
        Badge[Badge]
        Icon[Icon]
    end
    
    subgraph "Molecules - Простые блоки"
        SearchBar[SearchBar<br/>Input + Icon]
        FormField[FormField<br/>Label + Input]
        MenuItem[MenuItem<br/>Icon + Text]
    end
    
    subgraph "Organisms - Сложные блоки"
        Header[Header<br/>Logo + Search + Profile]
        Sidebar[Sidebar<br/>Navigation Menu]
        TrackCard[TrackCard<br/>Image + Info + Actions]
    end
    
    subgraph "Templates - Шаблоны страниц"
        DashboardTemplate[Dashboard Template]
        LibraryTemplate[Library Template]
        GenerateTemplate[Generate Template]
    end
    
    Button --> SearchBar
    Input --> SearchBar
    Icon --> SearchBar
    
    SearchBar --> Header
    MenuItem --> Sidebar
    
    TrackCard --> LibraryTemplate
    Header --> DashboardTemplate
    Sidebar --> DashboardTemplate
```

---

## 📱 Адаптивный дизайн

### Breakpoints

```mermaid
graph LR
    subgraph "Mobile First Approach"
        M[Mobile<br/>< 768px<br/>Single column]
        T[Tablet<br/>768-1024px<br/>Flexible grid]
        D[Desktop<br/>> 1024px<br/>Multi-column]
        XL[XL Desktop<br/>> 1440px<br/>Max width]
    end
    
    M -->|Expand| T
    T -->|Expand| D
    D -->|Expand| XL
    
    style M fill:#fef3c7
    style T fill:#ddd6fe
    style D fill:#bfdbfe
    style XL fill:#d1fae5
```

### Компонентная адаптация

```mermaid
graph TB
    subgraph "Desktop"
        D1[WorkspaceHeader - Full]
        D2[MinimalSidebar - Expanded]
        D3[TrackCard - Grid 3-4 columns]
        D4[DetailPanel - Side drawer]
    end
    
    subgraph "Tablet"
        T1[WorkspaceHeader - Compact]
        T2[MinimalSidebar - Collapsed]
        T3[TrackCard - Grid 2-3 columns]
        T4[DetailPanel - Bottom sheet]
    end
    
    subgraph "Mobile"
        M1[MobileNavigation - Hamburger]
        M2[BottomTabBar - Fixed bottom]
        M3[TrackCard - List/Grid 1-2 columns]
        M4[DetailPanel - Full screen]
    end
    
    style Desktop fill:#bfdbfe
    style Tablet fill:#ddd6fe
    style Mobile fill:#fef3c7
```

---

## 🎭 UI Паттерны

### Loading States

```mermaid
stateDiagram-v2
    [*] --> Idle: Компонент загружен
    Idle --> Loading: Начало запроса
    Loading --> Success: Данные получены
    Loading --> Error: Ошибка запроса
    Success --> Idle: Новый запрос
    Error --> Idle: Повторить
    
    Loading: Показать Skeleton
    Success: Отобразить данные
    Error: Показать сообщение об ошибке
```

### Toast Notifications Flow

```mermaid
graph TB
    Action[User Action]
    
    Action --> Success{Успешно?}
    
    Success -->|Да| SuccessToast[Toast Success<br/>Зеленый, 3 сек]
    Success -->|Нет| ErrorToast[Toast Error<br/>Красный, 5 сек]
    Success -->|Предупреждение| WarningToast[Toast Warning<br/>Желтый, 4 сек]
    
    SuccessToast --> AutoDismiss[Auto dismiss]
    ErrorToast --> ManualDismiss[Manual dismiss]
    WarningToast --> AutoDismiss
    
    style SuccessToast fill:#86efac
    style ErrorToast fill:#fca5a5
    style WarningToast fill:#fcd34d
```

### Modal/Dialog Patterns

```mermaid
graph LR
    Trigger[Button/Action]
    
    Trigger --> Desktop{Device?}
    
    Desktop -->|Desktop| Dialog[Dialog<br/>Center overlay<br/>Max width 600px]
    Desktop -->|Mobile| Sheet[Sheet<br/>Bottom slide-up<br/>Full width]
    
    Dialog --> Backdrop[Backdrop Overlay<br/>Close on click outside]
    Sheet --> Backdrop
    
    Backdrop --> Close[Close<br/>Return to previous state]
```

---

## 🎯 Tooltips система (Sprint 19)

### Tooltip Architecture

```mermaid
graph TB
    subgraph "Компоненты с tooltips"
        MG[MusicGenerator<br/>20 tooltips]
        DP[DetailPanel<br/>15 tooltips]
        Player[Player Controls<br/>10 tooltips]
        Library[Library Actions<br/>5 tooltips]
    end
    
    subgraph "Tooltip Behavior"
        Delay[Delay: 500ms]
        Position[Position: Auto<br/>Fallback positions]
        Mobile[Mobile: Touch to show<br/>Tap outside to hide]
        Desktop[Desktop: Hover<br/>Mouse leave to hide]
    end
    
    MG --> Delay
    DP --> Delay
    Player --> Delay
    Library --> Delay
    
    Delay --> Position
    Position --> Mobile
    Position --> Desktop
```

### Tooltip содержание

| Элемент | Tooltip текст (RU) | Цель |
|---------|-------------------|------|
| Provider selector | "Выберите AI провайдер для генерации музыки" | Объяснить выбор |
| Improve Prompt | "Улучшить промпт с помощью AI для лучших результатов" | Мотивировать использование |
| Has Vocals toggle | "Включить вокал в трек" | Простое объяснение |
| Generate button | "Генерация займет 2-5 минут" | Установить ожидания |
| Like button | "Добавить в избранное" | Действие |
| Share button | "Поделиться публичной ссылкой" | Действие |

---

## 🌈 Анимации и переходы

### Animation Patterns

```mermaid
graph LR
    subgraph "Entrance Animations"
        FadeIn[Fade In<br/>Opacity 0 → 1]
        SlideUp[Slide Up<br/>translateY +20px → 0]
        ScaleIn[Scale In<br/>scale 0.9 → 1]
    end
    
    subgraph "Exit Animations"
        FadeOut[Fade Out<br/>Opacity 1 → 0]
        SlideDown[Slide Down<br/>translateY 0 → +20px]
        ScaleOut[Scale Out<br/>scale 1 → 0.9]
    end
    
    subgraph "Interaction"
        Hover[Hover<br/>Scale 1.05<br/>Shadow increase]
        Active[Active<br/>Scale 0.98]
        Focus[Focus<br/>Ring outline]
    end
    
    style "Entrance Animations" fill:#86efac
    style "Exit Animations" fill:#fca5a5
    style Interaction fill:#93c5fd
```

### Transition Timing

```css
/* Smooth transitions */
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Fast interactions */
--transition-fast: all 0.15s ease-in-out;

/* Slow emphasis */
--transition-slow: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🎨 Themed Components

### Light/Dark Mode

```mermaid
graph TB
    subgraph "Light Mode"
        L1[Background: white]
        L2[Text: gray-900]
        L3[Border: gray-200]
        L4[Shadow: subtle]
    end
    
    subgraph "Dark Mode"
        D1[Background: gray-900]
        D2[Text: gray-100]
        D3[Border: gray-700]
        D4[Shadow: strong]
    end
    
    subgraph "Theme Toggle"
        Toggle[Theme Switch<br/>localStorage persistence]
    end
    
    Toggle --> L1
    Toggle --> D1
    
    style "Light Mode" fill:#f3f4f6
    style "Dark Mode" fill:#1f2937
    style "Theme Toggle" fill:#818cf8
```

---

## 📊 Data Visualization

### Track Stats Display

```mermaid
graph LR
    subgraph "Metrics"
        Plays[▶️ Plays<br/>Counter + Icon]
        Likes[❤️ Likes<br/>Counter + Icon]
        Downloads[⬇️ Downloads<br/>Counter + Icon]
        Views[👁️ Views<br/>Counter + Icon]
    end
    
    subgraph "Visualization"
        ProgressBar[Progress Bar<br/>Generation progress]
        Waveform[Waveform<br/>Audio visualization]
        Badge[Status Badge<br/>pending/processing/completed]
    end
    
    style Metrics fill:#ddd6fe
    style Visualization fill:#bfdbfe
```

---

## ✨ Микровзаимодействия

### Button States

```mermaid
stateDiagram-v2
    [*] --> Default
    Default --> Hover: Mouse enter
    Hover --> Active: Mouse down
    Active --> Loading: Async action
    Loading --> Success: Action complete
    Loading --> Error: Action failed
    Success --> Default: Auto transition
    Error --> Default: User dismiss
    
    Default: bg-primary
    Hover: bg-primary-dark + scale(1.02)
    Active: bg-primary-darker + scale(0.98)
    Loading: Spinner + disabled
    Success: Checkmark animation
    Error: Shake animation
```

---

*Обновлено: Sprint 18*  
*Дизайн-система: Tailwind CSS + shadcn/ui*
