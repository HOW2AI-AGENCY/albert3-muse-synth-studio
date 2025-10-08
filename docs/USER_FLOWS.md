# 🔄 Пользовательские потоки (User Flows)

## 🎵 Основные сценарии использования

### 1. Полный цикл создания трека

```mermaid
journey
    title Создание трека от идеи до публикации
    section Подготовка
      Регистрация/Вход: 5: User
      Открыть Generate: 5: User
    section Генерация
      Написать промпт: 4: User
      Улучшить промпт с AI: 5: User, AI
      Выбрать стили: 5: User
      Создать лирику: 4: User, AI
      Запустить генерацию: 5: User
    section Ожидание
      Polling статуса: 3: System
      Получение результата: 5: User, System
    section Пост-обработка
      Прослушать трек: 5: User
      Создать версии: 4: User
      Разделить на стемы: 4: User, AI
      Редактировать метаданные: 3: User
    section Публикация
      Сделать публичным: 5: User
      Поделиться: 5: User
```

---

### 2. Music Generation Flow (Детальный)

```mermaid
flowchart TD
    Start([Пользователь открывает Generate]) --> CheckAuth{Авторизован?}
    
    CheckAuth -->|Нет| Login[Редирект на /auth]
    CheckAuth -->|Да| SelectMode{Выбор режима}
    
    Login --> Auth[Вход/Регистрация]
    Auth --> SelectMode
    
    SelectMode -->|Simple| SimplePrompt[Ввод промпта]
    SelectMode -->|Custom| CustomPrompt[Расширенная форма]
    
    SimplePrompt --> AddStyles[Добавить стили<br/>опционально]
    CustomPrompt --> FillForm[Заполнить все поля:<br/>Промпт, Стили, Лирика]
    
    AddStyles --> ImprovePrompt{Улучшить<br/>промпт?}
    FillForm --> ImprovePrompt
    
    ImprovePrompt -->|Да| CallAI[AI улучшает промпт]
    ImprovePrompt -->|Нет| Validate{Валидация}
    
    CallAI --> ShowImproved[Показать<br/>улучшенный промпт]
    ShowImproved --> Validate
    
    Validate -->|Ошибка| ShowError[Toast: Заполните<br/>обязательные поля]
    Validate -->|OK| Generate[Нажать Generate]
    
    ShowError --> SelectMode
    
    Generate --> CreateRecord[Создать запись<br/>в DB status: pending]
    CreateRecord --> CallSuno[Вызвать Suno AI API]
    CallSuno --> StartPolling[Начать polling<br/>каждые 5 сек]
    
    StartPolling --> CheckStatus{Статус?}
    
    CheckStatus -->|processing| Wait[Ждать 5 сек]
    CheckStatus -->|completed| Success[✅ Трек готов!]
    CheckStatus -->|error| Error[❌ Ошибка генерации]
    
    Wait --> CheckStatus
    
    Success --> ShowTrack[Показать трек<br/>в Library]
    Error --> ShowErrorMsg[Toast: Ошибка]
    
    ShowTrack --> PlayOption{Действия}
    
    PlayOption -->|Play| PlayTrack[Воспроизвести]
    PlayOption -->|Edit| EditMetadata[Редактировать]
    PlayOption -->|Stems| SeparateStems[Разделить на стемы]
    PlayOption -->|Versions| CreateVersion[Создать версию]
    
    PlayTrack --> End([Конец])
    EditMetadata --> End
    SeparateStems --> End
    CreateVersion --> End
    
    ShowErrorMsg --> SelectMode
```

---

### 3. Lyrics Editor Flow (Sprint 19 - NEW)

