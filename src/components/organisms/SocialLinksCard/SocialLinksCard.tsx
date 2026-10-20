'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { BrandIcon } from '@/components/atoms/BrandIcon/BrandIcon';
import { Button } from '@/components/atoms/Button/Button';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { PrefixedInput } from '@/components/molecules/PrefixedInput/PrefixedInput';
import { SOCIAL_LINKS_COPY as C } from '@/lib/copy/socialLinks';
import { cx } from '@/lib/utils/cx';
import {
  SOCIAL_PLATFORMS,
  WEBSITE_MAX,
  detectSite,
  displayUrl,
  draftProblem,
  markLabel,
  tidyDraft,
} from '@/lib/utils/socialLinks';
import type { SocialKind } from '@/types/mentor';
import type { SocialRow, SocialSave } from '@/types/mentorSettings';
import styles from './SocialLinksCard.module.css';

type SocialLinksCardProps = {
  status: 'loading' | 'error' | 'ready';
  rows: SocialRow[];
  onRetry: () => void;
  /** Saves one link; true once it's saved (the form then closes). */
  onSave: (save: SocialSave) => Promise<boolean>;
  saving: boolean;
  /** Why the last save didn't go through, in our words. */
  saveError: string | null;
  /** Bumped on each failed save, so the same error is said again. */
  saveErrorKey?: number;
  onRemove: (row: SocialRow) => void;
  /** Where focus lands when the control that had it is gone (a removed row). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** The header's "Add link". */
  addRef?: RefObject<HTMLButtonElement | null>;
  /** The form opened, closed or changed platform: an old save error no longer applies. */
  onFormChange?: () => void;
};

type Form = { editId: string | null; kind: SocialKind | null; draft: string };

/**
 * "Social links" (Mentor Settings.dc.html `isSocial`, linksScope=limited): a
 * row per link with Edit and Remove; "Add link" opens the platform picker and
 * the field above the rows. LinkedIn, X, YouTube, Instagram, Facebook and
 * TikTok once each; up to three websites. Each link saves on its own.
 */
