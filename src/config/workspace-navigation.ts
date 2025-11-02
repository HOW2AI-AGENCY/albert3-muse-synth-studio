import type { LucideIcon } from "lucide-react";
import {
  Home,
  Sparkles,
  Folder,
  Cloud,
  Heart,
  Settings,
  Shield,
} from "@/utils/iconImports";

// Preload functions
const preloadDashboard = () => import("@/pages/workspace/Dashboard");
const preloadGenerate = () => import("@/pages/workspace/Generate");
const preloadProjects = () => import("@/pages/workspace/Projects");
const preloadCloud = () => import("@/pages/workspace/Cloud");

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
    icon: Folder,
    preload: preloadProjects,
    isMobilePrimary: true,
  },
  {
    id: "cloud",
    label: "Облако",
    path: "/workspace/cloud",
    icon: Cloud,
    preload: preloadCloud,
    isMobilePrimary: true,
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
    id: "admin",
    label: "Админ-панель",
    path: "/workspace/admin",
    icon: Shield,
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
