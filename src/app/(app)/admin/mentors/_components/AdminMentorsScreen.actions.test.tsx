import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { admin, h, res, renderScreen, serveFromStore } from './screenHarness';

vi.mock('@/lib/api/data/http', async () => {
  const { h } = await import('./screenHarness');
  return {
    api: {
      GET: (...a: unknown[]) => h.GET(...a),
      POST: (...a: unknown[]) => h.POST(...a),
    },
  };
});
vi.mock('@/lib/api/data/viewer', async () => {
  const { h } = await import('./screenHarness');
  return { useViewer: () => h.viewer };
});
const { AdminMentorsScreen } = await import('./AdminMentorsScreen');

const FAILED = 'That didn’t go through. Nothing changed, try again.';
const drawer = (name: string) => screen.findByRole('dialog', { name });
const confirmBox = () => screen.getByRole('alertdialog');

beforeEach(async () => {
  h.viewer = admin();
  h.GET.mockReset();
  h.POST.mockReset();
  await serveFromStore();
});

describe('the drawer', () => {
  it('opens on Enter from the row, closes on Escape, and focus goes back', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    const opener = await screen.findByRole('button', { name: 'Open Jimoh Marko' });
    opener.focus();
    await user.keyboard('{Enter}');
    const d = await drawer('Jimoh Marko');
    expect(within(d).getByRole('heading', { name: 'Jimoh Marko' })).toBeInTheDocument();
    expect(opener).toHaveAttribute('aria-expanded', 'true');
    expect(await within(d).findByText('Drafted weekly hours')).toBeInTheDocument();
    expect(within(d).getByText('Mon, Wed, 6:00 pm – 9:00 pm')).toBeInTheDocument();
    expect(within(d).getByText('PhD, Public Health')).toBeInTheDocument();
    expect(within(d).getByText('2023 – now')).toBeInTheDocument();
    expect(
      within(d).getByRole('link', { name: 'View as mentee (opens in a new tab)' }),
    ).toHaveAttribute('href', '/mentors/jimoh-marko');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('approved: stats, recent bookings, Email and Pause', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('tab', { name: /^Approved/ }));
    await user.click(await screen.findByRole('button', { name: 'Open Joshua Lorell' }));
    const d = await drawer('Joshua Lorell');
    expect(await within(d).findByText('Recent bookings')).toBeInTheDocument();
    expect(within(d).getByText('45%')).toBeInTheDocument();
    expect(within(d).getAllByText('Missed by mentor').length).toBeGreaterThan(0);
    expect(within(d).getByRole('link', { name: 'Email Joshua' })).toHaveAttribute(
      'href',
      'mailto:joshua.lorell@example.com',
    );
    expect(within(d).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('a mentor who paused themselves: the reason says so, and only Email', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('tab', { name: /Paused/ }));
    await user.click(await screen.findByRole('button', { name: 'Open Chidi Okonkwo' }));
    const d = await drawer('Chidi Okonkwo');
    expect(await within(d).findByText('Paused by the mentor')).toBeInTheDocument();
    expect(within(d).queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
    expect(within(d).getByRole('link', { name: 'Email Chidi' })).toBeInTheDocument();
  });

  it('notes: Add note is off while empty, and a new note shows', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(
      res(
        {
          id: 'n9',
          body: 'Checked LinkedIn.',
          created_at: '2026-10-26T10:00:00Z',
          author: {
            user_id: 'admin-1',
            first_name: 'Ada',
            last_name: 'Okeke',
            avatar_url: null,
            cover_color: null,
          },
        },
        201,
      ),
    );
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Open Jimoh Marko' }));
    const d = await drawer('Jimoh Marko');
    const add = within(d).getByRole('button', { name: 'Add note' });
    expect(add).toBeDisabled();
    await user.type(
      within(d).getByRole('textbox', { name: 'Add an internal note' }),
      'Checked LinkedIn.',
    );
    await user.click(add);
    expect(h.POST).toHaveBeenCalledWith('/api/v1/admin/mentors/{user_id}/notes', {
      params: { path: { user_id: 'm-jm' } },
      body: { body: 'Checked LinkedIn.' },
    });
    await waitFor(() =>
      expect(within(d).getByRole('textbox', { name: 'Add an internal note' })).toHaveValue(''),
    );
  });
});

