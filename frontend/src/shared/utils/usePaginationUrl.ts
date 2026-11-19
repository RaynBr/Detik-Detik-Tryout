import { useSearchParams } from 'react-router-dom';
import { useCallback, useState } from 'react';

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  from?: number | null;
  to?: number | null;
}

export function usePaginationUrl(defaultPerPage = 15) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read current page from URL
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    currentPage,
    lastPage: 1,
    total: 0,
    perPage: defaultPerPage,
    from: null,
    to: null,
  });

  // Navigate to a specific page and keep in URL
  const setPage = useCallback((newPage: number | string) => {
    const pageNum = typeof newPage === 'number' ? newPage : parseInt(String(newPage), 10);
    const validPage = isNaN(pageNum) || pageNum <= 1 ? 1 : pageNum;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (validPage <= 1) {
        next.set('page', '1');
      } else {
        next.set('page', String(validPage));
      }
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  // Reset page to 1 (used when search, filter, or sorting changes)
  const resetPage = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Update meta from Laravel Paginator response
  const setPaginationFromResponse = useCallback((paginatorData: any) => {
    if (!paginatorData) return;

    // Laravel LengthAwarePaginator standard fields
    const cur = Number(paginatorData.current_page) || 1;
    const last = Number(paginatorData.last_page) || 1;
    const tot = paginatorData.total !== undefined ? Number(paginatorData.total) : (paginatorData.data?.length || 0);
    const per = Number(paginatorData.per_page) || defaultPerPage;
    const fromVal = paginatorData.from !== undefined ? Number(paginatorData.from) : (tot > 0 ? (cur - 1) * per + 1 : 0);
    const toVal = paginatorData.to !== undefined ? Number(paginatorData.to) : (tot > 0 ? Math.min(cur * per, tot) : 0);

    setPaginationMeta({
      currentPage: cur,
      lastPage: last,
      total: tot,
      perPage: per,
      from: fromVal,
      to: toVal,
    });
  }, [defaultPerPage]);

  return {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse,
    searchParams,
    setSearchParams,
  };
}
