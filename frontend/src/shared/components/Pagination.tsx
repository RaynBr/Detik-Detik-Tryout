import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage?: number;
  from?: number | null;
  to?: number | null;
  onPageChange: (page: number) => void;
  className?: string;
  loading?: boolean;
  showFirstLast?: boolean;
  align?: 'center' | 'between' | 'end';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  lastPage,
  total,
  perPage = 15,
  from,
  to,
  onPageChange,
  className = '',
  loading = false,
  showFirstLast = false,
  align = 'center',
}) => {
  // If no data exists
  if (total === 0) {
    return (
      <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 px-4 py-3 border-t border-slate-200/80 dark:border-white/5 text-xs text-slate-500 dark:text-gray-400 ${className}`}>
        <span>Menampilkan 0 data</span>
      </div>
    );
  }

  const safeLastPage = Math.max(1, Number(lastPage) || 1);
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), safeLastPage);

  const displayFrom = from !== undefined && from !== null 
    ? from 
    : (safeCurrentPage - 1) * perPage + 1;
  const displayTo = to !== undefined && to !== null 
    ? to 
    : Math.min(safeCurrentPage * perPage, total);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (safeLastPage <= 7) {
      for (let i = 1; i <= safeLastPage; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(safeLastPage);
      } else if (safeCurrentPage >= safeLastPage - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = safeLastPage - 4; i <= safeLastPage; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(safeCurrentPage - 1);
        pages.push(safeCurrentPage);
        pages.push(safeCurrentPage + 1);
        pages.push('...');
        pages.push(safeLastPage);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  const justifyClass = align === 'center'
    ? 'justify-center sm:gap-6'
    : align === 'end'
    ? 'justify-end sm:gap-6'
    : 'justify-between';

  return (
    <div className={`flex flex-col sm:flex-row items-center ${justifyClass} gap-3 px-4 py-3.5 border-t border-slate-200/80 dark:border-white/5 bg-transparent ${className}`}>
      {/* Information text: "Menampilkan 1–15 dari 248 data" */}
      <div className="text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">
        Menampilkan <strong className="font-bold text-slate-900 dark:text-white font-mono">{displayFrom}</strong>–<strong className="font-bold text-slate-900 dark:text-white font-mono">{displayTo}</strong> dari <strong className="font-bold text-slate-900 dark:text-white font-mono">{total}</strong> data
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
        {/* First Page */}
        {showFirstLast && safeLastPage > 7 && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1 || loading}
            aria-label="Halaman Pertama"
            title="Halaman Pertama"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}

        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1 || loading}
          aria-label="Halaman Sebelumnya"
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-xs font-mono text-slate-400 dark:text-gray-500 select-none"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === safeCurrentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              disabled={loading || isActive}
              className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/10'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeLastPage, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= safeLastPage || loading}
          aria-label="Halaman Berikutnya"
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last Page */}
        {showFirstLast && safeLastPage > 7 && (
          <button
            type="button"
            onClick={() => onPageChange(safeLastPage)}
            disabled={safeCurrentPage >= safeLastPage || loading}
            aria-label="Halaman Terakhir"
            title="Halaman Terakhir"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
