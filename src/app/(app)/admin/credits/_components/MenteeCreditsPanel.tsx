'use client';

import { useId } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Select } from '@/components/atoms/Select/Select';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { LoadMore } from '@/components/molecules/LoadMore/LoadMore';
import type { AdminMentee, CreditEntry } from '@/lib/api/data/adminCredits';
import { CREDITS_STATES, PANEL_COPY, signedChange } from '@/lib/copy/adminCredits';
import { cx } from '@/lib/utils/cx';
import { formatShortDate } from '@/lib/utils/format';
import { personInitials } from '@/lib/utils/person';
import { CreditsError } from './CreditsError';
import styles from './MenteeCreditsPanel.module.css';

export const MIN_CREDITS = 1;
/** The API's cap is the monthly allowance (founder: 3). */
export const MAX_CREDITS = 3;

/** Avatar, name and "{email} · {short id}": the panel's head row. */
export function MenteeHeader({ name, mentee }: { name: string; mentee: AdminMentee | null }) {
  const initials = mentee?.initials ?? personInitials(name.split(' ')[0], name.split(' ')[1]);
  return (
    <div className={styles.who}>
      <Avatar
        size="md"
        initials={initials}
        tone={mentee?.cover ?? 'plain'}
        src={mentee?.avatarUrl}
        alt=""
      />
      <div className={styles.whoText}>
        <h2 className={styles.name}>{name}</h2>
        {mentee ? (
          <span className={styles.meta}>{PANEL_COPY.meta(mentee.email, mentee.shortId)}</span>
        ) : (
          <Skeleton width="180px" height="12px" />
        )}
      </div>
    </div>
  );
}

export type PanelBodyProps = {
  mentee: AdminMentee | null;
  history: CreditEntry[];
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  timeZone?: string;
  amount: number;
  onAmount: (n: number) => void;
  reason: string;
  onReason: (r: string) => void;
  onAdd: () => void;
  more: { hasMore: boolean; loadingMore: boolean; loadMoreFailed: boolean; loadMore: () => void };
};

/** Balance, the add form and the history (Admin.dc.html `hasCu`), in a region or a drawer. */
export function PanelBody(p: PanelBodyProps) {
  if (p.status === 'error') return <CreditsError onRetry={p.onRetry} />;
  if (p.status === 'loading' || !p.mentee) {
    return (
      <div
        className={styles.loading}
        role="status"
        aria-busy="true"
        aria-label={PANEL_COPY.loading}
      >
        <Skeleton height="104px" radius="lg" />
        <Skeleton height="72px" radius="lg" />
        <Skeleton height="48px" radius="lg" />
        <Skeleton height="160px" radius="lg" />
      </div>
    );
  }
  const { balance } = p.mentee;
  return (
    <>
      <div className={styles.balance}>
        <div className={styles.balanceMain}>
          <span className={styles.small}>{PANEL_COPY.balanceLabel}</span>
          <span className={styles.left}>
            {balance.left} <span className={styles.of}>{PANEL_COPY.of(balance.total)}</span>
          </span>
        </div>
        <div className={styles.balanceSide}>
          <span className={styles.stage}>{PANEL_COPY.stage[balance.stage]}</span>
          <span className={styles.small}>{PANEL_COPY.resets(balance.resetsOn)}</span>
        </div>
      </div>
      <AddForm {...p} />
      <History {...p} />
    </>
  );
}

function AddForm({ amount, onAmount, reason, onReason, onAdd }: PanelBodyProps) {
  const id = useId();
  const options = [
    { value: '', label: PANEL_COPY.reasonPlaceholder },
    ...PANEL_COPY.reasons.map((r) => ({ value: r, label: r })),
  ];
  return (
    <div className={styles.form}>
      <div className={styles.fields}>
        <div className={styles.amount}>
          <span id={`${id}-amt`} className={styles.fieldLabel}>
            {PANEL_COPY.amountLabel}
          </span>
          <Stepper labelledBy={`${id}-amt`} value={amount} onChange={onAmount} />
        </div>
        <div className={styles.reason}>
          <span id={`${id}-reason`} className={styles.fieldLabel}>
            {PANEL_COPY.reasonLabel} <span className={styles.optional}>{PANEL_COPY.optional}</span>
          </span>
          <Select
            aria-labelledby={`${id}-reason`}
            options={options}
            value={reason}
            density="lg"
            radius="sm"
            text="sm"
            onChange={(e) => onReason(e.target.value)}
          />
        </div>
      </div>
      <Button size="large" fullWidth onClick={onAdd}>
        {PANEL_COPY.add(amount)}
      </Button>
    </div>
  );
}

/**
 * 1 to 3. At a bound the button stays focusable (aria-disabled) so a keyboard
 * user pressing it again keeps their place.
 */
function Stepper({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const atMin = value <= MIN_CREDITS;
  const atMax = value >= MAX_CREDITS;
  return (
    <div role="group" aria-labelledby={labelledBy} className={styles.stepper}>
      <button
        type="button"
        className={styles.step}
        aria-label={PANEL_COPY.fewer}
        aria-disabled={atMin}
        onClick={() => !atMin && onChange(value - 1)}
      >
        <Icon name="remove" size={20} />
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.step}
        aria-label={PANEL_COPY.more}
        aria-disabled={atMax}
        onClick={() => !atMax && onChange(value + 1)}
      >
        <Icon name="add" size={20} />
      </button>
    </div>
  );
}

function History({ history, timeZone, more }: PanelBodyProps) {
  const id = useId();
  return (
    <section className={styles.history} aria-labelledby={id}>
      <h3 id={id} className={styles.historyTitle}>
        {PANEL_COPY.historyTitle}
      </h3>
      {history.length === 0 ? (
        <p className={styles.empty}>{CREDITS_STATES.empty}</p>
      ) : (
        <ul className={styles.list}>
          {history.map((e) => (
            <li key={e.id} className={styles.entry}>
              <span className={cx(styles.change, e.change > 0 && styles.plus)}>
                {signedChange(e.change)}
              </span>
              <span className={styles.entryText}>
                <span className={styles.what}>{e.what}</span>
                <span className={styles.small}>
                  {formatShortDate(e.at, timeZone)} · {e.by}
                </span>
              </span>
              <span className={styles.after}>{PANEL_COPY.historyLeft(e.balanceAfter)}</span>
            </li>
          ))}
        </ul>
      )}
      {more.hasMore && (
        <LoadMore
          label={PANEL_COPY.historyMore}
          onLoadMore={more.loadMore}
          busy={more.loadingMore}
          error={more.loadMoreFailed ? CREDITS_STATES.errorTitle : null}
        />
      )}
    </section>
  );
}
