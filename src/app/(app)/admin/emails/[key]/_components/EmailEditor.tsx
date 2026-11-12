'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SaveBar } from '@/components/molecules/SaveBar/SaveBar';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { useTimedToast } from '@/components/molecules/Snackbar/useTimedToast';
import { ConfirmDialog } from '@/components/templates/ConfirmDialog/ConfirmDialog';
import {
  EmailConflict,
  EmailLinesInvalid,
  EMAIL_NOT_FOUND,
  EMAIL_NOT_SET_UP,
  type EmailDetail,
  type EmailLineError,
  type SaveEmailVariant,
} from '@/lib/api/data/adminEmails';
import { ADMIN_ACTION_FAILED } from '@/lib/copy/admin';
import { EMAIL_EDITOR as C, EMAIL_STATUS, goesTo } from '@/lib/copy/adminEmails';
import { ApiError } from '@/lib/api/data/errors';
import { LINE_LIMITS, VARIANT_CASES, type LineKey } from '@/lib/utils/emailLines';
import { timeAgo } from '@/lib/utils/format';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { EmailPreview } from './EmailPreview';
import {
  asSent,
  draftLine,
  errorText,
  isDirty,
  lineErrors,
  lineMoved,
  linesOf,
  savePayload,
  textOf,
  warningText,
  type Draft,
} from './editorDraft';
import { LineField } from './LineField';
import styles from './EmailEditor.module.css';

const without = <T,>(m: Record<string, T>, id: string) => {
  const next = { ...m };
  delete next[id];
  return next;
};
const panelOf = (variantId: string) => `email-variant-${variantId}`;

type Props = {
  email: EmailDetail;
  /** Every value in the catalogue (what "isn't a value we know" is checked against); null until loaded. */
  known: string[] | null;
  save: (v: SaveEmailVariant) => Promise<EmailDetail>;
  saving: boolean;
  /** Fetch the email again (Reload this email); false when that failed. */
  onReload: () => Promise<boolean>;
};

/**
 * Admin Emails.dc.html "2. Edit an email". Each variant keeps its own draft
 * while the page is open; Save covers the open variant's lines. Errors show
 * after the first Save press, then live. The save bar is the app's shared
 * SaveBar (owner, 9 Nov: DRY), shown while the open variant has changes.
 */
