import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
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
  Building2,
  FileQuestion,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Users,
  CalendarDays,
  UserCheck,
  ChevronDown,
  ChevronRight
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

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
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

  const isSuperAdmin = user?.role === 'super_admin';

  // Submenu state for Super Admin Master Data Akademik
  const isMasterDataChildActive = [
    '/admin/classes',
    '/admin/jenjang',
    '/admin/subjects',
    '/admin/academic-years',
    '/admin/tahun-soal'
  ].includes(location.pathname);

  const [masterDataOpen, setMasterDataOpen] = React.useState<boolean>(isMasterDataChildActive);

  // Keep master data open if user is currently on one of the master data routes
  React.useEffect(() => {
    if (isMasterDataChildActive) {
      setMasterDataOpen(true);
    }
  }, [location.pathname, isMasterDataChildActive]);

  // Menu items strictly aligned with "final Overall System Flow.drawio.xml"
  const superAdminMenus: MenuItem[] = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: '1. Kelola Instansi', path: '/admin/instansi', icon: Building2 },
    { name: '2. Kelola Pengguna', path: '/admin/users', icon: Users },
    { 
      name: '3. Master Data Akademik', 
      path: '/admin/classes', 
      icon: Layers,
      subItems: [
        { name: 'Daftar Kelas & Rombel', path: '/admin/classes', icon: GraduationCap },
        { name: 'Jenjang Pendidikan', path: '/admin/jenjang', icon: Layers },
        { name: 'Mata Pelajaran & KKM', path: '/admin/subjects', icon: BookOpen },
        { name: 'Tahun Ajaran', path: '/admin/academic-years', icon: CalendarDays },
        { name: 'Tahun Soal', path: '/admin/tahun-soal', icon: CalendarDays },
      ]
    },
    { name: '4. Bank Soal', path: '/admin/questions', icon: FileQuestion },
    { name: '5. Audit Trail Global', path: '/admin/audit-logs', icon: History },
    { name: '6. Profil & Keamanan', path: '/admin/profile', icon: UserCheck },
  ];

  const schoolAdminMenus: MenuItem[] = [
    { name: 'Dashboard Instansi', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Pengguna Instansi', path: '/admin/instansi', icon: Building2 },
    { name: 'Siswa & Kelas', path: '/admin/classes', icon: GraduationCap },
    { name: 'Laporan Rekap Nilai', path: '/admin/reports', icon: BarChart3 },
    { name: 'Profil & Keamanan', path: '/admin/profile', icon: UserCheck },
  ];

  const currentMenuItems = isSuperAdmin ? superAdminMenus : schoolAdminMenus;

  return (
    <div className="h-screen overflow-hidden flex bg-slate-100/70 dark:bg-[#070a13] text-slate-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* Sidebar - Desktop (Fixed / Sticky viewport height with independent scroll) */}
      <aside 
        className={`hidden md:flex flex-col h-screen sticky top-0 overflow-y-auto glass-panel border-r border-slate-200 dark:border-white/5 transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
          isCollapsed ? 'w-20 p-3 items-center' : 'w-64 p-5'
        }`}
      >
        {/* Header Sidebar & Collapse Toggle */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 mb-8 px-1">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="p-2.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                <School className="h-6 w-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white truncate">Detik Detik TryOut</h1>
                <p className="text-xs text-slate-500 dark:text-gray-500 font-medium truncate">
                  {user?.role === 'super_admin' ? 'Super Admin IP Portal' : user?.role === 'admin' ? (user?.profile?.institution || 'Admin Sekolah') : 'Portal CBT'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              title="Tutup Sidebar"
              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-white/5 transition shrink-0"
              aria-label="Tutup Sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mb-6 pt-1">
            <div 
              className="p-2.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20"
              title="Detik Detik TryOut"
            >
              <School className="h-6 w-6" />
            </div>
            <button
              onClick={toggleSidebar}
              title="Buka Sidebar"
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-white/5 transition"
              aria-label="Buka Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Menu Navigasi */}
        <nav className={`flex-1 space-y-1.5 w-full ${isCollapsed ? 'px-1' : ''}`}>
          {currentMenuItems.map((item) => {
            const Icon = item.icon;
            
            // Render accordion menu if item has sub-items (e.g. Master Data Akademik)
            if (item.subItems) {
              const isParentActive = isMasterDataChildActive;
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        navigate(item.path);
                      } else {
                        setMasterDataOpen((prev) => !prev);
                      }
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-sm font-semibold transition duration-150 ${
                      isParentActive && !masterDataOpen
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : isParentActive
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30'
                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0`} />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="shrink-0 text-slate-400">
                        {masterDataOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                    )}
                  </button>

                  {/* Sub-menu accordion (only shown when expanded desktop) */}
                  {!isCollapsed && masterDataOpen && (
                    <div className="pl-4 space-y-1 pt-0.5 border-l-2 border-indigo-200/60 dark:border-indigo-500/20 ml-5">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <button
                            key={sub.name}
                            onClick={() => navigate(sub.path)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition duration-150 ${
                              isSubActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                            }`}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'
                } rounded-xl text-sm font-semibold transition duration-150 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-4 space-y-3 w-full">
          {/* Theme switcher */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">Tema</span>
              <ThemeToggle compact />
            </div>
          ) : (
            <div className="flex justify-center" title="Ubah Tema">
              <ThemeToggle compact />
            </div>
          )}

          {/* User profile card */}
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
              <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                    user?.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' 
                      : user?.role === 'admin'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
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
              <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={logout}
            title={isCollapsed ? 'Keluar' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center py-2.5 px-2' : 'gap-3 px-3 py-2'
            } text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-sm font-semibold transition duration-150`}
          >
            <LogOut className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0`} />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-b border-slate-200 dark:border-white/5 px-4 flex items-center justify-between z-40 bg-white/90 dark:bg-[#070a13]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <School className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">Detik Detik TryOut</h1>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Administrator IP Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-white/5"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
              {currentMenuItems.map((item) => {
                const Icon = item.icon;
                if (item.subItems) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <button
                        onClick={() => setMasterDataOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4.5 w-4.5" />
                          <span>{item.name}</span>
                        </div>
                        {masterDataOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {masterDataOpen && (
                        <div className="pl-6 space-y-1 border-l-2 border-indigo-200 dark:border-indigo-500/20 ml-4">
                          {item.subItems.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = location.pathname === sub.path;
                            return (
                              <button
                                key={sub.name}
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

                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.name}
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
