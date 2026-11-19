import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Bell, CheckCircle2 } from 'lucide-react';

export interface CalendarHighlightItem {
  date: string; // YYYY-MM-DD
  title: string;
  type?: 'upcoming' | 'completed' | 'exam' | 'today' | 'submission' | 'event';
  examGroupId?: number;
}

export type HighlightDate = CalendarHighlightItem;

export interface UpcomingExamItem {
  id: number | string;
  title: string;
  subject_name: string;
  subject_code?: string;
  start_time: string;
  duration_minutes: number;
  attempt?: any;
}

interface CalendarWidgetProps {
  highlights?: CalendarHighlightItem[];
  upcomingExams?: UpcomingExamItem[];
  totalUpcomingCount?: number;
  onSelectDate?: (date: Date, highlights?: CalendarHighlightItem[]) => void;
  onExamClick?: (exam: UpcomingExamItem) => void;
  className?: string;
}

export const toLocalDateKey = (dateStr?: string): string => {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  highlights = [],
  upcomingExams = [],
  totalUpcomingCount,
  onSelectDate,
  onExamClick,
  className = ''
}) => {
  const [currentDate, setCurrentDate] = useState(() => {
    // Default to the month of the first upcoming exam if available, else today
    if (upcomingExams.length > 0 && upcomingExams[0].start_time) {
      const d = new Date(upcomingExams[0].start_time);
      if (!isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
    }
    return new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Automatically sync calendar to the month of the nearest upcoming exam or highlights if current viewed month has no exams
  useEffect(() => {
    const currentPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const hasExamsInCurrentMonth = highlights.some(h => toLocalDateKey(h.date).startsWith(currentPrefix));

    if (!hasExamsInCurrentMonth) {
      if (upcomingExams.length > 0 && upcomingExams[0].start_time) {
        const d = new Date(upcomingExams[0].start_time);
        if (!isNaN(d.getTime())) {
          setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
          return;
        }
      }
      if (highlights.length > 0 && highlights[0].date) {
        const d = new Date(highlights[0].date);
        if (!isNaN(d.getTime())) {
          setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
    }
  }, [upcomingExams, highlights]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysShort = [
    { label: 'MIN', isSunday: true },
    { label: 'SEN', isSunday: false },
    { label: 'SEL', isSunday: false },
    { label: 'RAB', isSunday: false },
    { label: 'KAM', isSunday: false },
    { label: 'JUM', isSunday: false },
    { label: 'SAB', isSunday: false }
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const getHighlightsForDay = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return highlights.filter(h => toLocalDateKey(h.date) === formatted);
  };

  // Sort upcoming exams strictly by closest start_time first (terdekat paling atas)
  const sortedUpcomingExams = [...upcomingExams].sort((a, b) => {
    const timeA = new Date(a.start_time).getTime();
    const timeB = new Date(b.start_time).getTime();
    return timeA - timeB;
  });

  const displayCount = totalUpcomingCount !== undefined ? totalUpcomingCount : sortedUpcomingExams.length;

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`bg-white dark:bg-[#1A1E22] rounded-3xl border-2 border-[#161C2D] dark:border-[#32363A] p-5 sm:p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-5 ${className}`}>
      
      {/* 1. Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
            <CalendarIcon className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {monthNames[month]} {year}
            </h4>
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400 mt-0.5">
              KALENDER & PENGINGAT UJIAN
            </p>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Bulan Sebelumnya"
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Bulan Berikutnya"
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Note: Kotak lonjong "Ujian terdekat" explicitly REMOVED per user instructions */}

      {/* 2. Days Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-black tracking-wider">
        {daysShort.map((d, idx) => (
          <div
            key={idx}
            className={`py-1 ${d.isSunday ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-gray-400'}`}
          >
            {d.label}
          </div>
        ))}
      </div>

      {/* 3. Calendar Grid Numbers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs">
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9 w-9 mx-auto" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const todayActive = isToday(day);
          const dayHighlights = getHighlightsForDay(day);
          const hasUpcoming = dayHighlights.some(h => h.type === 'upcoming' || h.type === 'exam');
          const hasCompleted = dayHighlights.some(h => h.type === 'completed');

          let cellStyle = 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5';
          let showBadge = false;

          if (todayActive) {
            // Hari Ini: Solid blue circle with drop shadow in both light and dark themes
            cellStyle = 'bg-[#2563EB] text-white font-black border-2 border-[#161C2D] dark:border-blue-400 shadow-[2px_2px_0px_0px_#171717] dark:shadow-none';
          } else if (hasUpcoming) {
            // Ujian Mendatang: Solid amber circle with shadow and exclamation badge
            cellStyle = 'bg-[#F59E0B] text-white font-black border-2 border-[#161C2D] dark:border-amber-400 shadow-[2px_2px_0px_0px_#171717] dark:shadow-none';
            showBadge = true;
          } else if (hasCompleted) {
            // Selesai: Mint green circle with green border
            cellStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-500 font-bold';
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                if (onSelectDate) onSelectDate(new Date(year, month, day), dayHighlights);
                const firstExam = dayHighlights.find(h => h.examGroupId);
                if (firstExam && onExamClick) {
                  const examObj = upcomingExams.find(e => String(e.id) === String(firstExam.examGroupId));
                  if (examObj) {
                    onExamClick(examObj);
                  } else {
                    onExamClick({
                      id: firstExam.examGroupId || '',
                      title: firstExam.title,
                      subject_name: '',
                      start_time: firstExam.date,
                      duration_minutes: 60
                    });
                  }
                }
              }}
              className={`h-9 w-9 mx-auto rounded-full flex flex-col items-center justify-center font-bold text-xs relative transition active:scale-95 cursor-pointer ${cellStyle}`}
            >
              <span>{day}</span>
              {showBadge && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-white dark:border-[#1A1E22]">
                  !
                </span>
              )}
              {hasCompleted && !todayActive && !hasUpcoming && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Legend Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 text-[11px] font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <span>Ujian Mendatang</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 text-[11px] font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Selesai</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-300 dark:border-blue-500/40 bg-blue-50/70 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 text-[11px] font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
          <span>Hari Ini</span>
        </div>
      </div>

      {/* 5. Section: PENGINGAT UJIAN MENDATANG */}
      <div className="border-t border-slate-200/80 dark:border-white/10 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500 fill-amber-500/20" />
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-200">
              PENGINGAT UJIAN MENDATANG:
            </h5>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-600/40 text-amber-900 dark:text-amber-300 font-black text-xs font-mono">
            {displayCount} Ujian
          </span>
        </div>

        {/* List of upcoming exams sorted by closest date first */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar">
          {sortedUpcomingExams.length > 0 ? (
            sortedUpcomingExams.slice(0, 4).map((exam) => (
              <div
                key={exam.id}
                onClick={() => onExamClick && onExamClick(exam)}
                className={`p-3 sm:p-3.5 rounded-2xl border-2 border-amber-300/90 dark:border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/25 transition flex items-center justify-between gap-3 ${
                  onExamClick ? 'cursor-pointer active:scale-[0.99]' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <h6 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                    {exam.title}
                  </h6>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium truncate mt-0.5">
                    {exam.subject_name}
                  </p>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300 font-bold text-[10.5px] font-mono">
                    {formatShortDate(exam.start_time)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium mt-1">
                    {exam.duration_minutes} Menit
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-500 dark:text-gray-400 text-xs font-medium space-y-1">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-gray-300">Tidak ada ujian mendatang</p>
              <p className="text-[11px]">Semua jadwal ujian telah tuntas atau belum dijadwalkan.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
