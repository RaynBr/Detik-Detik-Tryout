import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DynamicMenuNode } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { BrandLogo } from '../../shared/components/BrandLogo';
import { resolveMenuIcon } from '../../shared/utils/iconMapper';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  School,
  LogOut,
  Menu,
  X,
  BarChart3,
  Layers,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  UserCheck,
  ChevronDown,
  ChevronRight,
  History,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';

interface SubMenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubMenuItem[];
}

// Fallback hardcoded menu strictly for ADMIN INSTANSI (Portal Sekolah)
const FALLBACK_SCHOOL_ADMIN_MENUS: MenuItem[] = [
  { name: 'Dashboard Sekolah', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Kelola Pengguna', path: '/admin/users', icon: Users },
  {
    name: 'Master Akademik',
    path: '/admin/classes',
    icon: Layers,
    subItems: [
      { name: 'Kelas & Rombel', path: '/admin/classes', icon: School },
      { name: 'Mata Pelajaran', path: '/admin/master-akademik/mata-pelajaran', icon: BookOpen },
      { name: 'Guru Pengampu', path: '/admin/classes?tab=guru-mapel', icon: UserCheck },
      { name: 'Wali Kelas', path: '/admin/classes?tab=wali-kelas', icon: GraduationCap },
    ],
  },
  { name: 'Jadwal Ujian', path: '/admin/exams', icon: CalendarDays },
  { name: 'Monitoring Ujian', path: '/admin/proctoring', icon: BarChart3 },
  { name: 'Aktivitas Guru & Siswa', path: '/admin/activities', icon: History },
  { name: 'Pengumuman', path: '/admin/announcements', icon: Megaphone },
  { name: 'Laporan Rekap Nilai', path: '/admin/reports', icon: BarChart3 },
  { name: 'Profil & Keamanan', path: '/admin/profile', icon: UserCheck },
  { name: 'Role & Akses Sekolah', path: '/admin/roles', icon: ShieldCheck },
];

function mapDynamicSchoolMenus(nodes: DynamicMenuNode[]): MenuItem[] {
  return nodes.map((node) => {
    const label = node.label || node.name || 'Menu';
    const children =
      Array.isArray(node.children) && node.children.length > 0
        ? node.children.map((child) => ({
            name: child.label || child.name || 'Submenu',
            path: child.path || '/admin/dashboard',
            icon: resolveMenuIcon(child.icon),
          }))
        : undefined;

    return {
      name: label,
      path: node.path || (children?.[0]?.path ?? '/admin/dashboard'),
      icon: resolveMenuIcon(node.icon),
      subItems: children,
    };
  });
}

export const AdminLayout: React.FC = () => {
  const { user, menus, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Persistent sidebar collapsed state across page navigations & reloads
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('cbt_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('cbt_sidebar_collapsed', String(nextState));
      return nextState;
    });
  };

  // Use dynamic backend menus when available; fallback safely to hardcoded menus
  const currentMenuItems = React.useMemo<MenuItem[]>(() => {
    if (Array.isArray(menus) && menus.length > 0) {
      return mapDynamicSchoolMenus(menus);
    }
    return FALLBACK_SCHOOL_ADMIN_MENUS;
  }, [menus]);

  const isPathMatch = React.useCallback(
    (targetPath: string) => {
      if (!targetPath) return false;
      if (targetPath.includes('?')) {
        return `${location.pathname}${location.search}` === targetPath;
      }
      // If current URL has ?tab=... and targetPath is /admin/classes without tab, don't double-highlight
      if (location.search && targetPath === '/admin/classes') {
        return false;
      }
      return location.pathname === targetPath;
    },
    [location.pathname, location.search]
  );

  const isGroupActive = React.useCallback(
    (item: MenuItem) => {
      if (!item.subItems || item.subItems.length === 0) return false;
      return (
        item.subItems.some((sub) => isPathMatch(sub.path)) ||
        location.pathname.startsWith('/admin/master-akademik') ||
        ['/admin/classes', '/admin/subjects'].includes(location.pathname)
      );
    },
    [isPathMatch, location.pathname]
  );

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of currentMenuItems) {
        if (item.subItems && isGroupActive(item) && !next[item.name]) {
          next[item.name] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentMenuItems, isGroupActive]);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="h-screen overflow-hidden flex bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] transition-colors duration-200 font-sans">
      
      {/* Sidebar - Desktop (Fixed / Sticky viewport height with independent scroll) */}
      <aside 
        className={`hidden md:flex flex-col h-screen sticky top-0 overflow-y-auto bg-white dark:bg-[#1A1E22] border-r-2 border-[#161C2D] dark:border-[#32363A] transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
          isCollapsed ? 'w-20 p-3 items-center' : 'w-64 p-5'
        }`}
      >
        {/* Header Sidebar & Collapse Toggle */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 mb-8 px-1">
            <div className="flex flex-col overflow-hidden min-w-0">
              <BrandLogo imgClassName="h-8 w-auto" />
              <p className="text-[10px] text-[#5D6371] dark:text-gray-400 font-semibold truncate mt-1">
                {user?.profile?.institution || 'Admin Instansi / Sekolah'}
              </p>
            </div>
            <button
              onClick={toggleSidebar}
              title="Tutup Sidebar"
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5 border border-transparent hover:border-[#161C2D] transition shrink-0"
              aria-label="Tutup Sidebar"
            >
              <PanelLeftClose className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mb-6 pt-1">
            <div 
              className="p-1 rounded-xl"
              title="Detik Detik TryOut"
            >
              <BrandLogo iconOnly imgClassName="h-7 w-auto" />
            </div>
            <button
              onClick={toggleSidebar}
              title="Buka Sidebar"
              className="p-2 rounded-lg text-slate-500 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5 border border-transparent hover:border-[#161C2D] transition"
              aria-label="Buka Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Menu Navigasi */}
        <nav className={`flex-1 space-y-2 w-full ${isCollapsed ? 'px-1' : ''}`}>
          {currentMenuItems.map((item) => {
            const Icon = item.icon;
            
            // Render accordion menu if item has sub-items (e.g. Master Akademik)
            if (item.subItems && item.subItems.length > 0) {
              const isParentActive = isGroupActive(item);
              const isMenuOpen = !!openGroups[item.name];
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        navigate(item.path);
                      } else {
                        toggleGroup(item.name);
                      }
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-sm font-bold transition duration-150 cursor-pointer ${
                      isParentActive && !isMenuOpen
                        ? 'bg-[#38B1ED] text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]'
                        : isParentActive
                        ? 'text-[#0A2540] dark:text-[#38B1ED] bg-[#38B1ED]/15 border-2 border-[#161C2D] dark:border-[#38B1ED]'
                        : 'text-[#5D6371] dark:text-gray-400 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 stroke-[2.5]`} />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="shrink-0 text-slate-500">
                        {isMenuOpen ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
                      </span>
                    )}
                  </button>

                  {/* Sub-menu accordion (only shown when expanded desktop) */}
                  {!isCollapsed && isMenuOpen && (
                    <div className="pl-4 space-y-1 pt-0.5 border-l-2 border-[#161C2D] dark:border-[#32363A] ml-5">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = isPathMatch(sub.path);
                        return (
                          <button
                            key={`${sub.name}-${sub.path}`}
                            onClick={() => navigate(sub.path)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                              isSubActive
                                ? 'bg-[#38B1ED] text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]'
                                : 'text-[#5D6371] dark:text-gray-400 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5'
                            }`}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                            <span className="truncate">{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = isPathMatch(item.path);
            return (
              <button
                key={`${item.name}-${item.path}`}
                onClick={() => navigate(item.path)}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'
                } rounded-xl text-sm font-bold transition duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-[#38B1ED] text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]' 
                    : 'text-[#5D6371] dark:text-gray-400 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 stroke-[2.5]`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="mt-auto border-t border-slate-200 dark:border-white/5 pt-4 space-y-3 w-full">
          {/* Theme switcher - baris sendiri lebar penuh saat expanded, 1 ikon saat collapsed */}
          {!isCollapsed ? (
            <div className="w-full">
              <ThemeToggle fullWidth />
            </div>
          ) : (
            <div className="flex justify-center">
              <ThemeToggle iconOnly />
            </div>
          )}

          {/* User profile card */}
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-2.5 py-2 rounded-xl bg-white dark:bg-[#262A2E] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
              <div className="h-9 w-9 rounded-lg bg-[#38B1ED] border-2 border-[#161C2D] flex items-center justify-center font-black text-white shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-black text-[#161C2D] dark:text-white truncate">{user?.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border border-[#161C2D] ${
                    user?.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-900' 
                      : user?.role === 'admin'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {user?.role === 'super_admin' ? 'Super Admin IP' : user?.role === 'admin' ? 'Admin Sekolah' : 'Guru'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="flex justify-center py-1" 
              title={`${user?.name} (${user?.role === 'super_admin' ? 'Super Admin IP' : user?.role === 'admin' ? 'Admin Sekolah' : 'Guru'})`}
            >
              <div className="h-9 w-9 rounded-lg bg-[#38B1ED] border-2 border-[#161C2D] flex items-center justify-center font-black text-white shrink-0 shadow-[2px_2px_0px_0px_#171717]">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={logout}
            title={isCollapsed ? 'Keluar' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center py-2 px-2' : 'gap-3 px-3 py-2'
            } text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-sm font-bold border-2 border-transparent hover:border-red-600 transition duration-150`}
          >
            <LogOut className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 stroke-[2.5]`} />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#1A1E22] border-b-2 border-[#161C2D] dark:border-[#32363A] px-4 flex items-center justify-between gap-2 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-[#38B1ED] text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] shrink-0">
            <School className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-sm text-[#161C2D] dark:text-white leading-tight truncate">Detik Detik TryOut</h1>
            <p className="text-[10px] text-[#5D6371] dark:text-gray-400 font-semibold truncate">Administrator IP Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle iconOnly />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#161C2D] dark:text-white rounded-lg bg-[#F7F9FC] dark:bg-white/5 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717]"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 stroke-[2.5]" /> : <Menu className="h-5 w-5 stroke-[2.5]" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 pt-20 px-4 pb-6 overflow-y-auto animate-fade-in flex flex-col justify-between"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="glass-panel p-5 rounded-3xl space-y-3 bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200 dark:border-white/10 shadow-2xl animate-scale-up"
          >
            <div className="flex items-center gap-3 px-2 py-2 border-b border-slate-100 dark:border-white/5 mb-2">
              <div className="h-10 w-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
              {currentMenuItems.map((item) => {
                const Icon = item.icon;
                if (item.subItems && item.subItems.length > 0) {
                  const isMenuOpen = !!openGroups[item.name];
                  return (
                    <div key={item.name} className="space-y-1">
                      <button
                        onClick={() => toggleGroup(item.name)}
                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4.5 w-4.5" />
                          <span>{item.name}</span>
                        </div>
                        {isMenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {isMenuOpen && (
                        <div className="pl-6 space-y-1 border-l-2 border-indigo-200 dark:border-indigo-500/20 ml-4">
                          {item.subItems.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = isPathMatch(sub.path);
                            return (
                              <button
                                key={`${sub.name}-${sub.path}`}
                                onClick={() => {
                                  navigate(sub.path);
                                  setMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                                  isSubActive
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                              >
                                <SubIcon className="h-3.5 w-3.5" />
                                <span>{sub.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = isPathMatch(item.path);
                return (
                  <button
                    key={`${item.name}-${item.path}`}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : 'text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl text-xs sm:text-sm font-semibold transition"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area - Independent Smooth Scroll */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 pt-16 md:pt-0 flex flex-col">
        <div className="p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto pb-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
