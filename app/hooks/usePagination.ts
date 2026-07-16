"use client";

import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [8, 12, 20] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function getPageWindow(itemCount: number, pageSize: number, requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = itemCount ? (currentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, itemCount);

  return { totalPages, currentPage, startIndex, endIndex };
}

export function usePagination<T>(items: T[], initialPageSize: PageSize = 8) {
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);
  const page = getPageWindow(items.length, pageSize, requestedPage);
  const pageItems = useMemo(
    () => items.slice(page.startIndex, page.endIndex),
    [items, page.startIndex, page.endIndex],
  );

  const resetPage = () => setRequestedPage(1);
  const changePageSize = (nextPageSize: PageSize) => {
    setPageSizeState(nextPageSize);
    resetPage();
  };

  return {
    ...page,
    pageSize,
    pageItems,
    resetPage,
    changePageSize,
    goToFirstPage: () => setRequestedPage(1),
    goToPreviousPage: () => setRequestedPage((current) => Math.max(1, current - 1)),
    goToNextPage: () => setRequestedPage((current) => Math.min(page.totalPages, current + 1)),
    goToLastPage: () => setRequestedPage(page.totalPages),
  };
}
