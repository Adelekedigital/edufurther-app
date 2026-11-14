'use client';

import { useState } from 'react';
import { SignInBookingFlow } from '@/app/_shell/SignInBookingFlow';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import {
  useRequestBooking,
  useSessionTypes,
  useSlots,
  useUploadIntakeFile,
} from '@/lib/api/data/booking';
import { FIRST_PAINT_ZONE, useDeviceTimeZone } from '@/lib/utils/useDeviceTimeZone';
import type { Mentor } from '@/types/mentor';
import type { BookingLauncherProps } from './BookingLauncher';

/**
 * The open booking flow (BookingLauncher's lazy half): the shared session-types
 * / slots / request / upload hooks and the modal shell, wired once so every
 * screen books the same way.
 */
export function OpenBooking({
  mentor,
  entryPoint,
  isGuest = false,
  hideProfileLink,
  ratingUnknown,
  onClose,
  onBooked,
  initialTime,
  initialSessionTypeId,
  startAfterTime,
  timeZone,
}: BookingLauncherProps & { mentor: Mentor }) {
  const [typeIdState, setTypeIdState] = useState<string | null>(null);
  const deviceZone = useDeviceTimeZone() ?? FIRST_PAINT_ZONE;
  const zone = timeZone ?? deviceZone;
  const sessionTypes = useSessionTypes(mentor.id);
  // The offering being booked: the one picked in the modal, else the one
  // remembered from before sign-up (when the mentor still offers it), else the first.
  const remembered = sessionTypes.data?.find((t) => t.id === initialSessionTypeId)?.id;
  const typeId = typeIdState ?? remembered ?? sessionTypes.data?.[0]?.id ?? null;
  const slots = useSlots(mentor.id, typeId, zone);
  const request = useRequestBooking();
  const uploadIntakeFile = useUploadIntakeFile();

  const close = () => {
    const booked = request.isDone;
    setTypeIdState(null);
    request.reset();
    onClose();
    if (booked) onBooked?.();
  };

  return (
    <SignInBookingFlow
      key={mentor.id}
      mentor={mentor}
      entryPoint={entryPoint}
      sessionTypes={sessionTypes}
      sessionTypeId={typeId}
      onSessionTypeChange={setTypeIdState}
      slots={slots}
      isGuest={isGuest}
      initialTime={initialTime}
      startAfterTime={startAfterTime}
      onRequest={request.request}
      requestPending={request.isPending}
      requestDone={request.isDone}
      requestConfirmed={request.isConfirmed}
      requestError={request.error}
      onUpload={uploadIntakeFile}
      onClose={close}
      deviceZone={zone}
      hideProfileLink={hideProfileLink}
      ratingUnknown={ratingUnknown}
      renderShell={(shell, body) => (
        <ModalShell
          title={shell.title}
          subtitle={shell.subtitle}
          size="xl"
          onClose={close}
          sheet={shell.sheet}
          footer={shell.footer}
        >
          {body}
        </ModalShell>
      )}
    />
  );
}
