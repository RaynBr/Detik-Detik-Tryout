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
  const setPage = useCallback((newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newPage <= 1) {
        next.set('page', '1');
      } else {
        next.set('page', String(newPage));
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
    const cur = paginatorData.current_page || 1;
    const last = paginatorData.last_page || 1;
    const tot = paginatorData.total !== undefined ? paginatorData.total : (paginatorData.data?.length || 0);
    const per = paginatorData.per_page || defaultPerPage;
    const fromVal = paginatorData.from !== undefined ? paginatorData.from : (tot > 0 ? (cur - 1) * per + 1 : 0);
    const toVal = paginatorData.to !== undefined ? paginatorData.to : (tot > 0 ? Math.min(cur * per, tot) : 0);

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
