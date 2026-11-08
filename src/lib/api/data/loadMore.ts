/**
 * The "show more" half of an infinite list: only offered when a cursor came
 * back. Shared by every cursor-paged list (admin credits, the preview picker).
 */
export function loadMoreOf(query: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  return {
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
    loadMore: () => void query.fetchNextPage(),
  };
}
