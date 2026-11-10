import React from 'react';
import { 
  CheckCircle2, AlertCircle, 
  ChevronRight, Filter, RotateCcw, Target, Award
} from 'lucide-react';

export interface SubjectKkmStat {
  subject_id?: number | null;
  subject_code: string;
  subject_name: string;
  kkm: number;
  total_exams: number;
  completed_exams: number;
  scored_exams: number;
  avg_score: number | null;
  latest_score: number | null;
  is_tuntas: boolean;
  score_diff: number | null; // score - kkm
}

interface SubjectKkmMonitorProps {
  subjects: SubjectKkmStat[];
  activeSubjectFilter?: string | null;
  onSelectSubject?: (subjectName: string | null) => void;
}

export const SubjectKkmMonitor: React.FC<SubjectKkmMonitorProps> = ({
  subjects,
  activeSubjectFilter,
  onSelectSubject
}) => {
  if (subjects.length === 0) return null;

  return (
    <div className="mt-5 pt-5 border-t-2 border-[#161C2D]/10 dark:border-white/10 space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-200">
            Pemantauan KKM per Mata Pelajaran
          </h4>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-gray-400">
          Standar Minimum: 70–80
        </span>
      </div>

      <div className="space-y-3">
        {subjects.map((sub) => {
          const hasScore = sub.avg_score !== null;
          const score = hasScore ? sub.avg_score! : 0;
          const isTuntas = hasScore && score >= sub.kkm;
          const diff = hasScore ? score - sub.kkm : null;
          const isSelected = activeSubjectFilter === sub.subject_name;

          return (
            <div 
              key={sub.subject_code}
              onClick={() => onSelectSubject?.(isSelected ? null : sub.subject_name)}
              className={`p-3 rounded-xl border space-y-2 transition cursor-pointer ${
                isSelected 
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-xs' 
                  : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
              title="Klik untuk menyaring jadwal ujian mata pelajaran ini"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {sub.subject_name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400">
                      {sub.subject_code}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                    KKM: <span className="font-bold text-slate-700 dark:text-gray-300">{sub.kkm}</span>
                    {hasScore && (
                      <> • Nilai: <span className={`font-bold ${isTuntas ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{score}</span>/100</>
                    )}
                  </p>
                </div>

                {hasScore ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    isTuntas 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                  }`}>
                    {isTuntas ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Tuntas</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                        <span>Belum Tuntas</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400 border border-slate-200 dark:border-white/10">
                    Belum Dikerjakan
                  </span>
                )}
              </div>

              {/* Progress bar towards KKM */}
              <div className="space-y-1">
                <div className="relative w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  {/* Student score progress */}
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      !hasScore 
                        ? 'bg-transparent'
                        : isTuntas 
                        ? 'bg-emerald-500' 
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                  />
                  {/* KKM vertical marker line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-800 dark:bg-white z-10 opacity-70"
                    style={{ left: `${sub.kkm}%` }}
                    title={`Garis Batas KKM (${sub.kkm})`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 dark:text-gray-500">0</span>
                  {hasScore && diff !== null ? (
                    <span className={`font-bold ${isTuntas ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {diff >= 0 ? `+${diff} poin di atas KKM` : `Kurang ${Math.abs(diff)} poin dari KKM`}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-gray-500">Target KKM: {sub.kkm}</span>
                  )}
                  <span className="text-slate-400 dark:text-gray-500">100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface SubjectExamSummaryCardProps {
  subjects: SubjectKkmStat[];
  activeSubjectFilter?: string | null;
  onSelectSubject: (subjectName: string | null) => void;
}

export const SubjectExamSummaryCard: React.FC<SubjectExamSummaryCardProps> = ({
  subjects,
  activeSubjectFilter,
  onSelectSubject
}) => {
  return (
    <div className="bg-white dark:bg-[#1A1E22] rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] p-5 md:p-6 space-y-4 font-sans transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-300 dark:border-emerald-700">
            <Award className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hasil Ujian per Mapel
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
              Ketuntasan nilai KKM tiap mata pelajaran
            </p>
          </div>
        </div>

        {activeSubjectFilter && (
          <button
            onClick={() => onSelectSubject(null)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 text-[10px] font-bold transition cursor-pointer"
            title="Tampilkan seluruh mata pelajaran"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400 dark:text-gray-500">
          Belum ada data mata pelajaran yang tersedia.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {subjects.map((sub) => {
            const hasScore = sub.avg_score !== null;
            const score = hasScore ? sub.avg_score! : 0;
            const isTuntas = hasScore && score >= sub.kkm;
            const isSelected = activeSubjectFilter === sub.subject_name;

            return (
              <div
                key={sub.subject_code}
                onClick={() => onSelectSubject(isSelected ? null : sub.subject_name)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-400 shadow-[2px_2px_0px_0px_#4f46e5]'
                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-[#32363A] hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-100/60'
                }`}
                title="Klik untuk menyaring daftar jadwal ujian mata pelajaran ini"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {sub.subject_name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400 font-bold">
                      {sub.subject_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500 dark:text-gray-400">
                    <span>{sub.completed_exams} Ujian Selesai</span>
                    <span>•</span>
                    <span>KKM: {sub.kkm}</span>
                    {hasScore && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-800 dark:text-gray-200">
                          Skor: {score}/100
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasScore ? (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                      isTuntas
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                    }`}>
                      {isTuntas ? 'Memenuhi' : 'Belum Memenuhi'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400 border border-slate-200 dark:border-white/10">
                      Belum Ada Nilai
                    </span>
                  )}
                  <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90 text-indigo-600' : 'text-slate-400'}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful instruction hint */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-indigo-500" />
          <span>Klik mapel untuk menyaring jadwal ujian di bawah</span>
        </span>
        {activeSubjectFilter && (
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            Aktif: {activeSubjectFilter}
          </span>
        )}
      </div>
    </div>
  );
};
