import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  CheckCircle, Bell, X, ArrowRight
} from 'lucide-react';

export interface HighlightDate {
  date: string; // YYYY-MM-DD
  title: string;
  subject_name?: string;
  subject_code?: string;
  start_time?: string;
  duration_minutes?: number;
  status?: 'upcoming' | 'in_progress' | 'completed' | 'disqualified';
  type?: 'exam' | 'submission' | 'event';
  exam_group_id?: number;
}

interface CalendarWidgetProps {
  highlights?: HighlightDate[];
  onSelectDate?: (date: Date) => void;
  onSelectExam?: (examGroupId: number) => void;
  isSyncing?: boolean;
}

// Timezone-safe date extractors
const extractDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // ignore
  }
  return '';
};

const formatIndonesianDate = (dateStr: string) => {
  const clean = extractDateOnly(dateStr);
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = parseInt(match[3], 10);
    const m = parseInt(match[2], 10) - 1;
    return `${d} ${months[m] || ''}`;
  }
  return dateStr;
};

const formatFullIndonesianDate = (dateStr: string) => {
  const clean = extractDateOnly(dateStr);
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const fullMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const y = match[1];
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    return `${d} ${fullMonths[m] || ''} ${y}`;
  }
  return dateStr;
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  highlights = [],
  onSelectDate,
  onSelectExam,
  isSyncing = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr(null);
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const getDayEvents = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return highlights.filter(h => {
      const clean = extractDateOnly(h.date || h.start_time);
      return clean === formatted;
    });
  };

  // Selected date events popup
  const selectedEvents = selectedDateStr
    ? highlights.filter(h => extractDateOnly(h.date || h.start_time) === selectedDateStr)
    : [];

  // Upcoming & Active exams (sorted chronologically for reminder preview)
  const upcomingExams = highlights
    .filter(h => h.status === 'upcoming' || h.status === 'in_progress')
    .sort((a, b) => {
      const timeA = new Date((a.start_time || a.date || '').replace(' ', 'T')).getTime();
      const timeB = new Date((b.start_time || b.date || '').replace(' ', 'T')).getTime();
      return timeA - timeB;
    });

  // Jump calendar view directly to an exam's month and select date
  const jumpToExamDate = (item: HighlightDate) => {
    const clean = extractDateOnly(item.date || item.start_time);
    if (clean) {
      const [y, m] = clean.split('-').map(Number);
      setCurrentDate(new Date(y, m - 1, 1));
      setSelectedDateStr(clean);
    }
  };

  // Check if upcoming exams exist in a month other than the current view
  const upcomingInOtherMonth = upcomingExams.find(item => {
    const clean = extractDateOnly(item.date || item.start_time);
    if (!clean) return false;
    const [y, m] = clean.split('-').map(Number);
    return y !== year || (m - 1) !== month;
  });

  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 space-y-4 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] bg-white dark:bg-[#1A1E22]">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#4379EE]/10 text-[#4379EE] rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-none font-mono">
                {monthNames[month]} {year}
              </h4>
              {isSyncing && (
                <span className="flex h-2 w-2 relative" title="Sinkronisasi real-time">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 font-bold uppercase tracking-wider">
              Kalender & Pengingat Ujian
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-white/10 transition active:scale-95 cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-white/10 transition active:scale-95 cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Jump Banner when upcoming exams exist in another month */}
      {upcomingInOtherMonth && (
        <button
          type="button"
          onClick={() => jumpToExamDate(upcomingInOtherMonth)}
          className="w-full text-left flex items-center justify-between p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/50 text-amber-900 dark:text-amber-300 text-[11px] font-bold transition active:scale-[0.99] cursor-pointer"
          title="Klik untuk membuka bulan jadwal ujian"
        >
          <span className="truncate flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Ujian terdekat di {formatIndonesianDate(upcomingInOtherMonth.date || upcomingInOtherMonth.start_time || '')}</span>
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-amber-400 text-amber-950 rounded-lg font-black shrink-0 ml-1.5 flex items-center gap-1">
            Lihat <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      )}

      {/* Days header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-black text-slate-400 dark:text-gray-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-1.5">
        {daysShort.map((d, idx) => (
          <div key={idx} className={idx === 0 ? 'text-rose-500 font-black' : ''}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = getDayEvents(day);
          const hasUpcoming = dayEvents.some(e => e.status === 'upcoming');
          const hasInProgress = dayEvents.some(e => e.status === 'in_progress');
          const hasCompleted = dayEvents.some(e => e.status === 'completed');
          const todayActive = isToday(day);
          const isSelected = selectedDateStr === formattedDate;

          let dayStyle = 'text-slate-700 dark:text-gray-300 hover:bg-slate-200/60 dark:hover:bg-white/10 font-bold';
          let indicator = null;

          if (hasUpcoming || hasInProgress) {
            // PENGINGAT UJIAN MENDATANG: Kuning/Amber terang mencolok (Neo-brutalist solid)
            dayStyle = 'bg-amber-400 text-amber-950 font-black border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] hover:bg-amber-300 scale-105 z-10';
            if (todayActive) {
              dayStyle += ' ring-4 ring-[#4379EE]';
            }
            indicator = (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5" title="Ada pengingat ujian mendatang!">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white dark:border-[#161C2D] text-[8px] font-mono font-black text-white items-center justify-center">
                  !
                </span>
              </span>
            );
          } else if (hasCompleted) {
            // Ujian Sudah Selesai: Hijau lembut
            dayStyle = 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60 font-bold hover:bg-emerald-200/60';
            if (todayActive) {
              dayStyle += ' ring-4 ring-[#4379EE]';
            }
            indicator = (
              <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            );
          } else if (todayActive) {
            // Hari ini tanpa ujian: Biru solid
            dayStyle = 'bg-[#4379EE] text-white font-black border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] hover:bg-blue-600';
          }

          if (isSelected && !hasUpcoming && !hasInProgress && !todayActive && !hasCompleted) {
            dayStyle += ' ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/40';
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                setSelectedDateStr(prev => (prev === formattedDate ? null : formattedDate));
                if (onSelectDate) onSelectDate(new Date(year, month, day));
              }}
              className={`h-8 w-8 mx-auto rounded-xl flex flex-col items-center justify-center transition relative text-xs font-mono cursor-pointer active:scale-95 ${dayStyle}`}
              title={
                hasUpcoming || hasInProgress
                  ? `Tanggal ${day} ${monthNames[month]}: Ada Ujian Mendatang!`
                  : hasCompleted
                  ? `Tanggal ${day} ${monthNames[month]}: Ujian Selesai`
                  : todayActive
                  ? `Hari Ini (${day} ${monthNames[month]})`
                  : `${day} ${monthNames[month]}`
              }
            >
              <span>{day}</span>
              {indicator}
            </button>
          );
        })}
      </div>

      {/* Legend Guide Pengingat Ujian */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 pb-1 border-t border-slate-200 dark:border-white/10 text-[10px] font-bold">
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700/40">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400 border border-[#161C2D] shadow-xs shrink-0"></span>
          <span className="text-amber-900 dark:text-amber-300">Ujian Mendatang</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700/40">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100 border border-emerald-500 shrink-0"></span>
          <span className="text-emerald-800 dark:text-emerald-300">Selesai</span>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-lg border border-blue-300 dark:border-blue-700/40">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#4379EE] border border-[#161C2D] shrink-0"></span>
          <span className="text-[#4379EE] dark:text-blue-300">Hari Ini</span>
        </div>
      </div>

      {/* Interactive Detail Panel for Clicked Date */}
      {selectedDateStr && (
        <div className="p-3 bg-slate-50 dark:bg-white/[0.03] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl space-y-2 animate-fade-in shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1.5">
            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
              📅 {formatFullIndonesianDate(selectedDateStr)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDateStr(null)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md cursor-pointer"
              title="Tutup detail tanggal"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedEvents.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {selectedEvents.map((ev, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    ev.status === 'upcoming' || ev.status === 'in_progress'
                      ? 'bg-amber-100/70 border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-200'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate leading-tight">{ev.title}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{ev.subject_name || ev.subject_code}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase ${
                      ev.status === 'upcoming' || ev.status === 'in_progress'
                        ? 'bg-amber-400 text-amber-950 border border-amber-600'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}>
                      {ev.status === 'upcoming' ? 'Mendatang' : ev.status === 'in_progress' ? 'Aktif' : 'Selesai'}
                    </span>
                    {ev.exam_group_id && onSelectExam && (
                      <button
                        type="button"
                        onClick={() => onSelectExam(ev.exam_group_id!)}
                        className="p-1 rounded-md bg-white/60 dark:bg-black/30 hover:bg-white text-slate-700 dark:text-gray-200 cursor-pointer"
                        title="Buka ujian ini"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-gray-400 italic text-center py-1">
              Tidak ada jadwal ujian pada tanggal ini.
            </p>
          )}
        </div>
      )}

      {/* Upcoming events preview (Pengingat Ujian Mendatang) */}
      <div className="border-t border-slate-200/80 dark:border-white/5 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-amber-500 animate-bounce" />
            <span>Pengingat Ujian Mendatang:</span>
          </p>
          <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/30">
            {upcomingExams.length} Ujian
          </span>
        </div>

        {upcomingExams.length > 0 ? (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {upcomingExams.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                onClick={() => jumpToExamDate(item)}
                className="flex items-center justify-between text-xs p-2.5 bg-amber-50/70 hover:bg-amber-100/90 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/40 rounded-xl transition shadow-xs cursor-pointer active:scale-[0.99]"
                title="Klik untuk melihat tanggal di kalender"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-900 dark:text-white truncate block text-xs">
                    {item.title}
                  </span>
                  {item.subject_name && (
                    <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium truncate block">
                      {item.subject_name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] font-mono font-bold text-amber-900 dark:text-amber-300 px-2 py-0.5 bg-amber-200/80 dark:bg-amber-500/20 rounded-md border border-amber-300 dark:border-amber-500/30">
                    {formatIndonesianDate(item.date || item.start_time || '')}
                  </span>
                  {item.duration_minutes && (
                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                      {item.duration_minutes} Menit
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl text-center">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>Semua ujian telah diselesaikan</span>
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