```mermaid
flowchart TD
    Start([Открыть Lyrics Editor]) --> SelectTab{Выбор режима}
    
    SelectTab -->|AI Generation| AIMode[Режим AI генерации]
    SelectTab -->|Manual| ManualMode[Ручной ввод]
    
    %% AI Generation Path
    AIMode --> SelectLanguage[Выбрать язык<br/>Русский/English]
    SelectLanguage --> StructureForm[Выбрать структуру:<br/>Intro, Verse, Chorus,<br/>Bridge, Outro]
    StructureForm --> VocalStyle[Вокальный стиль:<br/>Male/Female/Duet/Choir]
    VocalStyle --> ThemeMood[Тема и настроение]
    ThemeMood --> References[Референсы<br/>опционально]
    References --> GenerateLyrics[Генерировать лирику]
    
    GenerateLyrics --> CallAI[AI генерирует текст]
    CallAI --> ShowGenerated[Показать результат]
    
    ShowGenerated --> Satisfied{Устраивает?}
    
    Satisfied -->|Нет| ImproveExisting[Кнопка: Улучшить с AI]
    Satisfied -->|Да| SaveLyrics[Сохранить лирику]
    
    ImproveExisting --> CallImproveAI[Edge Function:<br/>improve-lyrics]
    CallImproveAI --> ShowImproved[Показать<br/>улучшенную версию]
    ShowImproved --> Satisfied
    
    %% Manual Mode Path
    ManualMode --> Textarea[Текстовая область]
    Textarea --> TypeLyrics[Написать текст]
    TypeLyrics --> CountStats[Счетчик строк<br/>и символов]
    CountStats --> Preview[Preview режим]
    
    Preview --> ManualSatisfied{Устраивает?}
    
    ManualSatisfied -->|Нет| ImproveManual[Улучшить с AI]
    ManualSatisfied -->|Да| SaveLyrics
    
    ImproveManual --> CallImproveAI
    
    SaveLyrics --> UseLyrics[Использовать<br/>в генерации музыки]
    UseLyrics --> End([Конец])
```

---

### 4. Music Styles Selection (Sprint 19 - NEW)

```mermaid
flowchart TD
    Start([Открыть генератор]) --> ViewStyles[70+ музыкальных стилей]
    
    ViewStyles --> SearchOption{Как выбрать?}
    
    SearchOption -->|Поиск| SearchBar[Поиск по названию]
    SearchOption -->|Категории| AccordionView[Accordion с 8 категориями]
    SearchOption -->|История| RecentStyles[Последние<br/>использованные]
    SearchOption -->|Пресеты| Presets[Preset комбинации]
    
    SearchBar --> FilteredResults[Фильтрованные<br/>результаты]
    FilteredResults --> SelectStyle[Выбрать стиль]
    
    AccordionView --> SelectCategory{Категория}
    
    SelectCategory -->|🎹| Electronic[Электроника:<br/>10 стилей]
    SelectCategory -->|🎸| Rock[Рок:<br/>10 стилей]
    SelectCategory -->|🎤| Pop[Поп:<br/>9 стилей]
    SelectCategory -->|🎧| HipHop[Хип-хоп:<br/>9 стилей]
    SelectCategory -->|🎺| Jazz[Джаз и Блюз:<br/>9 стилей]
    SelectCategory -->|🎻| Classical[Классика:<br/>8 стилей]
    SelectCategory -->|🌍| World[Мировая:<br/>9 стилей]
    SelectCategory -->|🔬| Experimental[Экспериментальная:<br/>8 стилей]
    
    Electronic --> SelectStyle
    Rock --> SelectStyle
    Pop --> SelectStyle
    HipHop --> SelectStyle
    Jazz --> SelectStyle
    Classical --> SelectStyle
    World --> SelectStyle
    Experimental --> SelectStyle
    
    RecentStyles --> RecentList[Последние 10<br/>из localStorage]
    RecentList --> SelectStyle
    
    Presets --> PresetList[Летний хит<br/>Меланхоличный вайб<br/>Энергичная тренировка]
    PresetList --> SelectStyle
    
    SelectStyle --> AddToTags[Добавить в теги]
    AddToTags --> AIRecommend{AI рекомендации?}
    
    AIRecommend -->|Да| CallSuggest[suggest-styles<br/>Edge Function]
    AIRecommend -->|Нет| Continue[Продолжить]
    
    CallSuggest --> ShowSimilar[Показать похожие стили]
    ShowSimilar --> SelectMore{Добавить еще?}
    
    SelectMore -->|Да| SelectStyle
    SelectMore -->|Нет| Continue
    
    Continue --> SaveHistory[Сохранить в историю]
    SaveHistory --> UseInGeneration[Использовать<br/>в генерации]
    UseInGeneration --> End([Конец])
```

