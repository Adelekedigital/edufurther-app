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

const table = () => screen.getByRole('table');
const rowNames = () =>
  within(table())
    .getAllByRole('button', { name: /^Open / })
    .map((b) => b.textContent);
const pick = async (user: ReturnType<typeof userEvent.setup>, field: string, option: string) => {
  await user.click(screen.getByRole('combobox', { name: field }));
  await user.click(screen.getByRole('option', { name: option }));
};

beforeEach(async () => {
  h.viewer = admin();
  h.GET.mockReset();
  h.POST.mockReset();
  await serveFromStore();
});

describe('AdminMentorsScreen: states', () => {
  it('loading: the table card with skeleton rows, named "Loading mentors"', async () => {
    await serveFromStore({ '/api/v1/admin/mentors': () => new Promise(() => {}) });
    renderScreen(<AdminMentorsScreen />);
    expect(screen.getByText('Loading mentors')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('error before empty, and Try again asks again', async () => {
    await serveFromStore({ '/api/v1/admin/mentors': () => res(null, 404) });
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    expect(await screen.findByText('We couldn’t load mentors')).toBeInTheDocument();
    expect(screen.queryByText('No applications waiting')).not.toBeInTheDocument();
    const calls = h.GET.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(h.GET.mock.calls.length).toBeGreaterThan(calls);
  });

  it('an empty tab says so in its own words', async () => {
    await serveFromStore({ '/api/v1/admin/mentors': () => res({ data: [], next_cursor: null }) });
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    expect(await screen.findByText('No applications waiting')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Paused and suspended/ }));
    expect(await screen.findByText('No paused or suspended mentors')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Not approved' }));
    expect(await screen.findByText('No declined applications')).toBeInTheDocument();
    // A search typed into an empty tab still gets the tab's own words.
    await user.type(screen.getByRole('searchbox', { name: 'Search mentors' }), 'amara');
    expect(screen.getByText('No declined applications')).toBeInTheDocument();
    expect(screen.queryByText('No mentors match that search')).not.toBeInTheDocument();
  });
});

describe('AdminMentorsScreen: the list', () => {
  it('cards, tab counts (none on Not approved) and the longest wait first', async () => {
    renderScreen(<AdminMentorsScreen />);
    await screen.findByRole('button', { name: 'Open Jimoh Marko' });
    expect(rowNames()).toEqual(['Jimoh Marko', 'Bisi Folarin', 'Kwame Mensah', 'Amaka Okafor']);
    expect(
      screen.getByRole('button', { name: 'Applications waiting: 4. Open Applications' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Applications (4)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Not approved' })).toBeInTheDocument();
    // The cell, and the phone row's meta line (CSS picks which shows).
    expect(screen.getAllByText('Waiting 7 days')).toHaveLength(2);
    expect(screen.getByText('4 mentors')).toBeInTheDocument();
  });

  it('a card opens its tab', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('button', { name: /^At risk: 1/ }));
    expect(screen.getByRole('tab', { name: /^Approved/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('45% · At risk')).toBeInTheDocument();
  });

  it('filters, Showing n of m, Clear filters, and a reset on tab change', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await screen.findByRole('button', { name: 'Open Jimoh Marko' });
    await pick(user, 'Waiting time', 'Under 3 days');
    expect(rowNames()).toEqual(['Amaka Okafor']);
    // The visible count, and the same words announced in the live region.
    expect(screen.getAllByText('Showing 1 of 4')).toHaveLength(2);
    await pick(user, 'Waiting time', 'Over 7 days');
    expect(screen.getByText('No mentors match these filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(rowNames()).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();

    await pick(user, 'Sort by', 'Name: A to Z');
    expect(rowNames()[0]).toBe('Amaka Okafor');
    await user.click(screen.getByRole('tab', { name: /^Approved/ }));
    await user.click(screen.getByRole('tab', { name: /^Applications/ }));
    await screen.findByRole('button', { name: 'Open Jimoh Marko' });
    expect(rowNames()[0]).toBe('Jimoh Marko');
  });

  it('search matches name or email within the tab, with its own no-match', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await screen.findByRole('button', { name: 'Open Jimoh Marko' });
    await user.type(screen.getByRole('searchbox', { name: 'Search mentors' }), 'kwame.');
    expect(rowNames()).toEqual(['Kwame Mensah']);
    await user.type(screen.getByRole('searchbox', { name: 'Search mentors' }), 'zzz');
    expect(screen.getByText('No mentors match that search')).toBeInTheDocument();
  });

  it('paused rows give the admin reason, or say the mentor paused themselves', async () => {
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('tab', { name: /Paused and suspended/ }));
    await screen.findByRole('button', { name: 'Open Chidi Okonkwo' });
    expect(screen.getByText('Paused by the mentor')).toBeInTheDocument();
    expect(
      screen.getByText('Missed 3 sessions in September. Paused until we talk.'),
    ).toBeInTheDocument();
  });
});

describe('AdminMentorsScreen: limited_access', () => {
  it('no checkboxes, no decisions, no Add note; Email stays', async () => {
    h.viewer = admin({ adminRole: 'limited_access' });
    const user = userEvent.setup();
    renderScreen(<AdminMentorsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Open Jimoh Marko' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    const drawer = await screen.findByRole('dialog', { name: 'Jimoh Marko' });
    expect(within(drawer).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(
      within(drawer).queryByRole('textbox', { name: 'Add an internal note' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(within(drawer).getByText('Internal notes')).toBeInTheDocument());
  });
});
