'use client';

import { useState } from 'react';
import { FileViewerLauncher } from '@/app/_shell/FileViewerLauncher';
import { SendMessage } from '@/components/templates/SendMessage/SendMessage';
import { useUploadMessageFile } from '@/lib/api/data/messageFiles';
import { useChatStatus } from '@/lib/api/data/messages';
import { useSendMessage } from '@/lib/api/data/messageSend';
import type { MessageFile, MessageRecipient } from '@/types/messages';

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
  const { send, retry } = useSendMessage();
  const upload = useUploadMessageFile();
  const [phase, setPhase] = useState<'compose' | 'sending' | 'sent'>('compose');
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
  const [file, setFile] = useState<MessageFile | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);

  const thread = status.data;

  const onSend = async (text: string) => {
    setPhase('sending');
    setFailed(false);
    let ok: boolean;
    const fileId = file?.id ?? null;
    if (lastTry && lastTry.text === text && lastTry.fileId === fileId) {
      ok = await retry(lastTry.id);
    } else {
      const id = crypto.randomUUID();
      setLastTry({ id, text, fileId });
      ok = await send({ to: to.id, body: text, file, clientId: id });
    }
    if (ok) {
      setPhase('sent');
    } else {
      setPhase('compose');
      setFailed(true);
    }
  };

  const onPickFile = async (picked: File) => {
    setFileError(null);
    setUploading(picked.name);
    try {
      setFile(await upload(picked));
    } catch (e) {
      setFileError((e as { message?: string }).message ?? null);
    } finally {
      setUploading(null);
    }
  };

  return (
    <>
      <SendMessage
        to={to}
        sessionWindow={thread?.sessionWindow ?? false}
        lock={thread?.lock ?? null}
        phase={phase}
        failed={failed}
        onSend={(text) => void onSend(text)}
        file={file}
        uploading={uploading}
        fileError={fileError}
        onPickFile={(f) => void onPickFile(f)}
        onRemoveFile={() => {
          setFile(null);
          setFileError(null);
        }}
        onViewFile={() => setViewing(true)}
        chatHref={`/messages?with=${encodeURIComponent(to.id)}`}
        onClose={onClose}
      />
      {viewing && file && (
        <FileViewerLauncher
          file={{
            kind: 'message',
            id: file.id,
            name: file.name,
            contentType: file.contentType,
            size: file.sizeBytes,
            available: true,
          }}
          sharedBy={{ mine: true }}
          onClose={() => setViewing(false)}
        />
      )}
    </>
  );
}
