import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  fullWidth = false,
  iconOnly = false,
  className = '',
}) => {
  const { themeMode, setThemeMode } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: 'Terang', icon: Sun },
    { mode: 'dark', label: 'Gelap', icon: Moon },
  ];

  // Single-icon toggle button (ideal for collapsed sidebar or narrow mobile bars)
  if (iconOnly) {
    const isDark = themeMode === 'dark';
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    const labelText = isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap';

    return (
      <button
        type="button"
        onClick={() => setThemeMode(nextMode)}
        title={labelText}
        aria-label={labelText}
        aria-pressed={isDark}
        className={`h-10 w-10 rounded-xl flex items-center justify-center bg-gray-200/70 dark:bg-white/10 border border-gray-300/60 dark:border-white/15 text-indigo-600 dark:text-amber-300 hover:bg-white dark:hover:bg-white/15 shadow-sm transition cursor-pointer shrink-0 ${className}`}
      >
        {isDark ? <Moon className="h-4 w-4 stroke-[2.5]" /> : <Sun className="h-4 w-4 stroke-[2.5]" />}
      </button>
    );
  }

  if (compact) {
    return (
      <div
        role="group"
        aria-label="Pengaturan tema tampilan"
        className={`inline-flex items-center p-1 rounded-2xl bg-gray-200/70 dark:bg-white/5 border border-gray-300/60 dark:border-white/10 gap-0.5 ${className}`}
      >
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = themeMode === mode;
          const labelText = `Mode ${label.toLowerCase()}`;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setThemeMode(mode)}
              title={labelText}
              aria-label={labelText}
              aria-pressed={isActive}
              className={`p-1.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Pengaturan tema tampilan"
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-center p-1 rounded-2xl bg-gray-200/70 dark:bg-white/5 border border-gray-300/60 dark:border-white/10 gap-0.5 ${className}`}
    >
      {options.map(({ mode, label, icon: Icon }) => {
        const isActive = themeMode === mode;
        const labelText = `Mode ${label.toLowerCase()}`;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setThemeMode(mode)}
            title={labelText}
            aria-label={labelText}
            aria-pressed={isActive}
            className={`${fullWidth ? 'flex-1 justify-center' : ''} flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
