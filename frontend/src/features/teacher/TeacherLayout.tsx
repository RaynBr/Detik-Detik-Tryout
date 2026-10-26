import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { 
  LayoutDashboard, 
  BookOpen, 
  School, 
  LogOut, 
  Menu, 
  X, 
  Calendar,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck
} from 'lucide-react';

export const TeacherLayout: React.FC = () => {
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

  const menuItems = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Bank Soal', path: '/teacher/questions', icon: BookOpen },
    { name: 'Paket TryOut & Ujian', path: '/teacher/exams', icon: Calendar },
    { name: 'Laporan Nilai Siswa', path: '/teacher/reports', icon: BarChart3 },
    { name: 'Profil & Keamanan', path: '/teacher/profile', icon: UserCheck },
  ];

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
              <div className="p-2.5 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/25 shrink-0">
                <School className="h-6 w-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white truncate">Detik Detik TryOut</h1>
                <p className="text-xs text-slate-500 dark:text-gray-500 font-medium truncate">Panel Pengajar / Guru</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              title="Tutup Sidebar"
              className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-white/5 transition shrink-0"
              aria-label="Tutup Sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mb-6 pt-1">
            <div 
              className="p-2.5 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/25"
              title="Detik Detik TryOut"
            >
              <School className="h-6 w-6" />
            </div>
            <button
              onClick={toggleSidebar}
              title="Buka Sidebar"
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-white/5 transition"
              aria-label="Buka Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Menu Navigasi */}
        <nav className={`flex-1 space-y-1.5 w-full ${isCollapsed ? 'px-1' : ''}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
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
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
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
              <div className="h-9 w-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-600 dark:text-cyan-400 shrink-0">
                G
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1" title={`${user?.name} (Guru)`}>
              <div className="h-9 w-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-600 dark:text-cyan-400 shrink-0">
                G
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
          <div className="p-2 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/25">
            <School className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">Detik Detik TryOut</h1>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Panel Pengajar / Guru</p>
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
              <div className="h-10 w-10 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-600 dark:text-cyan-400">
                G
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
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
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
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

