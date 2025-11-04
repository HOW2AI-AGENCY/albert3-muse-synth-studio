import type { LucideIcon } from "lucide-react";
import {
  Home,
  Sparkles,
  Library,
  Heart,
  BarChart3,
  Settings,
  Wand2,
  Headphones,
} from "@/utils/iconImports";
import {
  preloadDashboard,
  preloadGenerate,
  preloadProjects,
  preloadMonitoringHub,
  preloadStudio,
  preloadDAW,
  preloadFavorites,
  preloadSettings,
  preloadPromptDJPage,
} from "@/utils/lazyPages";

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
    id: "projects",
    label: "Проекты",
    path: "/workspace/projects",
    icon: Library,
    preload: () => { void preloadProjects(); },
    isMobilePrimary: true,
  },
  {
    id: "prompt-dj",
    label: "Prompt DJ",
    path: "/workspace/prompt-dj",
    icon: Wand2,
    preload: () => { void preloadPromptDJPage(); },
    isMobilePrimary: true,
  },
  {
    id: "studio",
    label: "Studio",
    path: "/workspace/studio",
    icon: Headphones,
    preload: () => { void preloadStudio(); },
    isMobilePrimary: true,
  },
  {
    id: "daw",
    label: "DAW",
    path: "/workspace/daw",
    icon: Headphones,
    preload: () => { void preloadDAW(); },
    isMobilePrimary: true,
  },
  {
    id: "favorites",
    label: "Избранное",
    path: "/workspace/favorites",
    icon: Heart,
    preload: () => { void preloadFavorites(); },
  },
  {
    id: "monitoring-hub",
    label: "Мониторинг",
    path: "/workspace/monitoring-hub",
    icon: BarChart3,
    preload: () => { void preloadMonitoringHub(); },
  },
  {
    id: "settings",
    label: "Настройки",
    path: "/workspace/settings",
    icon: Settings,
    preload: () => { void preloadSettings(); },
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
