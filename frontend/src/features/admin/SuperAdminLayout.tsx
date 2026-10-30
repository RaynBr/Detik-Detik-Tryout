import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { 
  LayoutDashboard, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
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
  ChevronRight,
  ShieldAlert
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

export const SuperAdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
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

  // Submenu state for Master Platform Nasional
  const isMasterPlatformActive = [
    '/super-admin/jenjang',
    '/super-admin/subjects',
    '/super-admin/tahun-soal',
    '/super-admin/test-tasks'
  ].includes(location.pathname);

  const [masterPlatformOpen, setMasterPlatformOpen] = React.useState<boolean>(isMasterPlatformActive);

  React.useEffect(() => {
    if (isMasterPlatformActive) {
      setMasterPlatformOpen(true);
    }
  }, [location.pathname, isMasterPlatformActive]);

  // Menu items strictly for SUPER ADMIN PLATFORM
  const superAdminMenus: MenuItem[] = [
    { name: 'Dashboard Platform', path: '/super-admin/dashboard', icon: LayoutDashboard },
    { name: '1. Kelola Instansi', path: '/super-admin/instansi', icon: Building2 },
    { name: '2. Kelola Pengguna Platform', path: '/super-admin/users', icon: Users },
    { 
      name: '3. Master Platform Nasional', 
      path: '/super-admin/jenjang', 
      icon: Layers,
      subItems: [
        { name: 'Jenjang Nasional', path: '/super-admin/jenjang', icon: Layers },
        { name: 'Mata Pelajaran Nasional', path: '/super-admin/subjects', icon: BookOpen },
        { name: 'Tahun Soal Nasional', path: '/super-admin/tahun-soal', icon: CalendarDays },
        { name: 'Internal Test Tasks', path: '/super-admin/test-tasks', icon: FileQuestion },
      ]
    },
    { name: '4. Audit Trail Global', path: '/super-admin/audit-logs', icon: History },
    { name: '5. Profil & Keamanan', path: '/super-admin/profile', icon: UserCheck },
  ];

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
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] shrink-0">
                <ShieldAlert className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-black text-sm tracking-tight text-[#161C2D] dark:text-white truncate">Detik Detik TryOut</h1>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">
                  Super Admin Platform
                </p>
              </div>
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
              className="p-2.5 bg-indigo-600 text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]"
              title="Super Admin Platform"
            >
              <ShieldAlert className="h-6 w-6 stroke-[2.5]" />
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
            
            // Accordion menu for sub-items
            if (item.subItems) {
              const isParentActive = isMasterPlatformActive;
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        navigate(item.path);
                      } else {
                        setMasterPlatformOpen((prev) => !prev);
                      }
                    }}
                    title={isCollapsed ? item.name : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-sm font-bold transition duration-150 cursor-pointer ${
                      isParentActive && !masterPlatformOpen
                        ? 'bg-indigo-600 text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]'
                        : isParentActive
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-2 border-[#161C2D] dark:border-indigo-500'
                        : 'text-[#5D6371] dark:text-gray-400 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 stroke-[2.5]`} />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="shrink-0 text-slate-500">
                        {masterPlatformOpen ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
                      </span>
                    )}
                  </button>

                  {!isCollapsed && masterPlatformOpen && (
                    <div className="pl-4 space-y-1 pt-0.5 border-l-2 border-[#161C2D] dark:border-[#32363A] ml-5">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <button
                            key={sub.name}
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

            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'
                } rounded-xl text-sm font-bold transition duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600 text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]' 
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
        <div className="pt-4 border-t-2 border-[#161C2D] dark:border-[#32363A] w-full">
          <div className={`flex ${isCollapsed ? 'flex-col items-center' : 'items-center justify-between'} gap-2 mb-4`}>
            <ThemeToggle />
            {!isCollapsed && (
              <div className="text-right overflow-hidden">
                <p className="text-xs font-black text-[#161C2D] dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Super Administrator</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title={isCollapsed ? 'Keluar' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'
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

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-[#161C2D] dark:text-white">{user?.name}</span>
              <span className="text-[10px] text-slate-500 dark:text-gray-400 font-semibold">{user?.email}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
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
                  if (item.subItems) {
                    return (
                      <div key={item.name} className="space-y-1">
                        <button
                          onClick={() => setMasterPlatformOpen(!masterPlatformOpen)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-gray-300"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </div>
                          {masterPlatformOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        {masterPlatformOpen && (
                          <div className="pl-6 space-y-1">
                            {item.subItems.map((sub) => (
                              <button
                                key={sub.name}
                                onClick={() => {
                                  navigate(sub.path);
                                  setMobileMenuOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold ${
                                  location.pathname === sub.path ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-gray-400'
                                }`}
                              >
                                {sub.name}
                              </button>
                            ))}
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

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600"
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
