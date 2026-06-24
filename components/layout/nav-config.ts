import {
  LayoutDashboard,
  Terminal,
  Mail,
  Calendar,
  CheckSquare,
  Repeat,
  Users,
  StickyNote,
  Brain,
  Bell,
  Plug,
  Settings,
  ShieldCheck,
  Sunrise,
  FileSearch,
  PenSquare,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/briefing", label: "Daily Briefing", icon: Sunrise },
  { href: "/meeting-prep", label: "Meeting Prep", icon: FileSearch },
  { href: "/compose", label: "Smart Compose", icon: PenSquare },
  { href: "/command", label: "Command Center", icon: Terminal },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/follow-ups", label: "Follow-Ups", icon: Repeat },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
