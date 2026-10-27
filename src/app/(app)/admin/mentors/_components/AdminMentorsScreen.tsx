'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { PageHeader } from '@/components/molecules/PageHeader/PageHeader';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { useAdminSummary } from '@/lib/api/data/admin';
import {
  MENTOR_TABS,
  useAddAdminNote,
  useAdminMentor,
  useAdminMentors,
  useAdminNotes,
  useApproveMentor,
  useBulkApprove,
  useDeclineMentor,
  usePauseMentor,
  useResumeMentor,
  isSelfPausedError,
  type MentorTab,
} from '@/lib/api/data/adminMentors';
import { useViewer } from '@/lib/api/data/viewer';
import { ADMIN_ACTION_FAILED, ADMIN_PAGES } from '@/lib/copy/admin';
import {
  MENTOR_DIALOGS,
  MENTOR_FILTERS,
  MENTOR_SEARCH,
  MENTOR_STATES,
  MENTOR_TAB_LABELS,
  MENTOR_TABLE,
  MENTOR_TABS_LABEL,
} from '@/lib/copy/adminMentors';
import { deviceTimeZone } from '@/lib/utils/format';
import { MentorBulkBar } from './MentorBulkBar';
import { MentorDialogs, type MentorDialog } from './MentorDialogs';
import { MentorDrawer, type DrawerAction } from './MentorDrawer';
import { MentorFilterBar } from './MentorFilterBar';
import { filtersActive, NO_FILTERS, visibleMentors, type MentorFilters } from './mentorList';
import { MentorSummaryCards } from './MentorSummaryCards';
import { MentorTable, MentorTableSkeleton } from './MentorTable';
import styles from './AdminMentorsScreen.module.css';

const panelOf = (t: MentorTab) => `admin-mentors-${t}`;
const TOAST_MS = 4000;
const SAY_SEARCH_MS = 600;
type Toast = { text: string; tone: 'success' | 'error'; stamp: number };
const status = (q: { isError: boolean; data: unknown }) =>
  q.data !== undefined ? 'ready' : q.isError ? 'error' : 'loading';

/**
 * /admin/mentors (Admin PRD "Mentors page"; Admin.dc.html mentorLayout=drawer).
 * The only place on the page that calls the hooks: everything below gets
 * data by props. Search and filters run on the loaded tab in the browser.
 */
