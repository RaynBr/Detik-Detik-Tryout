import React, { useState } from 'react';
import { 
  Bell, X, AlertTriangle, Info, BookOpen, ShieldAlert, 
  CheckCheck, Check, Calendar
} from 'lucide-react';

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  category: 'info' | 'warning' | 'exam' | 'urgent' | string;
  badge_text?: string;
  created_at: string;
}

interface StudentAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: AnnouncementItem[];
  dismissedIds: number[];
  onDismissAnnouncement: (id: number) => void;
  onDismissAll: () => void;
}

const categoryConfig: Record<string, {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
}> = {
  info: {
    label: 'Informasi',
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/40',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
  },
  warning: {
    label: 'Peringatan',
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/40',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
  },
  exam: {
    label: 'Ujian Aktif',
    icon: BookOpen,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
  },
  urgent: {
    label: 'Penting',
    icon: ShieldAlert,
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/40',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
  }
};

export const StudentAnnouncementModal: React.FC<StudentAnnouncementModalProps> = ({
  isOpen,
  onClose,
  announcements,
  dismissedIds,
  onDismissAnnouncement,
  onDismissAll,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredAnnouncements = announcements.filter(item => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in font-sans">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#1A1E22] rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] flex flex-col max-h-[88vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-[#161C2D] dark:border-[#32363A] bg-[#F7F9FC] dark:bg-[#13171B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#38B1ED] text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Bell className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="announcement-modal-title" className="text-base sm:text-lg font-black text-[#161C2D] dark:text-white tracking-tight flex items-center gap-2">
                Pengumuman & Informasi Ujian
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-[#38B1ED]/15 text-[#0284c7] dark:text-[#38B1ED] border border-[#38B1ED]/30">
                  {announcements.length} Tersedia
                </span>
              </h2>
              <p className="text-xs text-[#5D6371] dark:text-gray-400 font-medium">
                Pemberitahuan penting seputar teknis CBT dan jadwal ujian Anda
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-4 sm:px-5 py-2.5 bg-white dark:bg-[#1A1E22] border-b border-slate-200 dark:border-white/5 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-[#161C2D] text-white dark:bg-white dark:text-[#161C2D]'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Semua ({announcements.length})
          </button>
          {['info', 'warning', 'exam'].map(cat => {
            const count = announcements.filter(a => a.category === cat).length;
            const conf = categoryConfig[cat] || categoryConfig.info;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-[#161C2D] text-white dark:bg-white dark:text-[#161C2D]'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <span>{conf.label}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Announcements List Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {filteredAnnouncements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-gray-500 space-y-2">
              <Bell className="h-8 w-8 mx-auto stroke-1 opacity-50" />
              <p className="text-sm font-semibold">Tidak ada pengumuman pada kategori ini.</p>
            </div>
          ) : (
            filteredAnnouncements.map((item) => {
              const conf = categoryConfig[item.category] || categoryConfig.info;
              const Icon = conf.icon;
              const isDismissed = dismissedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border-2 transition relative ${
                    isDismissed
                      ? 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 opacity-70'
                      : `${conf.bg} border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${conf.badgeBg}`}>
                        {item.badge_text || conf.label}
                      </span>
                      {isDismissed && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400">
                          Sudah Ditandai Dibaca
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400 flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-[#161C2D] dark:text-white mb-1.5 flex items-center gap-2">
                    <Icon className={`h-4.5 w-4.5 ${conf.text} shrink-0`} />
                    <span>{item.title}</span>
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line mb-3">
                    {item.content}
                  </p>

                  <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
                    <button
                      onClick={() => onDismissAnnouncement(item.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{isDismissed ? 'Batal tandai dibaca' : 'Jangan tampilkan lagi pengumuman ini'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t-2 border-[#161C2D] dark:border-[#32363A] bg-[#F7F9FC] dark:bg-[#13171B] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onDismissAll}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/5 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="h-4 w-4 text-emerald-600" />
            <span>Jangan Tampilkan Semua Lagi</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-[#161C2D] hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#161C2D] border-2 border-[#161C2D] dark:border-[#32363A] text-xs font-black shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
