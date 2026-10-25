import { useEffect, useRef } from 'react';
import { ButtonLink, Button } from '@/components/atoms/Button/Button';
import { FormGrid } from '@/components/atoms/FormGrid/FormGrid';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SessionTypeRow } from '@/components/molecules/SessionTypeRow/SessionTypeRow';
import { TemplateCard } from '@/components/molecules/TemplateCard/TemplateCard';
import { SESSIONS_COPY } from '@/lib/copy/sessionTypes';
import type { Remote } from '@/types/mentor';
import type { OwnSessionType } from '@/types/sessionType';
import styles from './SessionTypeManager.module.css';

type SessionTypeManagerProps = {
  list: Remote<OwnSessionType[]>;
  /** Our copy under a row: a switch that didn't save, or what Duplicate did. */
  messages: Record<string, string>;
  /** Rows whose message is progress or success, not an error. */
  infoIds?: string[];
  onLiveChange: (id: string, live: boolean) => void;
  onDelete: (type: OwnSessionType) => void;
  onEdit: (type: OwnSessionType) => void;
  onFeature: (type: OwnSessionType, featured: boolean) => void;
  onRestore: (type: OwnSessionType) => void;
  onDuplicate: (type: OwnSessionType) => void;
  /** The share link for a type; null until it can be built. */
  shareUrl: (type: OwnSessionType) => string | null;
  createHref: string;
  /** Rows whose "Keep it" is waiting on the server. */
  restoringIds?: string[];
  /**
   * Where focus goes after a row is removed: the next row's "⋯", or Create
   * when none is left. Cleared through onFocused once applied.
   */
  focusAfterRemoval?: { menuOf: string } | 'create' | null;
  onFocused?: () => void;
  /** Omitted until the edit screen ships (Session Types PR 4). */
  templates: { key: string; href: string; icon: IconName; name: string; hint: string }[];
  /**
   * How many sessions the mentor may have (`/me` session_type_limit); null
   * while unknown, when nothing is held back (the server still refuses past it).
   */
  limit?: number | null;
};

/** Every session not deleted counts, scheduled for deletion included (backend PR 3). */
const atLimitOf = (p: Pick<SessionTypeManagerProps, 'list' | 'limit'>) =>
  p.limit != null && !!p.list.data && p.list.data.length >= p.limit;

/**
 * Create, or at the limit a button that's off but keeps focus, so it can say
 * why: its title is the limit sentence, the hover tooltip and the accessible
 * description at once (read once). The "{n} of {limit}" beside it says the
 * same to everyone.
 */
function CreateAction({ href, off, limit }: { href: string; off: boolean; limit: number | null }) {
  if (!off)
    return (
      <ButtonLink href={href} prefetch={false} size="large">
        {SESSIONS_COPY.create}
      </ButtonLink>
    );
  return (
    <Button size="large" unavailable title={SESSIONS_COPY.atLimit(limit)}>
      {SESSIONS_COPY.create}
    </Button>
  );
}

/**
 * The mentor's session types (Session Types.dc.html, scene List / Empty): the
 * header with Create, then loading, error, empty or the list — error before
 * empty — and "Start from a template" under it in every state.
 */
