import type { LucideIcon } from "lucide-react";
import {
  Home,
  Sparkles,
  Library,
  Heart,
  BarChart3,
  Settings,
  Shield,
  Activity,
  FileText,
  Music,
  Folder,
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
  children?: WorkspaceNavItem[];
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
    label: "Создать",
    path: "/workspace/generate",
    icon: Sparkles,
    preload: preloadGenerate,
    isMobilePrimary: true,
  },
  {
    id: "library",
    label: "Треки",
    path: "/workspace/library",
    icon: Library,
    preload: preloadLibrary,
    isMobilePrimary: true,
  },
  {
    id: "media",
    label: "Медиа",
    path: "/workspace/media",
    icon: Folder,
    isMobilePrimary: true,
    children: [
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
    ],
  },
  {
    id: "favorites",
    label: "Избранное",
    path: "/workspace/favorites",
    icon: Heart,
  },
  {
    id: "settings",
    label: "Настройки",
    path: "/workspace/settings",
    icon: Settings,
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
  }).map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => {
          if (!child.roles?.length) return true;
          if (child.roles.includes("admin")) return Boolean(isAdmin);
          return true;
        }),
      };
    }
    return item;
  });
};
