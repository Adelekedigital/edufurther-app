import { within } from './within';

describe('within', () => {
  afterEach(() => vi.useRealTimers());

  it('the answer, when it comes in time', async () => {
    await expect(within(1000, Promise.resolve(3))).resolves.toBe(3);
  });

  it('null once the time is up', async () => {
    vi.useFakeTimers();
    const p = within(2000, new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toBeNull();
  });
});