export function SessionTypeManager(p: SessionTypeManagerProps) {
  const header = useRef<HTMLDivElement>(null);
  const { focusAfterRemoval, onFocused } = p;
  useEffect(() => {
    if (focusAfterRemoval !== 'create') return;
    header.current?.querySelector<HTMLElement>('a, button')?.focus();
    onFocused?.();
  }, [focusAfterRemoval, onFocused]);
  const off = atLimitOf(p);
  const limit = p.limit ?? null;
  return (
    <div className={styles.page}>
      <div className={styles.header} ref={header}>
        <div className={styles.intro}>
          <h1 className={styles.title}>{SESSIONS_COPY.title}</h1>
          <p className={styles.lede}>{SESSIONS_COPY.lede}</p>
        </div>
        <div className={styles.createGroup}>
          {limit !== null && p.list.data && (
            <span className={styles.count}>
              {SESSIONS_COPY.count(p.list.data.length, limit)}
              <span className="sr-only"> sessions</span>
            </span>
          )}
          <CreateAction href={p.createHref} off={off} limit={limit} />
        </div>
      </div>

      <List {...p} />

      {/* After the list resolves: below a loading list it would jump as rows arrive (CLS). */}
      {!p.list.isLoading && (
        <section className={styles.templates} aria-labelledby="st-templates">
          <div className={styles.templatesIntro}>
            <h2 id="st-templates" className={styles.templatesTitle}>
              Start from a template
            </h2>
            <p className={styles.templatesHint}>
              Pre-filled with a description and questions mentors commonly use. Edit anything before
              publishing.
            </p>
          </div>
          <FormGrid gap={3}>
            {p.templates.map((t) => (
              <TemplateCard
                key={t.key}
                href={t.href}
                icon={t.icon}
                name={t.name}
                hint={t.hint}
                disabled={off}
              />
            ))}
          </FormGrid>
        </section>
      )}
    </div>
  );
}

function List({
  limit,
  list,
  messages,
  infoIds,
  onLiveChange,
  onDelete,
  createHref,
  onEdit,
  onFeature,
  onRestore,
  onDuplicate,
  shareUrl,
  restoringIds,
  focusAfterRemoval,
  onFocused,
}: SessionTypeManagerProps) {
  const off = atLimitOf({ list, limit });
  if (list.isLoading) {
    return (
      <div className={styles.list} role="status" aria-label={SESSIONS_COPY.loading}>
        {[0, 1].map((i) => (
          // Same boxes and wrapping as SessionTypeRow, so nothing moves when rows arrive.
          <div key={i} className={styles.skeletonRow}>
            <Skeleton width="40px" height="40px" radius="lg" />
            <div className={styles.skeletonBody}>
              <Skeleton width="40%" height="24px" />
              <Skeleton height="17px" />
              <Skeleton width="70%" height="17px" />
              <Skeleton width="60%" height="24px" radius="md" />
            </div>
            <div className={styles.skeletonActions}>
              <Skeleton width="39px" height="24px" radius="lg" />
              <Skeleton width="32px" height="32px" radius="md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (list.error) {
    const offline = list.error.kind === 'offline';
    return (
      <div className={styles.box}>
        <EmptyState
          illustration="forms"
          size={120}
          title={SESSIONS_COPY.loadError}
          description={
            offline
              ? // Copy confirmed by design (reply 2026-09-29, #2).
                'You’re offline. Try again when you reconnect.'
              : 'Something went wrong on our side. Try again in a moment.'
          }
          actions={
            <Button size="large" onClick={list.retry}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const types = list.data ?? [];
  if (types.length === 0) {
    return (
      <div className={styles.box}>
        <EmptyState
          illustration="task-templates"
          size={120}
          title={SESSIONS_COPY.emptyTitle}
          description={SESSIONS_COPY.emptyBody}
          actions={<CreateAction href={createHref} off={off} limit={limit ?? null} />}
        />
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {types.map((t) => (
        <SessionTypeRow
          key={t.id}
          type={t}
          message={messages[t.id]}
          messageTone={infoIds?.includes(t.id) ? 'info' : 'error'}
          onLiveChange={(live) => onLiveChange(t.id, live)}
          onDelete={() => onDelete(t)}
          onEdit={() => onEdit(t)}
          onFeature={(f) => onFeature(t, f)}
          onRestore={() => onRestore(t)}
          onDuplicate={() => onDuplicate(t)}
          duplicateOff={off ? SESSIONS_COPY.atLimit(limit ?? null) : null}
          shareUrl={shareUrl(t)}
          restoring={!!restoringIds?.includes(t.id)}
          focusMenu={typeof focusAfterRemoval === 'object' && focusAfterRemoval?.menuOf === t.id}
          onFocused={onFocused}
        />
      ))}
    </div>
  );
}