---

### 5. Audio Player Flow

```mermaid
stateDiagram-v2
    [*] --> Idle: App loaded
    
    Idle --> LoadingTrack: User clicks track
    LoadingTrack --> Caching: Service Worker checks cache
    
    Caching --> CacheHit: Audio in cache
    Caching --> CacheMiss: Need to fetch
    
    CacheHit --> Playing: Start playback
    CacheMiss --> Fetching: Download from Supabase
    Fetching --> Caching: Store in cache
    
    Playing --> Paused: User pauses
    Paused --> Playing: User resumes
    
    Playing --> NextTrack: User skips or track ends
    NextTrack --> LoadingTrack: Load next in queue
    
    Playing --> VolumeChange: User adjusts volume
    VolumeChange --> Playing: Continue playing
    
    Playing --> SeekTo: User seeks position
    SeekTo --> Playing: Continue from new position
    
    Paused --> [*]: User closes player
    Playing --> [*]: Queue empty
```

---

### 6. Track Stems Separation Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as TrackStemsPanel
    participant API as Supabase Client
    participant EF as separate-stems
    participant Rep as Replicate API
    participant CB as stems-callback
    participant DB as Database
    
    User->>UI: Нажимает "Разделить на стемы"
    UI->>UI: Показывает модал с выбором режима
    
    User->>UI: Выбирает режим (Basic/Detailed)
    UI->>API: invoke('separate-stems', {trackId, mode})
    
    API->>EF: POST request
    EF->>DB: SELECT track WHERE id = trackId
    DB-->>EF: track data
    
    EF->>Rep: POST /predictions
    Note over Rep: Создает задачу<br/>разделения
    Rep-->>EF: prediction_id
    
    EF->>DB: INSERT track_stems<br/>(status: 'processing')
    DB-->>EF: Success
    
    EF-->>API: {success: true, prediction_id}
    API-->>UI: Response
    
    UI->>UI: Показывает статус "Processing..."
    UI->>UI: Начинает polling каждые 3 сек
    
    Note over Rep,CB: 2-5 минут обработки
    
    Rep->>CB: Webhook: POST /stems-callback
    CB->>DB: SELECT track_stems<br/>WHERE suno_task_id = prediction_id
    DB-->>CB: stem records
    
    CB->>DB: UPDATE track_stems<br/>SET audio_urls, status = 'completed'
    DB-->>CB: Success
    
    CB-->>Rep: 200 OK
    
    loop Polling
        UI->>DB: SELECT track_stems WHERE track_id
        DB-->>UI: stems data with status
        
        alt All completed
            UI->>UI: Показывает список стемов<br/>с кнопками Play/Download
            UI->>User: Toast: "Стемы готовы!"
        else Still processing
            UI->>UI: Продолжить polling
        end
    end
    
    User->>UI: Нажимает Play на стеме
    UI->>API: playTrack({stem data})
    Note over UI: Воспроизведение<br/>отдельного инструмента