export function EmailEditor({ email, known, save, saving, onReload }: Props) {
  const narrow = useMediaQuery('(max-width: 1023px)');
  const [variantId, setVariantId] = useState(email.variants[0]!.id);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [kept, setKept] = useState<Record<string, LineKey[]>>({});
  const [tried, setTried] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<Record<string, EmailLineError[]>>({});
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState<EmailConflict | null>(null);
  const [toast, setToast] = useTimedToast<{ text: string; ok: boolean; stamp: number }>();
  const [errorKey, setErrorKey] = useState(0);

  const variant = email.variants.find((v) => v.id === variantId) ?? email.variants[0]!;
  const draft = drafts[variant.id] ?? {};
  const keptHere = kept[variant.id] ?? [];
  const locked = !email.live;
  const dirty = !locked && isDirty(variant, draft, keptHere);
  const anyDirty =
    !locked && email.variants.some((v) => isDirty(v, drafts[v.id] ?? {}, kept[v.id] ?? []));
  useLeaveGuard(anyDirty, C.leaveLabel);

  const client = lineErrors(email, variant, draft, known);
  const serverHere = server[variant.id] ?? [];
  const errorFor = (l: LineKey): string | null => {
    const s = serverHere.find((e) => e.line === l);
    if (s) return errorText(s, l, email.name);
    const c = tried[variant.id] ? client[l] : undefined;
    return c ? errorText(c, l, email.name) : null;
  };
  const lines = linesOf(variant);
  const errorCount = lines.filter((l) => errorFor(l)).length;

  const setLine = (l: LineKey, text: string) => {
    setDrafts((d) => {
      const mine = d[variant.id] ?? {};
      return { ...d, [variant.id]: { ...mine, [l]: draftLine(variant, mine, l, text) } };
    });
    // A line the server refused clears once it's edited; the client check takes over.
    setServer((s) => ({ ...s, [variant.id]: (s[variant.id] ?? []).filter((e) => e.line !== l) }));
  };
  // Keep my edit: saved as keep_edit, with the version the line was read at.
  const keep = (l: LineKey) => {
    setKept((k) => ({ ...k, [variant.id]: [...new Set([...(k[variant.id] ?? []), l])] }));
    if (!draft[l]) setLine(l, textOf(variant, draft, l));
  };

  const forget = (id: string) => {
    setDrafts((m) => without(m, id));
    setKept((m) => without(m, id));
    setTried((m) => without(m, id));
    setServer((m) => without(m, id));
  };

  const onSave = () => {
    // After a 409 only Reload moves on: saving again would only meet it again.
    if (conflict) return setErrorKey((k) => k + 1);
    setTried((t) => ({ ...t, [variant.id]: true }));
    if (Object.keys(client).length || serverHere.length) return setErrorKey((k) => k + 1);
    setConfirming(true);
  };

  const confirmSave = async () => {
    try {
      await save(savePayload(variant, draft, keptHere));
      forget(variant.id);
      setConflict(null);
      setToast({ text: C.saved(email.name), ok: true, stamp: Date.now() });
    } catch (e) {
      // Nothing was written: the draft stays for another go.
      if (e instanceof EmailConflict) setConflict(e);
      else if (e instanceof EmailLinesInvalid) {
        setServer((s) => ({ ...s, [variant.id]: e.errors }));
        setTried((t) => ({ ...t, [variant.id]: true }));
      } else {
        setToast({ text: ADMIN_ACTION_FAILED, ok: false, stamp: Date.now() });
        // Not set up since (423) or gone (404): load it again, so the page says so.
        const t = e instanceof ApiError ? e.type : undefined;
        if (t === EMAIL_NOT_SET_UP || t === EMAIL_NOT_FOUND) void onReload();
      }
    } finally {
      setConfirming(false);
    }
  };

  // The draft goes only once the other admin's version is here.
  const reload = async () => {
    if (!(await onReload()))
      return setToast({ text: ADMIN_ACTION_FAILED, ok: false, stamp: Date.now() });
    setDrafts({});
    setKept({});
    setTried({});
    setServer({});
    setConflict(null);
  };

  const statusWord = email.live ? EMAIL_STATUS.live : EMAIL_STATUS.notSetUp;
  const isCase = email.variants.some((v) => VARIANT_CASES.includes(v.id));
  const multi = email.variants.length > 1;
  const sent = (l: LineKey) => asSent(variant, textOf(variant, draft, l));
  const panelId = panelOf(variant.id);

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <Link href="/admin/emails" prefetch={false} className={styles.back}>
          <Icon name="arrow_back" size={18} />
          {C.back}
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{email.name}</h1>
          <Badge type="accent" color={email.live ? 'green' : 'neutral'} size="sm">
            {statusWord}
          </Badge>
        </div>
        <p className={styles.meta}>
          {C.meta(email.trigger, goesTo(email.recipients), email.templateName, email.siblings)}
        </p>
      </div>

      {locked && <Notice tone="brand">{C.notSetUp}</Notice>}

      {multi && (
        <div className={styles.variants}>
          <span className={styles.variantLabel} aria-hidden="true">
            {isCase ? C.variants.case : C.variants.recipient}
          </span>
          <Tabs
            variant="pill"
            label={isCase ? C.variants.case : C.variants.recipient}
            items={email.variants.map((v) => ({
              value: v.id,
              label: v.label,
              panelId: panelOf(v.id),
              // Another variant's unsaved work shows on its tab: Save covers the open one.
              marked: v.id !== variant.id && isDirty(v, drafts[v.id] ?? {}, kept[v.id] ?? []),
              markLabel: C.unsavedTab,
            }))}
            value={variant.id}
            onChange={setVariantId}
          />
        </div>
      )}

      <div className={styles.body}>
        {conflict && (
          <div role="alert" className={styles.conflict}>
            <Icon name="sync_problem" size={20} />
            <span className={styles.conflictText}>
              {conflict.updatedByName.trim()
                ? C.conflict(
                    conflict.updatedByName,
                    timeAgo(conflict.updatedAt),
                    conflict.updatedByName.trim().split(/\s+/)[0]!,
                  )
                : C.conflictUnknown(timeAgo(conflict.updatedAt))}
            </span>
            <Button variant="secondary-outlined" size="small" onClick={() => void reload()}>
              {C.reload}
            </Button>
          </div>
        )}
        <div
          id={panelId}
          {...(multi ? { role: 'tabpanel', 'aria-labelledby': `${panelId}-tab` } : {})}
          className={styles.fields}
        >
          {lines.map((l) => {
            const line = variant.lines[l]!;
            const value = textOf(variant, draft, l);
            // Acted on: a real change, or Keep my edit. Typing and reverting isn't.
            const acted = lineMoved(variant, draft, l) || keptHere.includes(l);
            return (
              <LineField
                key={`${variant.id}-${l}`}
                id={`email-${variant.id}-${l}`}
                label={C.lines[l]}
                value={value}
                onChange={(t) => setLine(l, t)}
                values={email.values.map((v) => ({
                  name: v.name,
                  meaning: v.meaning,
                  example: v.example,
                }))}
                max={LINE_LIMITS[l].max}
                edited={value !== line.defaultText}
                onReset={() => setLine(l, line.defaultText)}
                readOnly={locked}
                mobile={narrow}
                error={errorFor(l)}
                warning={value.trim() ? warningText(l, sent(l)) : null}
                help={C.help(sent(l).length, C.aim[l])}
                defaultChanged={
                  line.defaultChanged && line.newDefault !== null && !acted
                    ? {
                        next: line.newDefault,
                        onUseNew: () => setLine(l, line.newDefault!),
                        onKeep: () => keep(l),
                      }
                    : null
                }
              />
            );
          })}
        </div>
        {/* Every tab names a panel that exists: the closed variants' are empty and hidden. */}
        {multi &&
          email.variants
            .filter((v) => v.id !== variant.id)
            .map((v) => (
              <div
                key={v.id}
                id={panelOf(v.id)}
                role="tabpanel"
                aria-labelledby={`${panelOf(v.id)}-tab`}
                hidden
              />
            ))}
        <EmailPreview
          subject={sent('subject')}
          heading={sent('heading')}
          button={variant.lines.button ? sent('button') : null}
          sampleName={variant.sampleRecipient.name}
          sampleSession={variant.sample.sessionTopic}
          sampleEmail={variant.sampleRecipient.email}
        />
      </div>

      {dirty && (
        <SaveBar
          label={C.save.region}
          message={C.save.unsaved}
          error={
            conflict
              ? C.save.reloadFirst
              : tried[variant.id] && errorCount
                ? C.save.fix(errorCount)
                : null
          }
          errorKey={errorKey}
          discardLabel={C.save.discard}
          saveLabel={C.save.save}
          savingLabel={C.save.saving}
          onDiscard={() => forget(variant.id)}
          onSave={onSave}
          saving={saving}
        />
      )}

      {confirming && (
        <ConfirmDialog
          icon="send"
          title={C.confirm.title(email.name)}
          body={C.confirm.body(email.name, multi ? variant.label : undefined)}
          keepLabel={C.confirm.keep}
          confirmLabel={C.confirm.save}
          pendingLabel={C.save.saving}
          pending={saving}
          onKeep={() => setConfirming(false)}
          onConfirm={() => void confirmSave()}
        />
      )}

      <Snackbar
        message={toast?.text ?? null}
        stamp={toast?.stamp}
        tone={toast?.ok === false ? 'error' : 'success'}
      />
    </div>
  );
}