export function SocialLinksCard({
  status,
  rows,
  onRetry,
  onSave,
  saving,
  saveError,
  saveErrorKey,
  onRemove,
  headingRef,
  addRef,
  onFormChange,
}: SocialLinksCardProps) {
  const headingId = useId();
  const fieldId = useId();
  const noteId = useId();
  const [form, setForm] = useState<Form | null>(null);
  const firstRadio = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // The page may hold these refs; the card falls back to its own.
  const ownAdd = useRef<HTMLButtonElement>(null);
  const ownHeading = useRef<HTMLHeadingElement>(null);
  const add = addRef ?? ownAdd;
  const heading = headingRef ?? ownHeading;
  // Where focus goes once the next render is on screen: the picker or the
  // field as the form opens, and back to what opened it as it closes (the
  // row's Edit, else "Add link"), never the page (WCAG 2.4.3). Asked for by
  // the action itself, so arrowing through the picker keeps focus there.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    focusNext.current = null;
    if (want === 'pick') firstRadio.current?.focus();
    else if (want === 'field') input.current?.focus();
    else {
      const edit = want.startsWith('edit:')
        ? document.getElementById(`${fieldId}-edit-${want.slice(5)}`)
        : null;
      (edit ?? add.current ?? heading.current)?.focus();
    }
  });
  const openForm = (next: Form) => {
    onFormChange?.();
    focusNext.current = next.kind ? 'field' : 'pick';
    setForm(next);
  };

  const websites = rows.filter((r) => r.kind === 'website').length;
  const taken = (k: SocialKind) =>
    k === 'website'
      ? websites >= WEBSITE_MAX
      : rows.some((r) => r.kind === k && r.id !== form?.editId);

  const plat = form?.kind ? SOCIAL_PLATFORMS.find((p) => p.kind === form.kind)! : null;
  const draft = form?.draft ?? '';
  const problem = plat ? draftProblem(plat.kind, draft) : null;
  // A website draft that is really a platform's profile (the design's
  // DETECT): it saves as that platform when adding, the platform is free and
  // the link names a handle it takes. Anything else on that host (a list, a
  // post, a group) stays a website. Medium and Substack sites show their mark.
  const site = plat?.kind === 'website' && !problem ? detectSite(draft) : null;
  const handle = site && site !== 'medium' && site !== 'substack' ? tidyDraft(site, draft) : '';
  const routeTo =
    site &&
    site !== 'medium' &&
    site !== 'substack' &&
    !form?.editId &&
    !taken(site) &&
    handle !== draft.trim() &&
    draftProblem(site, handle) === null
      ? site
      : null;
  const looksLike = routeTo ?? (site === 'medium' || site === 'substack' ? site : null);
  const note = looksLike
    ? C.noteLooksLike(markLabel(looksLike))
    : problem === 'shape'
      ? C.noteShape
      : problem === 'handle' && plat
        ? C.noteHandle(plat.label)
        : problem === 'website'
          ? C.noteWebsite
          : C.noteDefault;

  const close = () => {
    onFormChange?.();
    focusNext.current = form?.editId ? `edit:${form.editId}` : 'add';
    setForm(null);
  };
  const submit = async () => {
    if (!form || !plat || !draft.trim() || problem || saving) return;
    const kind = routeTo ?? plat.kind;
    const value = routeTo ? handle : draft.trim();
    if (await onSave({ kind, value, id: form.editId })) close();
  };

  // The picker is a radio group: one tab stop, the arrow keys move and pick.
  const open = SOCIAL_PLATFORMS.filter((p) => !taken(p.kind));
  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>, k: SocialKind) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step || !open.length) return;
    e.preventDefault();
    const at = open.findIndex((p) => p.kind === k);
    const next = open[(at + step + open.length) % open.length]!;
    onFormChange?.();
    setForm((f) => (f ? { ...f, kind: next.kind, draft: '' } : f));
    document.getElementById(`${fieldId}-${next.kind}`)?.focus();
  };
  const tabStop = form?.kind ?? open[0]?.kind;

  const filled = status === 'ready';
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id={headingId} ref={heading} tabIndex={-1} className={styles.title}>
            {C.title}
          </h2>
          <span className={styles.sub}>{C.sub}</span>
        </div>
        {/* Hidden while the form is open: its own button is the "Add link" then. */}
        {/* Also gone once every platform is used: there'd be nothing to pick. */}
        {filled && !form && open.length > 0 && (
          <Button
            ref={add}
            variant="secondary-outlined"
            size="medium"
            onClick={() => openForm({ editId: null, kind: null, draft: '' })}
          >
            {C.add}
          </Button>
        )}
      </div>

      {form && filled && (
        <div className={styles.form}>
          {!form.editId && (
            <>
              <span id={`${fieldId}-platform`} className={styles.label}>
                {C.platform}
              </span>
              <div
                role="radiogroup"
                aria-labelledby={`${fieldId}-platform`}
                className={styles.grid}
              >
                {SOCIAL_PLATFORMS.map((p) => {
                  const on = form.kind === p.kind;
                  const off = taken(p.kind);
                  return (
                    <button
                      key={p.kind}
                      id={`${fieldId}-${p.kind}`}
                      ref={p.kind === open[0]?.kind ? firstRadio : undefined}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={off}
                      tabIndex={p.kind === tabStop ? 0 : -1}
                      className={cx(styles.option, on && styles.optionOn)}
                      onClick={() => form && openForm({ ...form, kind: p.kind, draft: '' })}
                      onKeyDown={(e) => onRadioKey(e, p.kind)}
                    >
                      <BrandIcon mark={p.kind} size={14} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {plat && (
            <div className={styles.field}>
              <label htmlFor={`${fieldId}-input`} className={styles.label}>
                {plat.kind === 'website' ? C.websiteField : C.field(plat.label)}
              </label>
              <PrefixedInput
                ref={input}
                id={`${fieldId}-input`}
                prefix={plat.prefix}
                placeholder={plat.placeholder}
                value={draft}
                invalid={!!problem}
                aria-describedby={noteId}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, draft: tidyDraft(plat.kind, e.target.value) } : f))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submit();
                  }
                  if (e.key === 'Escape') close();
                }}
              />
              <span id={noteId} className={cx(styles.note, problem && styles.noteBad)}>
                {note}
              </span>
            </div>
          )}
          {saveError && (
            // Keyed by the try, so the same refusal twice is said twice.
            <p key={saveErrorKey} role="alert" className={styles.error}>
              {saveError}
            </p>
          )}
          <div className={styles.actions}>
            <Button
              variant="primary"
              size="small"
              // Not disabled while saving: focus stays on it (submit ignores a second press).
              disabled={!plat || !draft.trim() || !!problem}
              aria-busy={saving || undefined}
              onClick={() => void submit()}
            >
              {saving ? C.saving : form.editId ? C.saveEdit : C.saveNew}
            </Button>
            <Button variant="text-secondary" size="small" onClick={close} disabled={saving}>
              {C.cancel}
            </Button>
          </div>
        </div>
      )}

      {status === 'loading' ? (
        <div role="status" aria-busy="true" aria-label={C.loading}>
          {[0, 1].map((i) => (
            <div key={i} className={styles.row}>
              <Skeleton width="36px" height="36px" radius="full" />
              <div className={styles.text}>
                <Skeleton width="30%" height="16px" />
                <Skeleton width="50%" height="14px" />
              </div>
            </div>
          ))}
        </div>
      ) : status === 'error' ? (
        // Error before empty: a failed load never reads as "no links".
        <div className={styles.state} role="alert">
          <EmptyState illustration="forms" size={120} headingLevel={3} title={C.loadError} />
          <Button variant="secondary-outlined" size="medium" onClick={onRetry}>
            {C.retry}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>{C.empty}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => {
            const label = markLabel(r.mark);
            // Up to three websites: each control names which one.
            const name = r.kind === 'website' ? `${label}, ${displayUrl(r.url)}` : label;
            return (
              <li key={r.id} className={styles.row}>
                <span className={styles.disc}>
                  <BrandIcon mark={r.mark} size={18} />
                </span>
                <div className={styles.text}>
                  <span className={styles.rowTitle}>{label}</span>
                  <span className={styles.url}>{displayUrl(r.url)}</span>
                </div>
                <IconButton
                  id={`${fieldId}-edit-${r.id}`}
                  icon="edit"
                  size="sm"
                  shape="square"
                  aria-label={C.editAria(name)}
                  onClick={() => openForm({ editId: r.id, kind: r.kind, draft: r.value })}
                />
                <IconButton
                  icon="delete"
                  size="sm"
                  shape="square"
                  tone="danger"
                  aria-label={C.removeAria(name)}
                  onClick={() => onRemove(r)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
