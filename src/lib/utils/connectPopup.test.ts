import { openConsentWindow, waitForConsent } from './connectPopup';

type FakePopup = {
  closed: boolean;
  location: { replace: ReturnType<typeof vi.fn> };
  close: ReturnType<typeof vi.fn>;
};

const popup = (over: Partial<FakePopup> = {}): FakePopup => ({
  closed: false,
  location: { replace: vi.fn() },
  close: vi.fn(),
  ...over,
});

const URL_ = 'https://accounts.google.com/o/oauth2/auth?x=1';

describe('openConsentWindow', () => {
  it('opens a blank window so the user gesture is not lost to an await', () => {
    const open = vi.fn().mockReturnValue({} as Window);
    openConsentWindow(open);
    expect(open).toHaveBeenCalledWith('', 'ef-google-calendar', expect.stringContaining('popup=yes'));
  });

  it('reports a blocked popup as null rather than throwing', () => {
    expect(openConsentWindow(() => null)).toBeNull();
  });
});

describe('waitForConsent', () => {
  it('is blocked when there is no popup', async () => {
    expect(await waitForConsent(null, URL_, { isDone: async () => true })).toBe('blocked');
  });

  it('sends the popup to the consent url', async () => {
    const p = popup();
    await waitForConsent(p as unknown as Window, URL_, { isDone: async () => true, pollMs: 1 });
    expect(p.location.replace).toHaveBeenCalledWith(URL_);
  });

  it('closes the popup itself once the server shows the grant', async () => {
    const p = popup();
    const outcome = await waitForConsent(p as unknown as Window, URL_, {
      isDone: async () => true,
      pollMs: 1,
    });
    expect(outcome).toBe('connected');
    // It would otherwise sit on a page of JSON that means nothing to anyone.
    expect(p.close).toHaveBeenCalled();
  });

  /** Denying consent writes nothing, so nothing ever flips (backend reply #4). */
  it('gives up rather than polling for ever', async () => {
    let clock = 0;
    const outcome = await waitForConsent(popup() as unknown as Window, URL_, {
      isDone: async () => {
        clock += 500_000;
        return false;
      },
      pollMs: 1,
      timeoutMs: 1000,
      now: () => clock,
    });
    expect(outcome).toBe('timeout');
  });

  it('reports a closed popup as nothing connected', async () => {
    let clock = 0;
    const outcome = await waitForConsent(popup({ closed: true }) as unknown as Window, URL_, {
      isDone: async () => {
        clock += 10;
        return false;
      },
      pollMs: 1,
      timeoutMs: 10_000_000,
      now: () => clock,
    });
    expect(outcome).toBe('cancelled');
  });

  /** The grant may land just before the window closes; giving up there would
   *  report a success as a cancellation. */
  it('checks once more after the popup closes', async () => {
    let clock = 0;
    let calls = 0;
    const p = popup({ closed: true });
    const outcome = await waitForConsent(p as unknown as Window, URL_, {
      isDone: async () => {
        clock += 10;
        calls += 1;
        return calls > 1;
      },
      pollMs: 1,
      timeoutMs: 10_000_000,
      now: () => clock,
    });
    expect(outcome).toBe('connected');
  });
});

/**
 * The popup still holds the about:blank document we opened, so it inherits our
 * origin: a `javascript:` url would run as us, not in a sandbox.
 */
describe('waitForConsent url check', () => {
  it.each(['javascript:alert(1)', 'data:text/html,<script>1</script>', 'file:///etc/passwd'])(
    'refuses to send the popup to %s',
    async (bad) => {
      const p = popup();
      const outcome = await waitForConsent(p as unknown as Window, bad, {
        isDone: async () => true,
        pollMs: 1,
      });
      expect(outcome).toBe('refused');
      expect(p.location.replace).not.toHaveBeenCalled();
      expect(p.close).toHaveBeenCalled();
    },
  );

  it('allows the https url the API actually returns', async () => {
    const p = popup();
    await waitForConsent(p as unknown as Window, URL_, { isDone: async () => true, pollMs: 1 });
    expect(p.location.replace).toHaveBeenCalledWith(URL_);
  });

  /** The dev mock answers a relative path; it must resolve, not be refused. */
  it('allows a relative url by resolving it against our origin', async () => {
    const p = popup();
    const outcome = await waitForConsent(p as unknown as Window, '/api/mock/granted', {
      isDone: async () => true,
      pollMs: 1,
    });
    expect(outcome).toBe('connected');
    expect(p.location.replace).toHaveBeenCalledWith(expect.stringContaining('/api/mock/granted'));
  });
});
