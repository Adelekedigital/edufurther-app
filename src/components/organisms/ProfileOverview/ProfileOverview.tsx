'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { FactTile } from '@/components/molecules/FactTile/FactTile';
import { IconListItem } from '@/components/molecules/IconListItem/IconListItem';
import { SocialLink } from '@/components/molecules/SocialLink/SocialLink';
import { cx } from '@/lib/utils/cx';
import type { MentorProfile, ProfileItem } from '@/types/mentor';
import { movedBetween } from '@/lib/utils/format';
import styles from './ProfileOverview.module.css';

type ProfileOverviewProps = {
  profile: MentorProfile;
  /**
   * The owner's About editing (Mentor Profile.dc.html `canEditAbout` /
   * `editingAbout`): an "Edit" link in the heading row, and the editor in
   * place of the text while it's open.
   */
  aboutEdit?: { onEdit: () => void; editor: ReactNode | null };
  /**
   * The owner's Background editing (Mentor Profile.dc.html `editBackground`):
   * "Edit" in the heading row, or with nothing added yet, "Add" and an
   * invitation card.
   */
  onEditBackground?: () => void;
  /** The heading's Edit/Add, for the page to return focus to after a save. */
  backgroundEditRef?: Ref<HTMLButtonElement>;
  /** The owner's awards: "Add award" and each row's Edit. */
  awardsEdit?: EntryEdit;
  /** The owner's education: "Add education" and each row's Edit. */
  educationEdit?: EntryEdit;
  /** Each section's "Add …", for the page to return focus to after a row is removed. */
  awardsAddRef?: Ref<HTMLButtonElement>;
  educationAddRef?: Ref<HTMLButtonElement>;
};

type EntryEdit = {
  onAdd: () => void;
  onEdit: (id: string) => void;
};

/** Mentor Profile.dc.html award badges: only what the mentor said (backend). */
const FUNDING_BADGE = { full: 'Fully funded', partial: 'Partial funding' } as const;

/**
 * The Overview tab (Mentor Profile.dc.html): About, social links, Education,
 * Scholarships and awards, Background. A section with nothing in it is left
 * out, as the design does for a viewer who can't edit; the owner gets an
 * invitation to add it instead. Awards show "Fully funded" / "Partial
 * funding" when the mentor said so.
 */