```

---

### 7. Authentication Flow

```mermaid
flowchart TD
    Start([Пользователь открывает приложение]) --> CheckSession{Есть сессия?}
    
    CheckSession -->|Да| Dashboard[Перейти в Dashboard]
    CheckSession -->|Нет| Landing[Показать Landing Page]
    
    Landing --> AuthChoice{Выбор действия}
    
    AuthChoice -->|Sign Up| SignUpForm[Форма регистрации]
    AuthChoice -->|Log In| LogInForm[Форма входа]
    AuthChoice -->|Continue as Guest| GuestMode[Ограниченный режим<br/>только просмотр публичных треков]
    
    SignUpForm --> FillSignUp[Ввести email и password]
    FillSignUp --> SubmitSignUp[Нажать Sign Up]
    
    SubmitSignUp --> CreateAccount[Supabase Auth:<br/>createUser()]
    CreateAccount --> AutoConfirm{Auto confirm<br/>enabled?}
    
    AutoConfirm -->|Да| CreateProfile[Trigger: handle_new_user<br/>Создать profile]
    AutoConfirm -->|Нет| SendConfirm[Отправить<br/>письмо подтверждения]
    
    SendConfirm --> WaitConfirm[Пользователь<br/>подтверждает email]
    WaitConfirm --> CreateProfile
    
    CreateProfile --> SetSession[Установить session]
    SetSession --> Dashboard
    
    LogInForm --> FillLogIn[Ввести email и password]
    FillLogIn --> SubmitLogIn[Нажать Log In]
    
    SubmitLogIn --> VerifyCredentials[Supabase Auth:<br/>signInWithPassword()]
    
    VerifyCredentials -->|Success| SetSession
    VerifyCredentials -->|Error| ShowError[Toast: Неверные<br/>учетные данные]
    
    ShowError --> LogInForm
    
    GuestMode --> PublicTracks[Просмотр только<br/>публичных треков]
    PublicTracks --> GuestLimitation[Нельзя создавать,<br/>лайкать, комментировать]
    
    Dashboard --> UserActions[Полный доступ<br/>ко всем функциям]
    UserActions --> Logout{Выход?}
    
    Logout -->|Да| SignOut[Supabase Auth:<br/>signOut()]
    SignOut --> Landing
    
    Logout -->|Нет| Continue[Продолжить работу]
```

---

### 8. Error Handling Flow

```mermaid
flowchart TD
    Action([Пользовательское действие]) --> Execute[Выполнение запроса]
    
    Execute --> TryCatch{Try/Catch}
    
    TryCatch -->|Success| UpdateUI[Обновить UI]
    TryCatch -->|Error| CatchError[Поймать ошибку]
    
    UpdateUI --> ShowSuccess[Toast Success<br/>+<br/>Обновить данные]
    ShowSuccess --> LogSuccess[Logger.info<br/>с контекстом]
    
    CatchError --> IdentifyError{Тип ошибки?}
    
    IdentifyError -->|Network| NetworkError[Нет соединения]
    IdentifyError -->|Auth| AuthError[Требуется авторизация]
    IdentifyError -->|Validation| ValidationError[Некорректные данные]
    IdentifyError -->|Server| ServerError[Ошибка сервера]
    IdentifyError -->|Unknown| UnknownError[Неизвестная ошибка]
    
    NetworkError --> ShowNetworkToast[Toast: Проверьте<br/>подключение к интернету]
    AuthError --> RedirectLogin[Редирект на /auth]
    ValidationError --> ShowValidationToast[Toast: Заполните<br/>обязательные поля]
    ServerError --> ShowServerToast[Toast: Попробуйте<br/>позже]
    UnknownError --> ShowGenericToast[Toast: Что-то<br/>пошло не так]
    
    ShowNetworkToast --> LogError[Logger.error<br/>с контекстом]
    RedirectLogin --> LogError
    ShowValidationToast --> LogError
    ShowServerToast --> LogError
    ShowGenericToast --> LogError
    
    LogError --> CheckCritical{Критическая<br/>ошибка?}
    
    CheckCritical -->|Да| SendToServer[Отправить на сервер<br/>для мониторинга]
    CheckCritical -->|Нет| LocalLog[Сохранить локально]
    
    SendToServer --> End([Конец])
    LocalLog --> End
    LogSuccess --> End
```

---

*Обновлено: Sprint 18*  
*Все flows учитывают изменения Sprint 19*