describe('the confirms', () => {
  it('approve: confirm, toast, the drawer closes', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res({ decided: true }));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Open Kwame Mensah' }));
    await user.click(within(await drawer('Kwame Mensah')).getByRole('button', { name: 'Approve' }));
    expect(within(confirmBox()).getByText('Approve Kwame Mensah?')).toBeInTheDocument();
    expect(within(confirmBox()).queryByText(/drafted hours/)).not.toBeInTheDocument();
    await user.click(within(confirmBox()).getByRole('button', { name: 'Approve' }));
    expect(
      await screen.findByText('Kwame Mensah approved and listed on Explore'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(h.POST).toHaveBeenCalledWith('/api/v1/admin/mentors/{user_id}/decision', {
      params: { path: { user_id: 'm-kw' }, query: { approve: true } },
      body: {},
    });
  });

  it('not approved needs the comment: error under the box, then it sends', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res({ decided: true }));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Open Amaka Okafor' }));
    await user.click(
      within(await drawer('Amaka Okafor')).getByRole('button', { name: 'Not approved' }),
    );
    const box = within(confirmBox()).getByRole('textbox', { name: 'Comment for Amaka' });
    await user.click(within(confirmBox()).getByRole('button', { name: 'Not approved' }));
    expect(within(confirmBox()).getByText('Add a comment so they know why.')).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveFocus();
    expect(h.POST).not.toHaveBeenCalled();
    await user.type(box, 'No school yet');
    await user.click(within(confirmBox()).getByRole('button', { name: 'Not approved' }));
    expect(await screen.findByText('Amaka Okafor marked not approved')).toBeInTheDocument();
    expect(h.POST).toHaveBeenCalledWith('/api/v1/admin/mentors/{user_id}/decision', {
      params: { path: { user_id: 'm-ao' }, query: { approve: false } },
      body: { reason: 'No school yet' },
    });
  });

  it('pause needs the reason; a failed one changes nothing and says so', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res(null, 500));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('tab', { name: /^Approved/ }));
    await user.click(await screen.findByRole('button', { name: 'Open Natasha Rebel' }));
    await user.click(within(await drawer('Natasha Rebel')).getByRole('button', { name: 'Pause' }));
    await user.click(within(confirmBox()).getByRole('button', { name: 'Pause' }));
    expect(within(confirmBox()).getByText('Add a reason for other admins.')).toBeInTheDocument();
    await user.type(within(confirmBox()).getByRole('textbox'), 'No-shows');
    await user.click(within(confirmBox()).getByRole('button', { name: 'Pause' }));
    expect(await screen.findByText(FAILED)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // The drawer stays open on a failure: nothing changed.
    expect(screen.getByRole('dialog', { name: 'Natasha Rebel' })).toBeInTheDocument();
  });

  it('resume a self-paused mentor (409) says only they can', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res({ type: '/problems/mentor-paused-themselves' }, 409));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('tab', { name: /Paused/ }));
    await user.click(await screen.findByRole('button', { name: 'Open Femi Ade' }));
    await user.click(within(await drawer('Femi Ade')).getByRole('button', { name: 'Resume' }));
    await user.click(within(confirmBox()).getByRole('button', { name: 'Resume' }));
    expect(
      await screen.findByText('Femi paused themselves, so only they can resume.'),
    ).toBeInTheDocument();
  });

  it('bulk approve with a partial failure keeps the failed one checked', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res({ approved: ['m-jm'], failed: ['m-bf'] }));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select Jimoh Marko' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Bisi Folarin' }));
    const bar = screen.getByRole('region', { name: 'Bulk actions' });
    expect(within(bar).getByText('2 selected')).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: 'Approve 2' }));
    expect(within(confirmBox()).getByText('Approve 2 mentors?')).toBeInTheDocument();
    expect(within(confirmBox()).getByText('Bisi Folarin')).toBeInTheDocument();
    await user.click(within(confirmBox()).getByRole('button', { name: 'Approve 2' }));
    expect(await screen.findByText('1 approved. 1 didn’t go through.')).toBeInTheDocument();
    expect(h.POST).toHaveBeenCalledWith('/api/v1/admin/mentors/approvals', {
      body: { user_ids: ['m-jm', 'm-bf'] },
    });
    expect(screen.getByRole('checkbox', { name: 'Select Bisi Folarin' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Jimoh Marko' })).not.toBeChecked();
  });

  it('bulk approve where every one fails: all stay checked, one failure toast', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res({ approved: [], failed: ['m-jm', 'm-bf'] }));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select Jimoh Marko' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Bisi Folarin' }));
    await user.click(screen.getByRole('button', { name: 'Approve 2' }));
    await user.click(within(confirmBox()).getByRole('button', { name: 'Approve 2' }));
    expect(await screen.findByText(FAILED)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Jimoh Marko' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Bisi Folarin' })).toBeChecked();
    await waitFor(() => expect(screen.getByRole('table').parentElement).toHaveFocus());
  });

  it('a bulk request that fails outright keeps the checks and says so', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res(null, 503));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select Jimoh Marko' }));
    await user.click(screen.getByRole('button', { name: 'Approve 1' }));
    await user.click(within(confirmBox()).getByRole('button', { name: 'Approve 1' }));
    expect(await screen.findByText(FAILED)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Jimoh Marko' })).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('a successful bulk approve sends focus to the table', async () => {
    const user = userEvent.setup();
    h.POST.mockResolvedValue(res({ approved: ['m-jm'], failed: [] }));
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select Jimoh Marko' }));
    await user.click(screen.getByRole('button', { name: 'Approve 1' }));
    await user.click(within(confirmBox()).getByRole('button', { name: 'Approve 1' }));
    expect(await screen.findByText('1 mentor approved and listed on Explore')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('table').parentElement).toHaveFocus());
  });

  it('only checked rows on screen count: a search that hides one leaves it out', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select Jimoh Marko' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Bisi Folarin' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search mentors' }), 'jimoh');
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve 1' })).toBeInTheDocument();
  });

  it('a new mentor gets a fresh dialog: no reason carries over', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Open Amaka Okafor' }));
    await user.click(
      within(await drawer('Amaka Okafor')).getByRole('button', { name: 'Not approved' }),
    );
    await user.type(within(confirmBox()).getByRole('textbox'), 'Draft');
    await user.click(within(confirmBox()).getByRole('button', { name: 'Cancel' }));
    await user.keyboard('{Escape}');
    await user.click(await screen.findByRole('button', { name: 'Open Kwame Mensah' }));
    await user.click(
      within(await drawer('Kwame Mensah')).getByRole('button', { name: 'Not approved' }),
    );
    expect(within(confirmBox()).getByRole('textbox')).toHaveValue('');
  });

  it('select all and clear all keep a check that the search hides', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select Bisi Folarin' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search mentors' }), 'jimoh');
    const all = screen.getByRole('checkbox', { name: 'Select all applications' });
    await user.click(all);
    await user.click(all);
    await user.clear(screen.getByRole('searchbox', { name: 'Search mentors' }));
    expect(await screen.findByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Bisi Folarin' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Jimoh Marko' })).not.toBeChecked();
  });

  it('select all checks every visible application', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('checkbox', { name: 'Select all applications' }));
    expect(screen.getByText('4 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });
});
