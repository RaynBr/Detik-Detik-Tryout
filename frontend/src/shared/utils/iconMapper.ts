import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Building,
  Users,
  Layers,
  CalendarDays,
  Calendar,
  History,
  BookOpen,
  UserCheck,
  Megaphone,
  CreditCard,
  Settings,
  ShieldCheck,
  Shield,
  ShieldAlert,
  School,
  GraduationCap,
  BarChart3,
  FileText,
  Activity,
  Award,
  CheckSquare,
  Folder,
  Circle,
  ClipboardList,
  Lock,
  KeyRound,
} from 'lucide-react';

export type LucideIconComponent = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, LucideIconComponent> = {
  LayoutDashboard,
  Building2,
  Building,
  Users,
  Layers,
  CalendarDays,
  Calendar,
  History,
  BookOpen,
  UserCheck,
  Megaphone,
  CreditCard,
  Settings,
  ShieldCheck,
  Shield,
  ShieldAlert,
  School,
  GraduationCap,
  BarChart3,
  FileText,
  Activity,
  Award,
  CheckSquare,
  Folder,
  ClipboardList,
  Lock,
  KeyRound,
  // Lowercase aliases for resilience
  'layout-dashboard': LayoutDashboard,
  'building-2': Building2,
  building: Building,
  users: Users,
  layers: Layers,
  'calendar-days': CalendarDays,
  calendar: Calendar,
  history: History,
  'book-open': BookOpen,
  'user-check': UserCheck,
  megaphone: Megaphone,
  'credit-card': CreditCard,
  settings: Settings,
  'shield-check': ShieldCheck,
  shield: Shield,
  school: School,
  'graduation-cap': GraduationCap,
  'bar-chart-3': BarChart3,
};

/**
 * Resolves a string icon name from the backend menu API into a Lucide React icon component.
 * Falls back gracefully to a default icon when unknown or null.
 */
export function resolveMenuIcon(iconName?: string | null): LucideIconComponent {
  if (!iconName) return Circle;
  const trimmed = iconName.trim();
  return ICON_MAP[trimmed] || ICON_MAP[trimmed.toLowerCase()] || Circle;
}

