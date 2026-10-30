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
  PanelLeftClose,
  PanelLeftOpen,
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

  // Submenu state for Admin Instansi Akademik Sekolah
  const isSchoolAcademicsActive = [
    '/admin/academic-years',
    '/admin/subjects',
    '/admin/majors'
  ].includes(location.pathname);

  const [academicsOpen, setAcademicsOpen] = React.useState<boolean>(isSchoolAcademicsActive);

  React.useEffect(() => {
    if (isSchoolAcademicsActive) {
      setAcademicsOpen(true);
    }
  }, [location.pathname, isSchoolAcademicsActive]);

  // Menu items strictly for ADMIN INSTANSI (Portal Sekolah)
  const schoolAdminMenus: MenuItem[] = [
    { name: 'Dashboard Sekolah', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Pengguna Instansi', path: '/admin/school-users', icon: Building2 },
    { name: 'Kelola Guru', path: '/admin/teachers', icon: UserCheck },
    { name: 'Kelola Siswa', path: '/admin/students', icon: GraduationCap },
    { name: 'Kelola Kelas & Rombel', path: '/admin/classes', icon: School },
    { 
      name: 'Akademik Sekolah', 
      path: '/admin/academic-years', 
      icon: Layers,
      subItems: [
        { name: 'Tahun Ajaran Sekolah', path: '/admin/academic-years', icon: CalendarDays },
        { name: 'Mata Pelajaran & KKM', path: '/admin/subjects', icon: BookOpen },
        { name: 'Konsentrasi / Jurusan', path: '/admin/majors', icon: Layers },
      ]
    },
    { name: 'Monitoring Ujian', path: '/admin/proctoring', icon: BarChart3 },
    { name: 'Laporan Rekap Nilai', path: '/admin/reports', icon: BarChart3 },
    { name: 'Profil & Keamanan', path: '/admin/profile', icon: UserCheck },
  ];

  const currentMenuItems = schoolAdminMenus;

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
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="p-2.5 bg-[#38B1ED] text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] shrink-0">
                <School className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-black text-sm tracking-tight text-[#161C2D] dark:text-white truncate">Detik Detik TryOut</h1>
                <p className="text-xs text-[#5D6371] dark:text-gray-400 font-semibold truncate">
                  {user?.role === 'super_admin' ? 'Super Admin IP Portal' : user?.role === 'admin' ? (user?.profile?.institution || 'Admin Sekolah') : 'Portal CBT'}
                </p>
              </div>
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
              className="p-2.5 bg-[#38B1ED] text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]"
              title="Detik Detik TryOut"
            >
              <School className="h-6 w-6 stroke-[2.5]" />
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
            
            // Render accordion menu if item has sub-items (e.g. Akademik Sekolah)
            if (item.subItems) {
              const isParentActive = isSchoolAcademicsActive;
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        navigate(item.path);
                      } else {
                        setAcademicsOpen((prev) => !prev);
                      }
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-sm font-bold transition duration-150 cursor-pointer ${
                      isParentActive && !academicsOpen
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
                        {academicsOpen ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
                      </span>
                    )}
                  </button>

                  {/* Sub-menu accordion (only shown when expanded desktop) */}
                  {!isCollapsed && academicsOpen && (
                    <div className="pl-4 space-y-1 pt-0.5 border-l-2 border-[#161C2D] dark:border-[#32363A] ml-5">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <button
                            key={sub.name}
                            onClick={() => navigate(sub.path)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition duration-150 ${
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

            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'
                } rounded-xl text-sm font-bold transition duration-150 ${
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
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#1A1E22] border-b-2 border-[#161C2D] dark:border-[#32363A] px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#38B1ED] text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
            <School className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-black text-sm text-[#161C2D] dark:text-white leading-tight">Detik Detik TryOut</h1>
            <p className="text-[10px] text-[#5D6371] dark:text-gray-400 font-semibold">Administrator IP Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
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
                        onClick={() => setAcademicsOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4.5 w-4.5" />
                          <span>{item.name}</span>
                        </div>
                        {academicsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {academicsOpen && (
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
