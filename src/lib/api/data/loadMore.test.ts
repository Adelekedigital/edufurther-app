import { loadMoreOf } from './loadMore';

describe('loadMoreOf', () => {
  it('maps the infinite query’s next-page state, and loadMore asks for it', () => {
    const fetchNextPage = vi.fn(async () => undefined);
    const more = loadMoreOf({
      hasNextPage: true,
      isFetchingNextPage: false,
      isFetchNextPageError: true,
      fetchNextPage,
    });
    expect(more).toMatchObject({ hasMore: true, loadingMore: false, loadMoreFailed: true });
    expect(more.loadMore()).toBeUndefined();
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });
});
