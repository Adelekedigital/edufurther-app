import { ButtonLink, Button } from '@/components/atoms/Button/Button';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { SessionTypeRow } from '@/components/molecules/SessionTypeRow/SessionTypeRow';
import { TemplateCard } from '@/components/molecules/TemplateCard/TemplateCard';
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
  /** Omitted until the edit screen ships (Session Types PR 4). */
  templates: { key: string; href: string; icon: IconName; name: string; hint: string }[];
};

/**
 * The mentor's session types (Session Types.dc.html, scene List / Empty): the
 * header with Create, then loading, error, empty or the list — error before
 * empty — and "Start from a template" under it in every state.
 */
export function SessionTypeManager(p: SessionTypeManagerProps) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Session types</h1>
          <p className={styles.lede}>
            What mentees can book with you. Each type has its own description, questions and booking
            rules.
          </p>
        </div>
        <ButtonLink href={p.createHref} prefetch={false} size="large">
          Create session type
        </ButtonLink>
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
          <div className={styles.grid}>
            {p.templates.map((t) => (
              <TemplateCard key={t.key} href={t.href} icon={t.icon} name={t.name} hint={t.hint} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function List({
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
}: SessionTypeManagerProps) {
  if (list.isLoading) {
    return (
      <div className={styles.list} role="status" aria-label="Loading your session types">
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
          title="We couldn’t load your session types"
          description={
            offline
              ? // PROVISIONAL copy — design request #2.
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
          title="Create your first session type"
          description="Mentees can’t book you until you offer at least one session. Start from a template or build your own."
          actions={
            <ButtonLink href={createHref} prefetch={false} size="large">
              Create session type
            </ButtonLink>
          }
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
          shareUrl={shareUrl(t)}
        />
      ))}
    </div>
  );
}
