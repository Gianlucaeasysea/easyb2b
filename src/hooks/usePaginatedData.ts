import { useState, useMemo, useEffect } from "react";

interface UsePaginatedDataOptions<T> {
  data: T[] | undefined;
  pageSize?: number;
}

interface UsePaginatedDataReturn<T> {
  pageData: T[];
  page: number;
  totalPages: number;
  totalCount: number;
  from: number;
  to: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (p: number) => void;
  resetPage: () => void;
}

export function usePaginatedData<T>({ data, pageSize = 25 }: UsePaginatedDataOptions<T>): UsePaginatedDataReturn<T> {
  const [page, setPage] = useState(1);

  const totalCount = data?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Reset to page 1 when data length changes significantly (filter change)
  useEffect(() => {
    setPage(1);
  }, [totalCount]);

  const pageData = useMemo(() => {
    if (!data) return [];
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return {
    pageData,
    page,
    totalPages,
    totalCount,
    from,
    to,
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
    goToPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    resetPage: () => setPage(1),
  };
}
