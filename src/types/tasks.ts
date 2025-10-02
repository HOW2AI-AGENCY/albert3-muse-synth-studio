/**
 * Типы и интерфейсы для системы управления задачами
 * Albert3 Muse Synth Studio - Task Management System
 */

// Приоритеты задач
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Статусы задач
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

// Категории задач
export enum TaskCategory {
  DEVELOPMENT = 'development',
  DESIGN = 'design',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment',
  MAINTENANCE = 'maintenance',
  RESEARCH = 'research',
  MEETING = 'meeting'
}

// Типы задач
export enum TaskType {
  FEATURE = 'feature',
  BUG = 'bug',
  IMPROVEMENT = 'improvement',
  REFACTOR = 'refactor',
  HOTFIX = 'hotfix',
  EPIC = 'epic',
  STORY = 'story',
  TASK = 'task'
}

// Основной интерфейс задачи
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  type: TaskType;
  
  // Временные метки
  created_at: string;
  updated_at: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  
  // Связи
  assignee_id?: string;
  creator_id: string;
  project_id?: string;
  parent_task_id?: string;
  
  // Метаданные
  tags: string[];
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage: number;
  
  // Дополнительные поля
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  subtasks?: Task[];
  dependencies?: string[]; // ID зависимых задач
  
  // Аналитика
  view_count: number;
  last_viewed_at?: string;
}

// Вложения к задаче
export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

// Комментарии к задаче
export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  parent_comment_id?: string; // Для ответов на комментарии
}

// Проект (группировка задач)
export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  
  // Временные рамки
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  
  // Участники
  owner_id: string;
  members: ProjectMember[];
  
  // Статистика
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
  
  // Настройки
  is_archived: boolean;
  is_public: boolean;
}

// Участник проекта
export interface ProjectMember {
  user_id: string;
  user_name: string;
  user_email: string;
  role: ProjectRole;
  joined_at: string;
}

// Роли в проекте
export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// Фильтры для задач
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  category?: TaskCategory[];
  type?: TaskType[];
  assignee_id?: string[];
  project_id?: string[];
  tags?: string[];
  due_date_from?: string;
  due_date_to?: string;
  created_date_from?: string;
  created_date_to?: string;
  search_query?: string;
}

// Сортировка задач
export interface TaskSorting {
  field: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title' | 'progress_percentage';
  direction: 'asc' | 'desc';
}

// Пагинация
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// Ответ API со списком задач
export interface TasksResponse {
  tasks: Task[];
  pagination: Pagination;
  filters_applied: TaskFilters;
  sorting: TaskSorting;
}

// Статистика задач
export interface TaskStatistics {
  total_tasks: number;
  tasks_by_status: Record<TaskStatus, number>;
  tasks_by_priority: Record<TaskPriority, number>;
  tasks_by_category: Record<TaskCategory, number>;
  tasks_by_type: Record<TaskType, number>;
  
  // Временная аналитика
  tasks_created_this_week: number;
  tasks_completed_this_week: number;
  average_completion_time: number; // в часах
  overdue_tasks: number;
  
  // Производительность
  completion_rate: number; // процент завершенных задач
  average_progress: number; // средний прогресс по всем задачам
  
  // Тренды
  weekly_completion_trend: number[]; // за последние 12 недель
  monthly_creation_trend: number[]; // за последние 12 месяцев
}

// Уведомления о задачах
export interface TaskNotification {
  id: string;
  user_id: string;
  task_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

// Типы уведомлений
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  TASK_COMMENTED = 'task_commented',
  TASK_MENTIONED = 'task_mentioned',
  DEADLINE_APPROACHING = 'deadline_approaching'
}

// Шаблон задачи
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  category: TaskCategory;
  type: TaskType;
  priority: TaskPriority;
  estimated_hours?: number;
  tags: string[];
  checklist?: TaskChecklistItem[];
  created_by: string;
  created_at: string;
  usage_count: number;
}

// Элемент чек-листа
export interface TaskChecklistItem {
  id: string;
  text: string;
  is_completed: boolean;
  order: number;
}

// Временные метки для задач
export interface TaskTimeTracking {
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes: number;
  description?: string;
  created_at: string;
}

// Настройки пользователя для задач
export interface UserTaskSettings {
  user_id: string;
  default_view: 'list' | 'board' | 'calendar' | 'timeline';
  default_filters: TaskFilters;
  default_sorting: TaskSorting;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  daily_digest: boolean;
  weekly_report: boolean;
}

// Экспорт данных
export interface TaskExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  include_comments: boolean;
  include_attachments: boolean;
  include_time_tracking: boolean;
  date_range?: {
    from: string;
    to: string;
  };
  filters?: TaskFilters;
}

// Импорт данных
export interface TaskImportResult {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors: string[];
  warnings: string[];
}

// Интеграции с внешними сервисами
export interface TaskIntegration {
  id: string;
  name: string;
  type: 'github' | 'jira' | 'trello' | 'asana' | 'slack';
  config: Record<string, any>;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
}

// Автоматизация задач
export interface TaskAutomation {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  last_executed_at?: string;
  execution_count: number;
}

// Триггеры автоматизации
export interface AutomationTrigger {
  type: 'status_changed' | 'priority_changed' | 'due_date_approaching' | 'task_created' | 'task_assigned';
  config: Record<string, any>;
}

// Условия автоматизации
export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

// Действия автоматизации
export interface AutomationAction {
  type: 'update_field' | 'send_notification' | 'create_subtask' | 'assign_user' | 'add_comment';
  config: Record<string, any>;
}

// Отчеты
export interface TaskReport {
  id: string;
  name: string;
  type: 'productivity' | 'completion_rate' | 'time_tracking' | 'workload' | 'custom';
  parameters: Record<string, any>;
  schedule?: ReportSchedule;
  recipients: string[];
  created_by: string;
  created_at: string;
  last_generated_at?: string;
}

// Расписание отчетов
export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  day_of_week?: number; // для еженедельных
  day_of_month?: number; // для ежемесячных
  time: string; // HH:MM
  timezone: string;
}

// API ошибки
export interface TaskError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Успешный ответ API
export interface TaskApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: TaskError;
  meta?: {
    pagination?: Pagination;
    filters?: TaskFilters;
    sorting?: TaskSorting;
  };
}