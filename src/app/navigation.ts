import {
  Bot,
  Box,
  FolderKanban,
  Home,
  type LucideIcon,
  MessageCircle,
  PlayCircle,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

export type AppRoute =
  | "command-center"
  | "projects"
  | "runs"
  | "workbench"
  | "agents"
  | "models"
  | "extensions"
  | "settings";

export interface NavigationItem {
  id: AppRoute;
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    id: "command-center",
    label: "Command Center",
    description: "Workspace overview",
    icon: Home,
    enabled: true,
  },
  {
    id: "projects",
    label: "Projects",
    description: "Connected local work",
    icon: FolderKanban,
    enabled: true,
  },
  {
    id: "runs",
    label: "Runs",
    description: "Execution history",
    icon: PlayCircle,
    enabled: true,
  },
  {
    id: "workbench",
    label: "Workbench",
    description: "Agent console",
    icon: MessageCircle,
    enabled: true,
  },
  {
    id: "agents",
    label: "Agents",
    description: "Profiles and roles",
    icon: Bot,
    enabled: false,
  },
  {
    id: "models",
    label: "Models",
    description: "Model routing",
    icon: SlidersHorizontal,
    enabled: true,
  },
  {
    id: "extensions",
    label: "Extensions",
    description: "Capabilities",
    icon: Box,
    enabled: false,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Local preferences",
    icon: Settings,
    enabled: false,
  },
];

export const defaultRoute: AppRoute = "command-center";

export function getNavigationItem(route: AppRoute) {
  return navigationItems.find((item) => item.id === route) ?? navigationItems[0];
}

export function getEnabledNavigationItems() {
  return navigationItems.filter((item) => item.enabled);
}

export const quickActions = [
  {
    id: "new-run",
    label: "New run",
    icon: Sparkles,
  },
  {
    id: "connect-project",
    label: "Connect project",
    icon: FolderKanban,
  },
];