export function AdminMentorsScreen() {
  const viewer = useViewer();
  const member = viewer.kind === 'member' ? viewer : null;
  const adminId = member?.isAdmin ? member.id : null;
  const zone = member?.timeZone ?? deviceTimeZone();
  // limited_access reads everything but decides nothing (backend reply A1).
  const canDecide = !!member?.isAdmin && member.adminRole !== 'limited_access';

  const [tab, setTabState] = useState<MentorTab>('applications');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<MentorFilters>(NO_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [dialog, setDialog] = useState<MentorDialog | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [said, setSaid] = useState<{ text: string; id: number } | null>(null);

  const summary = useAdminSummary(adminId);
  const list = useAdminMentors(adminId, tab);
  const detail = useAdminMentor(adminId, openId);
  const notes = useAdminNotes(adminId, openId);
  const addNote = useAddAdminNote(openId);
  const approve = useApproveMentor();
  const decline = useDeclineMentor();
  const pause = usePauseMentor();
  const resume = useResumeMentor();
  const bulk = useBulkApprove();

  // The toast goes after a few seconds; Snackbar's own status region has read it out.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const tableRef = useRef<HTMLDivElement>(null);
  const rowRef = useCallback(
    (id: string) => (el: HTMLButtonElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    },
    [],
  );

  const rows = useMemo(() => list.data ?? [], [list.data]);
  const visible = useMemo(
    () => visibleMentors(rows, tab, q, filters, zone),
    [rows, tab, q, filters, zone],
  );
  const active = filtersActive(tab, filters);
  const selectable = tab === 'applications' && canDecide;
  // Checks count only for rows on screen: a filter or search that hides a
  // checked row leaves it out of the count and of Approve {n}.
  const liveChecked = checked.filter((id) => visible.some((r) => r.id === id));
  const openRow = rows.find((r) => r.id === openId) ?? null;

  const say = (text: string) => setSaid((s) => ({ text, id: (s?.id ?? 0) + 1 }));
  const show = (text: string, tone: Toast['tone']) =>
    setToast((t) => ({ text, tone, stamp: (t?.stamp ?? 0) + 1 }));

  const setTab = (t: MentorTab) => {
    setTabState(t);
    setOpenId(null);
    setChecked([]);
    setFilters(NO_FILTERS);
  };
  const changeFilters = (f: MentorFilters) => {
    setFilters(f);
    const n = visibleMentors(rows, tab, q, f, zone).length;
    say(MENTOR_FILTERS.count(n, rows.length));
  };
  // The search's count is said once typing pauses, not on every key.
  const searched = useRef(q);
  useEffect(() => {
    if (searched.current === q || list.data === undefined) return;
    const t = setTimeout(() => {
      searched.current = q;
      say(MENTOR_FILTERS.count(visible.length, rows.length));
    }, SAY_SEARCH_MS);
    return () => clearTimeout(t);
  }, [q, visible.length, rows.length, list.data]);

  /**
   * After the dialogs close (next frame): back to the row it came from, or
   * the table when there is no row to go back to.
   */
  const refocus = (id: string | null) =>
    requestAnimationFrame(() => {
      const el = id ? rowRefs.current.get(id) : null;
      (el && el.isConnected ? el : tableRef.current)?.focus();
    });
  const closeDrawer = () => {
    const id = openId;
    setOpenId(null);
    refocus(id);
  };

  const onAction = (a: DrawerAction) => {
    if (!openRow) return;
    setDialog({ kind: a, mentor: openRow });
  };

  const pending =
    approve.isPending || decline.isPending || pause.isPending || resume.isPending || bulk.isPending;

  const confirm = async (text: string) => {
    if (!dialog) return;
    try {
      if (dialog.kind === 'bulk') {
        const out = await bulk.mutateAsync(dialog.mentors.map((m) => m.id));
        setDialog(null);
        // Q9: the ones that failed stay checked.
        setChecked(out.failed);
        if (out.failed.length === 0) show(MENTOR_DIALOGS.bulk.done(out.approved.length), 'success');
        else if (out.approved.length === 0) show(ADMIN_ACTION_FAILED, 'error');
        else show(MENTOR_DIALOGS.bulk.partial(out.approved.length, out.failed.length), 'error');
        refocus(null);
        return;
      }
      const m = dialog.mentor;
      if (dialog.kind === 'approve') await approve.mutateAsync(m.id);
      if (dialog.kind === 'decline') await decline.mutateAsync({ id: m.id, reason: text });
      if (dialog.kind === 'pause') await pause.mutateAsync({ id: m.id, reason: text });
      if (dialog.kind === 'resume') await resume.mutateAsync(m.id);
      setDialog(null);
      setOpenId(null);
      setChecked((c) => c.filter((id) => id !== m.id));
      show(MENTOR_DIALOGS[dialog.kind].done(m.name), 'success');
      // The row has left this tab: the table, not a row that's going.
      refocus(null);
    } catch (e) {
      const self = dialog.kind === 'resume' && isSelfPausedError(e);
      setDialog(null);
      // A failed bulk keeps every check; focus goes back to the table.
      if (dialog.kind === 'bulk') refocus(null);
      show(
        self ? MENTOR_DIALOGS.resume.selfPaused(dialog.mentor.firstName) : ADMIN_ACTION_FAILED,
        'error',
      );
    }
  };

  const counts = summary.data?.counts;
  const tabItems = MENTOR_TABS.map((t) => {
    const n = counts?.[t] ?? null;
    return {
      value: t,
      label: MENTOR_TAB_LABELS[t],
      panelId: panelOf(t),
      // "(n)" above 0, never on Not approved (PRD Tabs).
      count: t !== 'notApproved' && n ? n : null,
    };
  });

  const listStatus = status(list);
  // An empty tab says so first, whatever is typed; then the filters' no-match
  // (they hide everything on their own), then the search's.
  const empty =
    rows.length === 0
      ? MENTOR_STATES.empty[tab]
      : visible.length > 0
        ? null
        : visibleMentors(rows, tab, '', filters, zone).length === 0
          ? MENTOR_STATES.noMatchFilters
          : MENTOR_STATES.noMatchSearch;
  const emptyArt =
    empty === MENTOR_STATES.empty[tab]
      ? tab === 'notApproved'
        ? 'forms'
        : 'team'
      : 'search-results';

  return (
    <div className={styles.screen}>
      <PageHeader
        {...ADMIN_PAGES.mentors}
        actions={
          <div className={styles.search}>
            <SearchField
              label={MENTOR_SEARCH.label}
              placeholder={MENTOR_SEARCH.placeholder}
              value={q}
              onChange={setQ}
              onClear={() => setQ('')}
            />
          </div>
        }
      />
      <MentorSummaryCards
        summary={summary.data ?? null}
        loading={summary.isPending}
        onOpen={setTab}
      />
      <div className={styles.tabs}>
        <Tabs
          items={tabItems}
          value={tab}
          onChange={(v) => setTab(v as MentorTab)}
          label={MENTOR_TABS_LABEL}
          countStyle="text"
        />
      </div>
      <div
        id={panelOf(tab)}
        role="tabpanel"
        aria-labelledby={`${panelOf(tab)}-tab`}
        className={styles.panel}
      >
        <MentorFilterBar
          tab={tab}
          filters={filters}
          onChange={changeFilters}
          shown={listStatus === 'ready' ? visible.length : null}
          total={rows.length}
          active={active}
          onClear={() => changeFilters(NO_FILTERS)}
        />
        {selectable && liveChecked.length > 0 && (
          <MentorBulkBar
            count={liveChecked.length}
            onClear={() => setChecked([])}
            onApprove={() =>
              setDialog({ kind: 'bulk', mentors: rows.filter((r) => liveChecked.includes(r.id)) })
            }
          />
        )}
        <div ref={tableRef} tabIndex={-1} className={styles.region}>
          {listStatus === 'loading' && <MentorTableSkeleton label={MENTOR_TABLE.loading} />}
          {listStatus === 'error' && (
            <div className={styles.stateCard}>
              <EmptyState
                illustration="forms"
                size={120}
                title={MENTOR_STATES.error.title}
                description={MENTOR_STATES.error.body}
                actions={
                  <Button
                    variant="secondary-outlined"
                    size="medium"
                    onClick={() => void list.refetch()}
                    busy={list.isFetching}
                  >
                    {MENTOR_STATES.error.retry}
                  </Button>
                }
              />
            </div>
          )}
          {listStatus === 'ready' &&
            (empty ? (
              <div className={styles.stateCard}>
                <EmptyState
                  illustration={emptyArt}
                  size={120}
                  title={empty.title}
                  description={empty.body}
                />
              </div>
            ) : (
              <MentorTable
                tab={tab}
                rows={visible}
                zone={zone}
                openId={openId}
                onOpen={setOpenId}
                selectable={selectable}
                checked={liveChecked}
                onToggle={(id) =>
                  setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
                }
                onToggleAll={() =>
                  setChecked(
                    visible.every((r) => liveChecked.includes(r.id))
                      ? []
                      : visible.map((r) => r.id),
                  )
                }
                rowRef={rowRef}
              />
            ))}
        </div>
      </div>

      {openRow && (
        <MentorDrawer
          row={openRow}
          tab={tab}
          detail={detail.data}
          detailStatus={status(detail)}
          onRetry={() => void detail.refetch()}
          notes={notes.data}
          notesStatus={status(notes)}
          onRetryNotes={() => void notes.refetch()}
          onAddNote={canDecide ? (body) => addNote.mutateAsync(body) : undefined}
          canDecide={canDecide}
          onAction={onAction}
          onClose={closeDrawer}
          zone={zone}
        />
      )}
      {dialog && (
        <MentorDialogs
          // A new mentor or action starts a fresh dialog: no reason carries over.
          key={dialog.kind === 'bulk' ? 'bulk' : `${dialog.kind}-${dialog.mentor.id}`}
          dialog={dialog}
          pending={pending}
          onCancel={() => setDialog(null)}
          onConfirm={(t) => void confirm(t)}
        />
      )}
      <LiveRegion message={said} />
      <Snackbar message={toast?.text ?? null} stamp={toast?.stamp} tone={toast?.tone} />
    </div>
  );
}
