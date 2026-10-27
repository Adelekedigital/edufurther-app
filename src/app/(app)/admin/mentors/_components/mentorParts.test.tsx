import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  toAdminMentorDetail,
  toAdminMentorRow,
  type AdminMentorRow,
} from '@/lib/api/data/adminMentors';
import { mockMentorDetail, mockMentorRows } from '@/lib/api/mock/adminMentors';
import { MentorDialogs } from './MentorDialogs';
import { MentorFilterBar } from './MentorFilterBar';
import { MentorSummaryCards } from './MentorSummaryCards';
import { NO_FILTERS, type MentorFilters } from './mentorList';
import { MentorDrawer } from './MentorDrawer';
import { MentorNotes } from './MentorNotes';
import { MentorTable } from './MentorTable';

const rows = (tab: Parameters<typeof mockMentorRows>[0]) =>
  mockMentorRows(tab, '').map(toAdminMentorRow);
const byId = (id: string) =>
  [...rows('applications'), ...rows('approved'), ...rows('paused')].find((r) => r.id === id)!;

describe('MentorDialogs', () => {
  it('a required reason: error under the box, invalid, focus kept, then trimmed text', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MentorDialogs
        dialog={{ kind: 'pause', mentor: byId('m-nr') }}
        pending={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const dlg = screen.getByRole('alertdialog');
    const box = within(dlg).getByRole('textbox', { name: 'Reason (admins only)' });
    await user.click(within(dlg).getByRole('button', { name: 'Pause' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(within(dlg).getByText('Add a reason for other admins.')).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveFocus();
    await user.type(box, '   No-shows  ');
    await user.click(within(dlg).getByRole('button', { name: 'Pause' }));
    expect(onConfirm).toHaveBeenCalledWith('No-shows');
  });

  it('approve has no field and confirms straight away', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MentorDialogs
        dialog={{ kind: 'approve', mentor: byId('m-jm') }}
        pending={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onConfirm).toHaveBeenCalledWith('');
  });
});

function drawer(
  row: AdminMentorRow,
  tab: Parameters<typeof MentorDrawer>[0]['tab'],
  canDecide: boolean,
) {
  return render(
    <MentorDrawer
      row={row}
      tab={tab}
      detail={toAdminMentorDetail(mockMentorDetail(row.id)!)}
      detailStatus="ready"
      onRetry={vi.fn()}
      notes={[]}
      notesStatus="ready"
      onRetryNotes={vi.fn()}
      canDecide={canDecide}
      onAction={vi.fn()}
      onClose={vi.fn()}
      zone="UTC"
    />,
  );
}

describe('MentorDrawer footer', () => {
  it('canDecide off: no Approve, Not approved, Pause or Resume', () => {
    const { unmount } = drawer(byId('m-jm'), 'applications', false);
    for (const name of ['Approve', 'Not approved'])
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    unmount();
    const b = drawer(byId('m-ia'), 'approved', false);
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email Ibrahim' })).toBeInTheDocument();
    b.unmount();
    drawer(byId('m-fa'), 'paused', false);
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
  });

  it('self-paused: only "Email {First}", even for an admin who may decide', () => {
    drawer(byId('m-co'), 'paused', true);
    const d = screen.getByRole('dialog', { name: 'Chidi Okonkwo' });
    expect(within(d).queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
    expect(within(d).getByRole('link', { name: 'Email Chidi' })).toHaveAttribute(
      'href',
      'mailto:chidi.okonkwo@example.com',
    );
  });

  it('admin-paused: Resume and Email', () => {
    drawer(byId('m-fa'), 'paused', true);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });
});

describe('MentorNotes', () => {
  it('without onAdd there is no box or Add note', () => {
    render(<MentorNotes notes={[]} status="ready" onRetry={vi.fn()} zone="UTC" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
  });

  it('a failed add keeps the text and says so under the box', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValue(new Error('x'));
    render(<MentorNotes notes={[]} status="ready" onRetry={vi.fn()} onAdd={onAdd} zone="UTC" />);
    const box = screen.getByRole('textbox', { name: 'Add an internal note' });
    await user.type(box, 'Called him');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(onAdd).toHaveBeenCalledWith('Called him');
    expect(await screen.findByText('We couldn’t add that note. Try again.')).toBeInTheDocument();
    expect(box).toHaveValue('Called him');
    expect(box).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('MentorTable', () => {
  const apps = rows('applications');
  const table = (checked: string[], onToggleAll = vi.fn(), onOpen = vi.fn()) =>
    render(
      <MentorTable
        tab="applications"
        rows={apps}
        zone="UTC"
        openId={null}
        onOpen={onOpen}
        selectable
        checked={checked}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
        rowRef={() => () => {}}
      />,
    );

  it('select all: checked when all are, mixed when some are', async () => {
    const user = userEvent.setup();
    const onToggleAll = vi.fn();
    const { unmount } = table([apps[0]!.id], onToggleAll);
    const all = screen.getByRole('checkbox', { name: 'Select all applications' });
    expect(all).toBePartiallyChecked();
    await user.click(all);
    expect(onToggleAll).toHaveBeenCalled();
    unmount();
    table(apps.map((r) => r.id));
    expect(screen.getByRole('checkbox', { name: 'Select all applications' })).toBeChecked();
  });

  it('is a table of rows, and a row opens by its button', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    table([], vi.fn(), onOpen);
    const t = screen.getByRole('table', { name: 'Applications' });
    expect(within(t).getAllByRole('row')).toHaveLength(apps.length + 1);
    expect(within(t).getByRole('columnheader', { name: 'Waiting' })).toBeInTheDocument();
    await user.click(within(t).getByRole('button', { name: 'Open Jimoh Marko' }));
    expect(onOpen).toHaveBeenCalledWith('m-jm');
  });
});

describe('MentorSummaryCards', () => {
  const summary = (applications: number, longestWaitDays: number | null) => ({
    counts: { applications, approved: 6, paused: 2, notApproved: 1 },
    longestWaitDays,
    averageShowUp: 90,
    atRisk: 0,
  });

  it('applications waiting with no longest wait: no "Nothing waiting" beside a count', () => {
    render(<MentorSummaryCards summary={summary(3, null)} onOpen={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('Nothing waiting')).toBeNull();
  });

  it('nothing waiting says so; a known wait names it', () => {
    const { unmount } = render(<MentorSummaryCards summary={summary(0, null)} onOpen={vi.fn()} />);
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument();
    unmount();
    render(<MentorSummaryCards summary={summary(2, 7)} onOpen={vi.fn()} />);
    expect(screen.getByText('Longest wait 7 days')).toBeInTheDocument();
  });
});

describe('MentorFilterBar', () => {
  function Harness() {
    const [filters, setFilters] = useState<MentorFilters>({ ...NO_FILTERS, date: '7' });
    const active = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
    return (
      <MentorFilterBar
        tab="applications"
        filters={filters}
        onChange={setFilters}
        shown={1}
        total={4}
        active={active}
        onClear={() => setFilters(NO_FILTERS)}
      />
    );
  }

  it('Clear filters keeps keyboard focus in the bar, on its first field', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('group').querySelector('[aria-labelledby]'),
      ),
    );
    expect(document.activeElement).not.toBe(document.body);
  });
});
