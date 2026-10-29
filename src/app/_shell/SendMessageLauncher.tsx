'use client';

import { useEffect, useRef, useState } from 'react';
import { FileViewerLauncher } from '@/app/_shell/FileViewerLauncher';
import { SendMessage } from '@/components/templates/SendMessage/SendMessage';
import { useAttachedFile } from '@/lib/api/data/attachedFile';
import { isFileExpired, messageViewerFile } from '@/lib/utils/files';
import { useChatStatus } from '@/lib/api/data/messages';
import { outboxItem, useOutbox, useSendMessage } from '@/lib/api/data/messageSend';
import { COMPOSER_COPY, SEND_MESSAGE_COPY as C } from '@/lib/copy/messages';
import type { MessageRecipient } from '@/types/messages';

type SendMessageLauncherProps = {
  /** Who it writes to; null keeps it closed. */
  to: MessageRecipient | null;
  onClose: () => void;
};

/**
 * Opens SendMessage for any recipient, wiring the chat's status (lock and
 * session window, `useChatStatus`), the upload and the shared outbox once, so
 * every Message button writes the same way, into the same chat as /messages.
 * Mounted closed with `to=null`; the state starts afresh for each recipient.
 */
export function SendMessageLauncher({ to, onClose }: SendMessageLauncherProps) {
  if (!to) return null;
  return <Open key={to.id} to={to} onClose={onClose} />;
}

function Open({ to, onClose }: { to: MessageRecipient; onClose: () => void }) {
  const status = useChatStatus(to.id);
  const { send, retry, discard } = useSendMessage();
  const attached = useAttachedFile();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const file = attached.file;
  const [phase, setPhase] = useState<'compose' | 'sending' | 'waiting' | 'sent'>('compose');
  const [failed, setFailed] = useState(false);
  // The message that failed, kept with its id: Send again with nothing
  // changed retries it, so the server stores it once whatever happened to the
  // first response. Changed text or file is a new message (the failed one
  // stays in the chat as "Not sent", where it can still be retried).
  const [lastTry, setLastTry] = useState<{
    id: string;
    text: string;
    fileId: string | null;
  } | null>(null);
  const [viewing, setViewing] = useState(false);

  const thread = status.data;
  // This message in the shared outbox: there while unsent, gone once stored.
  const outbox = useOutbox(to.id);
  const pending = lastTry ? outbox.find((i) => i.clientId === lastTry.id) : undefined;
  // Offline, the outbox holds it and sends it on reconnect (in order, same
  // client_id). Waiting ends when it leaves the outbox: stored, so sent.
  // A queued send that the reconnect then refuses comes back to the form,
  // failed, so Send again retries it (same client_id), never stuck on Sending….
  // After a send that didn't land, the outbox item's own status decides what
  // shows (waiting offline, sending again on reconnect, failed), never a second
  // look at the connection that may have changed meanwhile.
  let shownPhase = phase;
  let shownFailed = failed;
  if (phase === 'waiting') {
    if (!pending) shownPhase = 'sent';
    else if (pending.status === 'failed') {
      shownPhase = 'compose';
      shownFailed = true;
    } else if (pending.status === 'sending') shownPhase = 'sending';
  }
  const failure = !shownFailed
    ? null
    : pending?.problem?.endsWith('/problems/not-connected')
      ? C.notConnected(to.firstName)
      : C.failed;

  // The file expired before the send (its upload swept after 24 hours): Send
  // again can't help, so the message goes from the outbox, the text stays in
  // the form, and the file line says to attach it again.
  const expire = (clientId: string) => {
    discard(clientId);
    setLastTry(null);
    setFailed(false);
    setPhase('compose');
    attached.fail(COMPOSER_COPY.fileExpired);
  };
  // The same refusal arriving later (a send queued offline, refused on
  // reconnect): the expired file is hidden and the file line says why at once;
  // a file picked since shows and sends as usual. The next Send drops the
  // refused one from the outbox and sends a new message.
  const expiredLater = !!pending && pending.status === 'failed' && isFileExpired(pending.problem);
  const expiredFile = expiredLater ? (pending?.file?.id ?? lastTry?.fileId ?? null) : null;
  const shownFile = file && file.id === expiredFile ? null : file;
  const shownFileError =
    expiredLater && !shownFile && !attached.uploading && !attached.error
      ? COMPOSER_COPY.fileExpired
      : attached.error;

  // A 403, or a 404 ("not connected", as for the chat itself): said up front.
  const refused = status.error?.kind === 'forbidden' || status.error?.kind === 'notFound';

  const onSend = async (text: string) => {
    let last = lastTry;
    if (expiredLater && pending) {
      discard(pending.clientId);
      setLastTry(null);
      last = null;
    }
    const sending = shownFile;
    const fileId = sending?.id ?? null;
    const same = !!last && last.text === text && last.fileId === fileId;
    // The same message, no longer in the outbox: it was stored meanwhile.
    if (same && !pending) {
      setPhase('sent');
      return;
    }
    setPhase('sending');
    setFailed(false);
    try {
      let ok: boolean;
      const id = same && last ? last.id : crypto.randomUUID();
      if (same) {
        ok = await retry(id);
      } else {
        setLastTry({ id, text, fileId });
        ok = await send({ to: to.id, body: text, file: sending, clientId: id });
      }
      if (!ok && isFileExpired(outboxItem(id)?.problem)) {
        // Closed meanwhile: leave it in the chat as Not sent, where it can be seen.
        if (mounted.current) expire(id);
        return;
      }
      setPhase(ok ? 'sent' : 'waiting');
    } catch {
      // Nothing was queued for a new message: Send again must send it, not
      // take its absence from the outbox for "stored".
      if (!same) setLastTry(null);
      setPhase('compose');
      setFailed(true);
    }
  };

  return (
    <>
      <SendMessage
        to={to}
        sessionWindow={thread?.sessionWindow ?? false}
        lock={thread?.lock ?? null}
        status={status.isLoading ? 'loading' : refused ? 'refused' : 'ready'}
        phase={shownPhase}
        failure={expiredLater ? null : failure}
        onSend={(text) => void onSend(text)}
        file={shownFile}
        uploading={attached.uploading}
        fileError={shownFileError}
        onPickFile={(f) => void attached.pick(f)}
        onRemoveFile={attached.clear}
        onViewFile={() => setViewing(true)}
        chatHref={`/messages?with=${encodeURIComponent(to.id)}`}
        onClose={onClose}
      />
      {viewing && file && (
        <FileViewerLauncher
          file={messageViewerFile(file)}
          sharedBy={{ mine: true }}
          onClose={() => setViewing(false)}
        />
      )}
    </>
  );
}
