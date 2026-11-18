import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DynamicMenuNode } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { BrandLogo } from '../../shared/components/BrandLogo';
import { resolveMenuIcon } from '../../shared/utils/iconMapper';
import {
  LayoutDashboard,
  BookOpen,
  LogOut,
  Menu,
  X,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Users,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Settings,
  Layers,
  CalendarDays,
  Calendar,
  ChevronDown,
  ChevronRight,
  Megaphone,
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

// Fallback hardcoded menu strictly for SUPER ADMIN PLATFORM OWNER
const FALLBACK_SUPER_ADMIN_MENUS: MenuItem[] = [
  { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Kelola Instansi', path: '/super-admin/instansi', icon: Building2 },
  { name: 'Kelola Pengguna', path: '/super-admin/users', icon: Users },
  {
    name: 'Master Akademik Global',
    path: '/super-admin/master-akademik/tahun-ajaran',
    icon: Layers,
    subItems: [
      { name: 'Tahun Ajaran', path: '/super-admin/master-akademik/tahun-ajaran', icon: CalendarDays },
      { name: 'Semester', path: '/super-admin/master-akademik/semester', icon: History },
      { name: 'Kurikulum', path: '/super-admin/master-akademik/kurikulum', icon: BookOpen },
      { name: 'Jenjang', path: '/super-admin/master-akademik/jenjang', icon: Layers },
      { name: 'Tingkat', path: '/super-admin/master-akademik/tingkat-kelas', icon: UserCheck },
    ],
  },
  {
    name: 'Kelola Bank Soal',
    path: '/super-admin/bank-soal',
    icon: BookOpen,
    subItems: [
      { name: 'Paket Bank Soal', path: '/super-admin/bank-soal', icon: BookOpen },
      { name: 'Referensi Tahun Soal', path: '/super-admin/bank-soal/tahun-soal', icon: Calendar },
    ],
  },
  { name: 'Audit Trail', path: '/super-admin/audit-logs', icon: History },
  { name: 'Pengumuman Global', path: '/super-admin/announcements', icon: Megaphone },
  { name: 'Langganan Platform', path: '/super-admin/subscriptions', icon: CreditCard },
  { name: 'Pengaturan Platform', path: '/super-admin/settings', icon: Settings },
  { name: 'Kelola Role & Hak Akses', path: '/super-admin/roles', icon: ShieldCheck },
  { name: 'Profil & Keamanan', path: '/super-admin/profile', icon: UserCheck },
];

function mapDynamicMenus(nodes: DynamicMenuNode[]): MenuItem[] {
  const mapped: MenuItem[] = nodes.map((node) => {
    const label = node.label || node.name || 'Menu';
    const children = Array.isArray(node.children) && node.children.length > 0
      ? node.children.map((child) => ({
          name: child.label || child.name || 'Submenu',
          path: child.path || '/super-admin/dashboard',
          icon: resolveMenuIcon(child.icon),
        }))
      : undefined;

    return {
      name: label,
      path: node.path || (children?.[0]?.path ?? '/super-admin/dashboard'),
      icon: resolveMenuIcon(node.icon),
      subItems: children,
    };
  });

  // Preserve existing Profil & Keamanan item if backend seeder does not include it
  const hasProfile = mapped.some((m) => m.path === '/super-admin/profile');
  if (!hasProfile) {
    mapped.push({ name: 'Profil & Keamanan', path: '/super-admin/profile', icon: UserCheck });
  }

  return mapped;
}

export const SuperAdminLayout: React.FC = () => {
  const { user, menus, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Persistent sidebar collapsed state across page navigations & reloads
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('cbt_superadmin_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('cbt_superadmin_sidebar_collapsed', String(nextState));
      return nextState;
    });
  };

  // Use dynamic backend menus when available; fallback safely to hardcoded menus
  const superAdminMenus = React.useMemo<MenuItem[]>(() => {
    if (Array.isArray(menus) && menus.length > 0) {
      return mapDynamicMenus(menus);
    }
    return FALLBACK_SUPER_ADMIN_MENUS;
  }, [menus]);

  const isPathMatch = React.useCallback(
    (targetPath: string) => {
      if (!targetPath) return false;
      if (targetPath.includes('?')) {
        return `${location.pathname}${location.search}` === targetPath;
      }
      return location.pathname === targetPath;
    },
    [location.pathname, location.search]
  );

  const isGroupActive = React.useCallback(
    (item: MenuItem) => {
      if (!item.subItems || item.subItems.length === 0) return false;
      return item.subItems.some((sub) => isPathMatch(sub.path)) ||
        (item.path.includes('master-akademik') && location.pathname.startsWith('/super-admin/master-akademik')) ||
        (item.path.includes('bank-soal') && location.pathname.startsWith('/super-admin/bank-soal'));
    },
    [isPathMatch, location.pathname]
  );

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of superAdminMenus) {
        if (item.subItems && isGroupActive(item) && !next[item.name]) {
          next[item.name] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [superAdminMenus, isGroupActive]);

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
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold truncate mt-1">
                Super Admin Platform
              </p>
            </div>
            <button
              onClick={toggleSidebar}
              title="Tutup Sidebar"
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5 border border-transparent hover:border-[#161C2D] transition shrink-0 cursor-pointer"
              aria-label="Tutup Sidebar"
            >
              <PanelLeftClose className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mb-6 pt-1">
            <div 
              className="p-1 rounded-xl"
              title="Super Admin Platform"
            >
              <BrandLogo iconOnly imgClassName="h-7 w-auto" />
            </div>
            <button
              onClick={toggleSidebar}
              title="Buka Sidebar"
              className="p-2 rounded-lg text-slate-500 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5 border border-transparent hover:border-[#161C2D] transition cursor-pointer"
              aria-label="Buka Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Menu Navigasi */}
        <nav className={`flex-1 space-y-2 w-full ${isCollapsed ? 'px-1' : ''}`}>
          {superAdminMenus.map((item) => {
            const Icon = item.icon;

            if (item.subItems && item.subItems.length > 0) {
              const isParentActive = isGroupActive(item);
              const isMenuOpen = !!openGroups[item.name];
              const handleToggleMenu = () => {
                if (isCollapsed) {
                  navigate(item.path);
                } else {
                  toggleGroup(item.name);
                }
              };

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={handleToggleMenu}
                    title={isCollapsed ? item.name : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-sm font-bold transition duration-150 cursor-pointer ${
                      isParentActive && !isMenuOpen
                        ? 'bg-indigo-600 text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]'
                        : isParentActive
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-2 border-[#161C2D] dark:border-indigo-600'
                        : 'text-[#5D6371] dark:text-gray-400 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5 border border-transparent hover:border-[#161C2D] dark:hover:border-[#32363A]'
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
                                ? 'bg-indigo-600 text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]'
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
                    ? 'bg-indigo-600 text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]'
                    : 'text-[#5D6371] dark:text-gray-400 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5 border border-transparent hover:border-[#161C2D] dark:hover:border-[#32363A]'
                }`}
              >
                <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 stroke-[2.5]`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="mt-auto pt-4 border-t-2 border-[#161C2D] dark:border-[#32363A] w-full space-y-3">
          {/* Theme Toggle - baris sendiri lebar penuh saat expanded, 1 ikon saat collapsed */}
          {!isCollapsed ? (
            <div className="w-full">
              <ThemeToggle fullWidth />
            </div>
          ) : (
            <div className="flex justify-center">
              <ThemeToggle iconOnly />
            </div>
          )}

          {/* Info User - baris sendiri agar nama & peran tampil utuh */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#F7F9FC] dark:bg-[#262A2E] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center border-2 border-[#161C2D] shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#161C2D] dark:text-white truncate" title={user?.name}>
                  {user?.name}
                </p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider truncate">
                  Super Administrator
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title={`${user?.name || 'Super Admin'} (Super Administrator)`}>
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title={isCollapsed ? 'Keluar' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
            } text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-2 border-transparent hover:border-rose-600 rounded-xl transition duration-150 cursor-pointer`}
          >
            <LogOut className="h-5 w-5 shrink-0 stroke-[2.5]" />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-white dark:bg-[#1A1E22] border-b-2 border-[#161C2D] dark:border-[#32363A] px-4 md:px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#161C2D] dark:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              aria-label="Buka Menu"
            >
              <Menu className="h-6 w-6 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-black border border-indigo-200 dark:border-indigo-800">
                PLATFORM SUPER ADMIN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex flex-col text-right min-w-0">
              <span className="text-xs font-black text-[#161C2D] dark:text-white truncate">{user?.name}</span>
              <span className="text-[10px] text-slate-500 dark:text-gray-400 font-semibold truncate">{user?.email}</span>
            </div>
            <div className="h-9 w-9 shrink-0 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-72 bg-white dark:bg-[#1A1E22] border-r-2 border-[#161C2D] flex flex-col p-5 z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl border border-[#161C2D]">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <span className="font-black text-sm text-[#161C2D] dark:text-white">Super Admin</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 overflow-y-auto">
                {superAdminMenus.map((item) => {
                  const Icon = item.icon;

                  if (item.subItems && item.subItems.length > 0) {
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-gray-300">
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </div>
                        </div>
                        <div className="pl-4 space-y-1 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4">
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
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                                  isSubActive ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-gray-400'
                                }`}
                              >
                                <SubIcon className="h-3.5 w-3.5" />
                                <span>{sub.name}</span>
                              </button>
                            );
                          })}
                        </div>
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
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                        isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                <ThemeToggle fullWidth />
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
