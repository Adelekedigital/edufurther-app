import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WireEmailSave } from '@/lib/api/data/pending';
import {
  mockEmailDetail,
  mockEmailValues,
  mockSaveEmailVariant,
  resetMockEmails,
} from '@/lib/api/mock/adminEmails';
import { admin, renderScreen, res } from '../../../_test/adminHarness';

const h = vi.hoisted(() => ({ GET: vi.fn(), PUT: vi.fn() }));
vi.mock('@/lib/api/data/http', () => ({ api: { GET: h.GET, PUT: h.PUT } }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => admin() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/emails/x', useRouter: () => ({}) }));

const { EmailEditorScreen } = await import('./EmailEditorScreen');

type Init = { params: { path: { key: string; variant?: string } }; body?: WireEmailSave };
let putOverride: (() => unknown) | null = null;

beforeEach(() => {
  resetMockEmails();
  putOverride = null;
  h.GET.mockReset().mockImplementation(async (path: string, init?: Init) => {
    if (path === '/api/v1/admin/email-values') return res({ data: mockEmailValues() });
    if (path === '/api/v1/admin/emails/{key}') {
      const e = mockEmailDetail(init!.params.path.key);
      return e ? res(e) : res({ type: '/problems/email-not-found' }, 404);
    }
    return res(null, 404);
  });
  h.PUT.mockReset().mockImplementation(async (_path: string, init: Init) => {
    if (putOverride) return putOverride();
    const r = mockSaveEmailVariant(init.params.path.key, init.params.path.variant!, init.body!);
    return r.ok ? res(r.body) : res(r.problem, r.status);
  });
});

const open = async (key = 'session_booked') => {
  renderScreen(<EmailEditorScreen emailKey={key} />);
  return screen.findByRole('heading', { level: 1 });
};
const field = (name: string) => screen.getByRole('textbox', { name });
const saveBar = () => screen.queryByRole('region', { name: 'Save changes' });

async function replace(name: string, text: string) {
  await userEvent.clear(field(name));
  if (text) await userEvent.type(field(name), text.replace(/[{]/g, '{{'));
}

describe('Edit an email', () => {
  it('header, variant pills, the three lines with their badges, and the preview', async () => {
    expect(await open()).toHaveTextContent('Session booked');
    expect(
      screen.getByText(
        'A booking is confirmed straight away · Goes to mentor and mentee · Template “session_confirmed”, shared with 1 other email',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All emails' })).toHaveAttribute(
      'href',
      '/admin/emails',
    );
    const tabs = screen.getByRole('tablist', { name: 'Who gets it' });
    expect(
      within(tabs).getByRole('tab', { name: 'To the mentee', selected: true }),
    ).toBeInTheDocument();
    expect(field('Subject')).toHaveValue('Your session with {mentorName} is confirmed');
    expect(screen.getAllByText('Edited')).toHaveLength(1);
    expect(screen.getAllByText('Default')).toHaveLength(2);
    const preview = screen.getByRole('complementary', { name: 'Preview' });
    expect(
      within(preview).getByText('Your session with Tunde Bakare is confirmed'),
    ).toBeInTheDocument();
    expect(
      within(preview).getByText('From EduFurther · To amara.okafor@example.com'),
    ).toBeInTheDocument();
    expect(saveBar()).toBeNull();
  });

  it('typing updates the preview and shows the save bar; Discard puts it back', async () => {
    await open();
    await replace('Heading', 'See you soon');
    const preview = screen.getByRole('complementary', { name: 'Preview' });
    expect(within(preview).getByText('See you soon')).toBeInTheDocument();
    expect(saveBar()).toHaveTextContent('You have unsaved changes.');
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(field('Heading')).toHaveValue("You're booked with {mentorName}");
    expect(saveBar()).toBeNull();
  });

  it('a bad line: errors after the first Save press, and no confirm', async () => {
    await open();
    await replace('Subject', 'Hi {mentorname}');
    expect(screen.queryByText(/isn’t a value we know/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen.getByText('{mentorname} isn’t a value we know. Did you mean {mentorName}?'),
    ).toBeInTheDocument();
    expect(saveBar()).toHaveTextContent('Fix 1 line before saving.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(h.PUT).not.toHaveBeenCalled();
  });

  it('Save, confirm: the variant is saved with its versions, a toast, the bar goes', async () => {
    await open();
    await replace('Heading', 'See you soon');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Save changes to Session booked?' });
    expect(
      within(dialog).getByText(
        'The next Session booked email (to the mentee) uses this wording. Emails already sent don’t change.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Session booked saved. The next email uses it.');
    const body = h.PUT.mock.calls[0]![1].body as WireEmailSave;
    expect(body.lines.subject!.version).toBe(2);
    expect(body.lines.heading).toEqual({ text: 'See you soon', version: 0 });
    expect(body.keep_edit).toBeUndefined();
    await waitFor(() => expect(saveBar()).toBeNull());
    expect(screen.getAllByText('Edited')).toHaveLength(2);
  });

  it('another admin saved first (409): the conflict bar, the draft kept; Reload drops it', async () => {
    putOverride = () =>
      res(
        {
          type: '/problems/email-line-conflict',
          updated_by_name: 'Chidi Eze',
          updated_at: new Date(Date.now() - 2 * 60_000).toISOString(),
        },
        409,
      );
    await open();
    await replace('Heading', 'See you soon');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save changes' }),
    );
    expect(
      await screen.findByText(
        'Chidi Eze saved this email 2 minutes ago, so your changes weren’t saved. They’re still here. Reload to see Chidi’s version, then make your changes again.',
      ),
    ).toBeInTheDocument();
    expect(field('Heading')).toHaveValue('See you soon');
    await userEvent.click(screen.getByRole('button', { name: 'Reload this email' }));
    expect(field('Heading')).toHaveValue("You're booked with {mentorName}");
    expect(screen.queryByText(/saved this email/)).toBeNull();
  });

  it('a failed save keeps the draft and says so', async () => {
    putOverride = () => res({ type: 'about:blank' }, 500);
    await open();
    await replace('Heading', 'See you soon');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save changes' }),
    );
    expect(
      await screen.findByText('That didn’t go through. Nothing changed, try again.'),
    ).toBeInTheDocument();
    expect(field('Heading')).toHaveValue('See you soon');
  });

  it('the server refuses a line (422): its error shows on that line', async () => {
    putOverride = () =>
      res(
        {
          type: '/problems/email-line-invalid',
          errors: [{ line: 'heading', code: 'value_not_sent', value: 'code' }],
        },
        422,
      );
    await open();
    await replace('Heading', 'See you soon');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save changes' }),
    );
    expect(
      await screen.findByText(
        '{code} isn’t sent with Session booked, so it would show up empty. Pick one from Insert a value.',
      ),
    ).toBeInTheDocument();
    // It blocks Save until the line is edited; editing it hands back to the live check.
    putOverride = null;
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await replace('Heading', 'See you then');
    expect(screen.queryByText(/isn’t sent with/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('each variant keeps its own draft', async () => {
    await open();
    await replace('Heading', 'Mentee words');
    await userEvent.click(screen.getByRole('tab', { name: 'To the mentor' }));
    expect(field('Heading')).toHaveValue('{menteeName} booked a session with you');
    await userEvent.click(screen.getByRole('tab', { name: /^To the mentee/ }));
    expect(field('Heading')).toHaveValue('Mentee words');
  });

  it('Reset to default puts the default in as an unsaved change', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(field('Subject')).toHaveValue('Your session with {mentorName} is booked');
    expect(saveBar()).toBeInTheDocument();
    expect(screen.queryByText('Edited')).toBeNull();
  });

  it('a default that changed: Keep my edit is saved as keep_edit', async () => {
    await open('credits_expiring');
    expect(
      screen.getByText(
        'New default: “Your credits expire soon”. Your edit is still the one being sent.',
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Keep my edit' }));
    expect(screen.queryByText(/The default changed/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(
        'The next Credits expiring email uses this wording. Emails already sent don’t change.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Credits expiring saved. The next email uses it.');
    expect((h.PUT.mock.calls[0]![1].body as WireEmailSave).keep_edit).toEqual(['subject']);
  });

  it('a default that changed: Use the new default fills the field', async () => {
    await open('credits_expiring');
    await userEvent.click(screen.getByRole('button', { name: 'Use the new default' }));
    expect(field('Subject')).toHaveValue('Your credits expire soon');
    expect(saveBar()).toBeInTheDocument();
  });

  it('Not set up: the notice, read-only lines, nothing to reset or save', async () => {
    await open('sign_in_code');
    expect(
      screen.getByText(
        'This email has no template yet, so it isn’t sent. An engineer needs to connect one before you can change the wording.',
      ),
    ).toBeInTheDocument();
    expect(field('Subject')).toHaveAttribute('readonly');
    expect(screen.getAllByRole('button', { name: 'Insert a value' })[0]).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Reset to default' })).toBeNull();
    expect(saveBar()).toBeNull();
  });

  it('another admin saves while I edit, and a refetch brings theirs in: my Save is a 409, not an overwrite', async () => {
    const { qc } = renderScreen(<EmailEditorScreen emailKey="session_booked" />);
    await screen.findByRole('heading', { level: 1 });
    await replace('Heading', 'Mine');
    // Someone else saves the same line, then the window regains focus.
    mockSaveEmailVariant('session_booked', 'mentee', {
      lines: { heading: { text: 'Theirs', version: 0 } },
    });
    await act(() => qc.refetchQueries());
    expect(field('Heading')).toHaveValue('Mine');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save changes' }),
    );
    expect(await screen.findByText(/saved this email/)).toBeInTheDocument();
    expect((h.PUT.mock.calls[0]![1].body as WireEmailSave).lines.heading).toEqual({
      text: 'Mine',
      version: 0,
    });
    expect(mockEmailDetail('session_booked')!.variants[0]!.lines.heading!.text).toBe('Theirs');
    // Another refetch, then Save again: still blocked until Reload.
    await act(() => qc.refetchQueries());
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(saveBar()).toHaveTextContent('Reload this email before saving.');
    expect(h.PUT).toHaveBeenCalledTimes(1);
  });

  it('a 409 refetches nothing; Reload refetches, then drops the draft', async () => {
    putOverride = () =>
      res(
        {
          type: '/problems/email-line-conflict',
          updated_by_name: 'Chidi Eze',
          updated_at: new Date().toISOString(),
        },
        409,
      );
    await open();
    await replace('Heading', 'Mine');
    const detailGets = () =>
      h.GET.mock.calls.filter((c) => c[0] === '/api/v1/admin/emails/{key}').length;
    const before = detailGets();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save changes' }),
    );
    await screen.findByText(/saved this email/);
    expect(detailGets()).toBe(before);
    await userEvent.click(screen.getByRole('button', { name: 'Reload this email' }));
    await waitFor(() => expect(detailGets()).toBe(before + 1));
    expect(field('Heading')).toHaveValue("You're booked with {mentorName}");
  });

  it('a Reload that fails keeps the draft and the conflict, and says so', async () => {
    putOverride = () =>
      res(
        {
          type: '/problems/email-line-conflict',
          updated_by_name: '',
          updated_at: new Date().toISOString(),
        },
        409,
      );
    await open();
    await replace('Heading', 'Mine');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save changes' }),
    );
    expect(
      await screen.findByText(
        'Someone saved this email just now, so your changes weren’t saved. They’re still here. Reload to see their version, then make your changes again.',
      ),
    ).toBeInTheDocument();
    h.GET.mockImplementation(async () => res({ type: 'about:blank' }, 400));
    await userEvent.click(screen.getByRole('button', { name: 'Reload this email' }));
    expect(
      await screen.findByText('That didn’t go through. Nothing changed, try again.'),
    ).toBeInTheDocument();
    expect(field('Heading')).toHaveValue('Mine');
    expect(screen.getByText(/saved this email/)).toBeInTheDocument();
  });

  it('a 423 on save (no longer set up) reloads into the read-only view', async () => {
    await open('request_accepted');
    await replace('Heading', 'Mine');
    // Engineering moved the email out of its shared template meanwhile.
    putOverride = () => res({ type: '/problems/email-not-set-up' }, 423);
    const { MOCK_EMAILS } = await import('@/lib/api/mock/adminEmails');
    const e = MOCK_EMAILS.find((x) => x.key === 'request_accepted')!;
    e.live = false;
    try {
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Save changes' }),
      );
      expect(await screen.findByText(/This email has no template yet/)).toBeInTheDocument();
      expect(field('Heading')).toHaveAttribute('readonly');
    } finally {
      e.live = true;
    }
  });

  it('errors are live after the first Save press: fixed, they go; broken again, they return', async () => {
    await open();
    await replace('Subject', 'Hi {mentorname}');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText(/isn’t a value we know/)).toBeInTheDocument();
    await replace('Subject', 'Hi {mentorName} there friend');
    expect(screen.queryByText(/isn’t a value we know/)).toBeNull();
    await replace('Subject', 'Hi {nope}');
    expect(screen.getByText(/{nope} isn’t a value we know/)).toBeInTheDocument();
  });

  it('a variant with unsaved work is marked on its tab, and leaving asks', async () => {
    const { hasUnsavedChanges } = await import('@/lib/utils/leaveGuard');
    await open();
    await replace('Heading', 'Mine');
    await userEvent.click(screen.getByRole('tab', { name: 'To the mentor' }));
    expect(saveBar()).toBeNull();
    expect(screen.getByRole('tab', { name: 'To the mentee, unsaved changes' })).toBeInTheDocument();
    expect(hasUnsavedChanges()).toBe(true);
  });

  it('an unknown email: not found, with the way back', async () => {
    renderScreen(<EmailEditorScreen emailKey="nope" />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'We couldn’t find that email' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All emails' })).toHaveAttribute(
      'href',
      '/admin/emails',
    );
  });

  it('loading, then a failed load with Try again', async () => {
    let fail = true;
    h.GET.mockImplementation(async (path: string, init?: Init) => {
      if (path === '/api/v1/admin/email-values') return res({ data: mockEmailValues() });
      return fail ? res({ type: 'about:blank' }, 400) : res(mockEmailDetail(init!.params.path.key));
    });
    renderScreen(<EmailEditorScreen emailKey="session_booked" />);
    expect(screen.getByRole('status', { name: 'Loading email' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'We couldn’t load this email' }),
    ).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Session booked' }),
    ).toBeInTheDocument();
  });
});
