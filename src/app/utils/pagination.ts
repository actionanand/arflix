export type PageToken = number | 'ellipsis';

export function visiblePageTokens(
  currentPage: number,
  totalPages: number,
  maxVisiblePages = 7,
): PageToken[] {
  const lastPage = Math.max(1, Math.min(totalPages, 500));
  const page = Math.min(Math.max(currentPage, 1), lastPage);
  const visibleCount = Math.max(5, maxVisiblePages);

  if (lastPage <= visibleCount) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', lastPage];
  }

  if (page >= lastPage - 3) {
    return [1, 'ellipsis', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage];
  }

  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', lastPage];
}
