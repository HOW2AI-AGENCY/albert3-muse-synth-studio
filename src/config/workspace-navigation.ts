import type { LucideIcon } from "lucide-react";
import {
  Home,
  Sparkles,
  Library,
  Heart,
  BarChart3,
  Settings,
  Shield,
  Upload,
  Activity,
  FileText,
  Music,
} from "@/utils/iconImports";
import {
  preloadDashboard,
  preloadGenerate,
  preloadLibrary,
} from "@/utils/lazyImports";

export type WorkspaceNavRole = "admin";

export interface WorkspaceNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  preload?: () => void;
  roles?: WorkspaceNavRole[];
  isMobilePrimary?: boolean;
}

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: "dashboard",
    label: "Главная",
    path: "/workspace/dashboard",
    icon: Home,
    preload: preloadDashboard,
    isMobilePrimary: true,
  },
  {
    id: "generate",
    label: "Генерация",
    path: "/workspace/generate",
    icon: Sparkles,
    preload: preloadGenerate,
    isMobilePrimary: true,
  },
  {
    id: "library",
    label: "Библиотека",
    path: "/workspace/library",
    icon: Library,
    preload: preloadLibrary,
    isMobilePrimary: true,
  },
  {
    id: "settings",
    label: "Настройки",
    path: "/workspace/settings",
    icon: Settings,
    isMobilePrimary: true,
  },
  {
    id: "lyrics-library",
    label: "Лирика",
    path: "/workspace/lyrics-library",
    icon: FileText,
  },
  {
    id: "audio-library",
    label: "Аудио",
    path: "/workspace/audio-library",
    icon: Music,
  },
  {
    id: "upload-audio",
    label: "Загрузить",
    path: "/workspace/upload-audio",
    icon: Upload,
  },
  {
    id: "favorites",
    label: "Избранное",
    path: "/workspace/favorites",
    icon: Heart,
  },
  {
    id: "analytics",
    label: "Аналитика",
    path: "/workspace/analytics",
    icon: BarChart3,
  },
  {
    id: "admin",
    label: "Админ-панель",
    path: "/workspace/admin",
    icon: Shield,
    roles: ["admin"],
  },
  {
    id: "monitoring",
    label: "Мониторинг",
    path: "/workspace/monitoring",
    icon: Activity,
    roles: ["admin"],
  },
];

export const getWorkspaceNavItems = (options?: { isAdmin?: boolean }) => {
  const { isAdmin } = options ?? {};

  return WORKSPACE_NAV_ITEMS.filter((item) => {
    if (!item.roles?.length) {
      return true;
    }

    if (item.roles.includes("admin")) {
      return Boolean(isAdmin);
    }

    return true;
  });
};
