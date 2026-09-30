'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import {
  BackgroundFields,
  type BackgroundErrors,
  type BackgroundValues,
} from '@/components/molecules/BackgroundFields/BackgroundFields';
import type { LanguageOption } from '@/components/molecules/LanguagePicker/LanguagePicker';
import { TopicPicker } from '@/components/molecules/TopicPicker/TopicPicker';
import type { TopicGroup } from '@/lib/utils/topicGroups';
import styles from './ProfileItemModal.module.css';

export type ItemShell = { title: string; subtitle: string; icon: IconName };

type Common = {
  /** The catalog the form is built from (topics, or countries). */
  catalog: { status: 'loading' | 'error' | 'ready'; onRetry: () => void };
  saving: boolean;
  /** Why the last save failed, in our words. */
  error: string | null;
  onClose: () => void;
  /**
   * PROVISIONAL (design draws no delete; design-divergence.md): a "Remove"
   * that asks first. Only where the item can be deleted.
   */
  remove?: { noun: string; onRemove: () => void; removing: boolean };
  /** The page supplies the frame (ModalShell), as for booking and reviews. */
  renderShell: (shell: ItemShell, body: ReactNode) => ReactNode;
};

type TopicsProps = Common & {
  kind: 'topics';
  groups: TopicGroup[];
  /** Selected topic ids when it opened. */
  initial: string[];
  onSave: (ids: string[]) => void;
};

type BackgroundProps = Common & {
  kind: 'background';
  countries: { id: string; label: string }[];
  languages: {
    results: LanguageOption[];
    query: string;
    onQueryChange: (q: string) => void;
    status: 'loading' | 'error' | 'ready';
    onRetry: () => void;
  };
  initial: BackgroundValues;
  onSave: (values: BackgroundValues) => void;
};

export type ProfileItemModalProps = TopicsProps | BackgroundProps;

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * The owner's item editor (ProfileItemModal.dc.html): "What you help with"
 * (topics) and "Edit background". Holds the draft; Save checks it first and
 * says what's missing (the design disables Save instead: a disabled button
 * explains nothing, review of #78). Unchanged, Save just closes.
 */
export function ProfileItemModal(props: ProfileItemModalProps) {
  const { catalog, saving, error, onClose, remove, renderShell } = props;
  const [topics, setTopics] = useState<string[]>(props.kind === 'topics' ? props.initial : []);
  const [bg, setBg] = useState<BackgroundValues>(
    props.kind === 'background' ? props.initial : { originId: '', studyId: '', languages: [] },
  );
  // The draft starts from `initial` once the catalog has arrived (it may open
  // loading), and only then: a later refetch can't reset what's been picked.
  // The frame stays mounted throughout (review of #85).
  const [seeded, setSeeded] = useState(catalog.status === 'ready');
  if (!seeded && catalog.status === 'ready') {
    setSeeded(true);
    if (props.kind === 'topics') setTopics(props.initial);
    else setBg(props.initial);
  }
  const [problems, setProblems] = useState<BackgroundErrors & { topics?: string }>({});
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // A failed check: focus the first field it names, so its message is read.
  const problemsKey = Object.values(problems).join('|');
  useEffect(() => {
    if (!problemsKey) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [problemsKey]);

  const ready = catalog.status === 'ready';
  const empty =
    ready && (props.kind === 'topics' ? props.groups.length === 0 : props.countries.length === 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (saving || !ready || empty) return;
    if (props.kind === 'topics') {
      if (topics.length === 0) return setProblems({ topics: 'Pick at least one topic.' });
      setProblems({});
      // After a failed save the server may hold part of it: always send then.
      if (!error && sameSet(topics, props.initial)) return onClose();
      return props.onSave(topics);
    }
    const next: BackgroundErrors = {
      ...(!bg.originId && { origin: 'Pick where you’re from.' }),
      ...(!bg.studyId && { study: 'Pick where you studied.' }),
      ...(bg.languages.length === 0 && { languages: 'Add a language you mentor in.' }),
    };
    setProblems(next);
    if (Object.keys(next).length) return;
    const init = props.initial;
    if (
      !error &&
      bg.originId === init.originId &&
      bg.studyId === init.studyId &&
      sameSet(
        bg.languages.map((l) => l.id),
        init.languages.map((l) => l.id),
      )
    )
      return onClose();
    props.onSave(bg);
  };

  const shell: ItemShell =
    props.kind === 'topics'
      ? {
          title: 'What you help with',
          icon: 'sell',
          subtitle: `${topics.length} selected · pick the topics you’re strongest in`,
        }
      : {
          title: 'Edit background',
          icon: 'public',
          subtitle: 'Mentees filter by these, so they help the right people find you.',
        };

  const fields =
    catalog.status === 'loading' ? (
      <div className={styles.loading} role="status">
        <span className="sr-only">Loading…</span>
        <Skeleton height="12px" width="40%" />
        <Skeleton height="40px" radius="lg" />
        <Skeleton height="40px" radius="lg" />
      </div>
    ) : catalog.status === 'error' ? (
      <p className={styles.state}>
        {props.kind === 'topics'
          ? 'We couldn’t load the topics.'
          : 'We couldn’t load the list of countries.'}{' '}
        <button type="button" className={styles.retry} onClick={catalog.onRetry}>
          Try again
        </button>
      </p>
    ) : empty ? (
      <p className={styles.state}>
        {props.kind === 'topics'
          ? 'There are no topics to choose from right now. Try again later.'
          : 'There are no countries to choose from right now. Try again later.'}
      </p>
    ) : props.kind === 'topics' ? (
      <>
        <TopicPicker
          groups={props.groups}
          selected={topics}
          onToggle={(id) =>
            setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))
          }
        />
        {problems.topics && (
          <p role="alert" className={styles.error}>
            {problems.topics}
          </p>
        )}
      </>
    ) : (
      <BackgroundFields
        values={bg}
        onChange={setBg}
        countries={props.countries}
        languages={props.languages}
        errors={problems}
      />
    );

  const body = (
    <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
      {fields}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {remove &&
        (confirming ? (
          <div className={styles.confirm} role="group" aria-label={`Remove this ${remove.noun}?`}>
            <p className={styles.confirmText}>Remove this {remove.noun}? This can’t be undone.</p>
            <div className={styles.confirmActions}>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => setConfirming(false)}
              >
                Keep it
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="small"
                aria-disabled={remove.removing || undefined}
                onClick={() => !remove.removing && remove.onRemove()}
              >
                {remove.removing ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.remove} onClick={() => setConfirming(true)}>
            Remove {remove.noun}
          </button>
        ))}
      <div className={styles.actions}>
        <Button type="button" variant="secondary-outlined" size="large" fullWidth onClick={onClose}>
          Cancel
        </Button>
        {/* aria-disabled, not disabled: a disabled button drops the focus it has. */}
        <Button
          type="submit"
          size="large"
          fullWidth
          aria-disabled={saving || !ready || empty || undefined}
          aria-busy={saving || undefined}
        >
          {saving ? 'Saving…' : props.kind === 'topics' ? 'Save topics' : 'Save changes'}
        </Button>
      </div>
    </form>
  );

  return <>{renderShell(shell, body)}</>;
}