export function ProfileOverview({
  profile,
  aboutEdit,
  onEditBackground,
  backgroundEditRef,
  awardsEdit,
  educationEdit,
  awardsAddRef,
  educationAddRef,
}: ProfileOverviewProps) {
  // When the editor closes, focus goes back to "Edit".
  const editRef = useRef<HTMLButtonElement>(null);
  const editing = !!aboutEdit?.editor;
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (wasEditing.current && !editing) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  const p = profile;
  const facts = [
    p.originCountry && { icon: 'home_pin', tone: 'green', label: 'From', value: p.originCountry },
    p.studyCountry && { icon: 'school', tone: 'blue', label: 'Studied in', value: p.studyCountry },
    p.languages.length > 0 && {
      icon: 'translate',
      tone: 'gold',
      label: 'Mentors in',
      value: p.languages.join(', '),
    },
  ].filter(Boolean) as {
    icon: 'home_pin' | 'school' | 'translate';
    tone: 'green' | 'blue' | 'gold';
    label: string;
    value: string;
  }[];
  // "…to the United States": the same rule as the first-mentees card (copy
  // fix made here, design-divergence.md).
  const move = movedBetween(p.originCountry, p.studyCountry);
  const moved = move
    ? `Has made the move from ${move.from} to ${move.to}, a path many mentees are planning.`
    : null;

  return (
    <div className={styles.overview}>
      {(p.about || p.socials.length > 0 || aboutEdit) && (
        <section className={styles.section} aria-labelledby="about-h">
          <div className={styles.headRow}>
            <h2 id="about-h" className={styles.h2}>
              About
            </h2>
            {aboutEdit && !editing && (
              <button
                ref={editRef}
                type="button"
                className={styles.edit}
                onClick={aboutEdit.onEdit}
                aria-label="Edit About"
              >
                <Icon name="edit" size={16} />
                Edit
              </button>
            )}
          </div>
          {editing ? (
            aboutEdit!.editor
          ) : p.about ? (
            <About text={p.about} />
          ) : aboutEdit ? (
            // PROVISIONAL: the design draws no empty About for the owner.
            <p className={styles.aboutEmpty}>
              Tell mentees about your path: what you studied, where, and what you can help with.
            </p>
          ) : null}
          {p.socials.length > 0 && (
            <div className={styles.socials}>
              {p.socials.map((s) => (
                <SocialLink key={s.kind} kind={s.kind} href={s.href} />
              ))}
            </div>
          )}
        </section>
      )}

      <EntrySection
        id="edu-h"
        title="Education"
        icon="school"
        tone="blue"
        items={p.education}
        edit={educationEdit}
        addRef={educationAddRef}
        add="Add education"
        empty={{ title: 'Add your degrees', body: 'Mentees filter by degree and school.' }}
      />

      <EntrySection
        id="awards-h"
        title="Scholarships and awards"
        icon="workspace_premium"
        tone="gold"
        items={p.awards.map((a) => ({
          ...a,
          badge: a.funding ? FUNDING_BADGE[a.funding] : null,
        }))}
        edit={awardsEdit}
        addRef={awardsAddRef}
        add="Add award"
        empty={{
          title: 'Add the funding you’ve won',
          body: 'Scholarships and assistantships show mentees you’ve done what they’re trying to do.',
        }}
      />

      {(facts.length > 0 || onEditBackground) && (
        <section className={styles.section} aria-labelledby="bg-h">
          <div className={styles.headRow}>
            <h2 id="bg-h" className={styles.h2}>
              Background
            </h2>
            {onEditBackground && (
              <button
                ref={backgroundEditRef}
                type="button"
                className={styles.edit}
                onClick={onEditBackground}
                aria-label={facts.length ? 'Edit background' : 'Add background'}
              >
                <Icon name={facts.length ? 'edit' : 'add'} size={16} />
                {facts.length ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {facts.length === 0 && onEditBackground && (
            <InviteCard
              icon="public"
              title="Tell mentees where you’re from"
              body="Mentees often look for mentors who made the same move. Add your countries and languages."
              action="Add background"
              onAction={onEditBackground}
            />
          )}
          {facts.length > 0 && (
            <div className={styles.facts}>
              {facts.map((f) => (
                <FactTile key={f.label} {...f} />
              ))}
            </div>
          )}
          {moved && (
            <p className={styles.moved}>
              <Icon name="flight_takeoff" size={16} className={styles.movedIcon} />
              {moved}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Education or Scholarships and awards (Mentor Profile.dc.html `blocks`). For
 * the owner: "Add …" in the heading, Edit on each row, and an invitation when
 * there's nothing yet. Empty for anyone else: left out.
 */
function EntrySection({
  id,
  title,
  icon,
  tone,
  items,
  edit,
  addRef,
  add,
  empty,
}: {
  id: string;
  title: string;
  icon: IconName;
  tone: 'blue' | 'gold';
  items: (ProfileItem & { badge?: string | null })[];
  edit?: EntryEdit;
  addRef?: Ref<HTMLButtonElement>;
  add: string;
  empty: { title: string; body: string };
}) {
  if (!items.length && !edit) return null;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.headRow}>
        <h2 id={id} className={styles.h2}>
          {title}
        </h2>
        {edit && (
          <button ref={addRef} type="button" className={styles.edit} onClick={edit.onAdd}>
            <Icon name="add" size={16} />
            {add}
          </button>
        )}
      </div>
      {items.length === 0 && edit ? (
        <InviteCard
          icon={icon}
          title={empty.title}
          body={empty.body}
          action={add}
          onAction={edit.onAdd}
        />
      ) : (
        <div className={styles.list}>
          {items.map((it) => (
            <IconListItem
              key={it.id}
              icon={icon}
              tone={tone}
              title={it.title}
              meta={it.meta}
              trailing={
                (it.badge || edit) && (
                  <>
                    {it.badge && (
                      <Badge type="accent" color="green" size="sm">
                        {it.badge}
                      </Badge>
                    )}
                    {edit && (
                      <IconButton
                        icon="edit"
                        size="sm"
                        shape="square"
                        aria-label={`Edit ${it.title}`}
                        onClick={() => edit.onEdit(it.id)}
                      />
                    )}
                  </>
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** The owner's dashed invitation to add what's missing (Mentor Profile.dc.html `showEmpty`). */
function InviteCard({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className={styles.bgEmpty}>
      <span className={styles.bgEmptyIcon}>
        <Icon name={icon} size={20} />
      </span>
      <div className={styles.bgEmptyText}>
        <span className={styles.bgEmptyTitle}>{title}</span>
        <span className={styles.bgEmptyBody}>{body}</span>
      </div>
      <Button onClick={onAction}>{action}</Button>
    </div>
  );
}

/** Three lines, then "Show more" — only when the text really is longer. */
function About({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);
  return (
    <>
      <p ref={ref} id="about-text" className={cx(styles.about, !open && styles.clamped)}>
        {text}
      </p>
      {(overflows || open) && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="about-text"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}
