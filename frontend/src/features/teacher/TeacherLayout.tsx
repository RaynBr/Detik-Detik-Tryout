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
                <p className="text-xs text-[#5D6371] dark:text-gray-400 font-semibold truncate">Panel Pengajar / Guru</p>
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
        <div className="border-t-2 border-[#C3CCD8] dark:border-[#32363A] pt-4 mt-4 space-y-3 w-full">
          {/* Theme switcher */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-[#5D6371] dark:text-gray-400">Tema</span>
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
                G
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-black text-[#161C2D] dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-[#5D6371] dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1" title={`${user?.name} (Guru)`}>
              <div className="h-9 w-9 rounded-lg bg-[#38B1ED] border-2 border-[#161C2D] flex items-center justify-center font-black text-white shrink-0 shadow-[2px_2px_0px_0px_#171717]">
                G
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
            <p className="text-[10px] text-[#5D6371] dark:text-gray-400 font-semibold">Panel Pengajar / Guru</p>
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
          className="md:hidden fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 pt-20 px-4 pb-6 overflow-y-auto animate-fade-in flex flex-col justify-between"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white dark:bg-[#1A1E22] p-5 rounded-xl space-y-3 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] animate-scale-up"
          >
            <div className="flex items-center gap-3 px-2 py-2 border-b-2 border-[#C3CCD8] dark:border-[#32363A] mb-2">
              <div className="h-10 w-10 rounded-lg bg-[#38B1ED] border-2 border-[#161C2D] flex items-center justify-center font-black text-white">
                G
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-[#161C2D] dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-[#5D6371] dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="space-y-2">
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
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition ${
                      isActive 
                        ? 'bg-[#38B1ED] text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]' 
                        : 'text-[#5D6371] dark:text-gray-300 hover:text-[#161C2D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 stroke-[2.5]" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t-2 border-[#C3CCD8] dark:border-[#32363A]">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs sm:text-sm font-bold border-2 border-transparent hover:border-red-600 transition"
              >
                <LogOut className="h-4.5 w-4.5 stroke-[2.5]" />
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

