import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';

interface MetricItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface WelcomeBannerProps {
  title: string;
  subtitle: string;
  roleBadge: string;
  metrics?: MetricItem[];
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  title,
  subtitle,
  roleBadge,
  metrics = [],
  actionLabel,
  onAction,
  icon: Icon = Sparkles
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl card-gradient-indigo p-6 md:p-8 shadow-xl shadow-indigo-500/5 dark:shadow-indigo-950/20">
      {/* Decorative ambient gradients */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        
        {/* Left: Greetings & Role */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-indigo-100/90 dark:bg-indigo-500/20 border border-indigo-300/60 dark:border-indigo-400/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
              <Icon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{roleBadge}</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium hidden sm:inline">• Sistem CBT Aktif</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-gray-300/90 leading-relaxed font-medium">
            {subtitle}
          </p>
        </div>

        {/* Right: Quick metrics (Grid 3 kolom di mobile / flex di desktop - Revisi 7) */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 md:gap-4 shrink-0 w-full lg:w-auto">
          {metrics.map((m, idx) => (
            <div 
              key={idx} 
              className={`p-2.5 sm:px-4 sm:py-3 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] transition text-center sm:text-left flex-1 min-w-0 shadow-[2px_2px_0px_0px_#171717] ${
                m.highlight 
                  ? 'bg-[#4379EE] text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-white dark:bg-[#1A1E22] text-slate-800 dark:text-gray-200'
              }`}
            >
              <p className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-black truncate ${m.highlight ? 'text-indigo-100' : 'text-slate-500 dark:text-gray-400'}`}>
                {m.label}
              </p>
              <p className={`text-base sm:text-lg md:text-xl font-black font-mono mt-0.5 truncate ${m.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {m.value}
              </p>
            </div>
          ))}

          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-3 bg-indigo-600 dark:bg-white text-white dark:text-gray-900 hover:bg-indigo-500 dark:hover:bg-gray-100 active:scale-95 font-bold text-xs md:text-sm rounded-2xl transition duration-150 shadow-lg shadow-indigo-600/20 dark:shadow-white/10 flex items-center gap-2"
            >
              <span>{actionLabel}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
