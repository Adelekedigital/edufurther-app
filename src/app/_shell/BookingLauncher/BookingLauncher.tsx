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
import { deviceTimeZone } from '@/lib/utils/format';
import type { Mentor } from '@/types/mentor';

type BookingLauncherProps = {
  /** The mentor to book; null closes the flow (the query stays mounted, disabled). */
  mentor: Mentor | null;
  /** A guest signs up after choosing a time; on member screens this is false. */
  isGuest?: boolean;
  /** Hide the flow's "View profile" link (e.g. a mentor with no public profile). */
  hideProfileLink?: boolean;
  /** The mentor's rating/reviews aren't known (e.g. a met mentor from /me/mentors). */
  ratingUnknown?: boolean;
  onClose: () => void;
  /** The flow closed after the request went through (onboarding then goes Home, PRD US-5). */
  onBooked?: () => void;
};

/**
 * Opens the Explore booking modal (BookingFlow) for any `mentor`, wiring the
 * shared session-types / slots / request / upload hooks and the modal shell once
 * so every screen books the same way. Mounted with `mentor=null` when closed;
 * the queries sit disabled until a mentor is set.
 */
export function BookingLauncher({
  mentor,
  isGuest = false,
  hideProfileLink,
  ratingUnknown,
  onClose,
  onBooked,
}: BookingLauncherProps) {
  const [typeIdState, setTypeIdState] = useState<string | null>(null);
  const [zone] = useState(deviceTimeZone);
  const sessionTypes = useSessionTypes(mentor?.id ?? null);
  // The offering being booked: the one picked in the modal, else the first.
  const typeId = typeIdState ?? sessionTypes.data?.[0]?.id ?? null;
  const slots = useSlots(mentor?.id ?? null, typeId, zone);
  const request = useRequestBooking();
  const uploadIntakeFile = useUploadIntakeFile();

  if (!mentor) return null;

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
      sessionTypes={sessionTypes}
      sessionTypeId={typeId}
      onSessionTypeChange={setTypeIdState}
      slots={slots}
      isGuest={isGuest}
      onRequest={request.request}
      requestPending={request.isPending}
      requestDone={request.isDone}
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
