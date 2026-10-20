'use client';

import { Avatar, type PhotoSize } from '@/components/atoms/Avatar/Avatar';
import type { CoverKey } from '@/lib/utils/cover';
import type { PhotoFocus } from '@/lib/utils/person';
import { PhotoPicker } from '../PhotoPicker/PhotoPicker';

/** Whose photo: what the circle shows. */
export type PhotoPerson = {
  initials: string;
  /** Their cover: the initials sit on its deep tone. */
  cover: CoverKey;
  src: string | null;
  focus?: PhotoFocus | null;
  /** The photo's accessible name (their name, or e.g. "Your photo"). */
  name: string;
};

/**
 * The upload's state and actions, named as useAvatarUpload returns them, so a
 * page passes the hook's result as it is. `remove` is the failed removal's
 * "Try again".
 */
export type PhotoUpload = {
  accept: string;
  upload: (file: File) => void;
  uploading: boolean;
  error: string | null;
  errorFrom?: 'upload' | 'remove' | null;
  dismissError: () => void;
  remove?: () => void;
  removing?: boolean;
  removedStamp?: number;
};

type ProfilePhotoProps = {
  person: PhotoPerson;
  size: PhotoSize;
  upload: PhotoUpload;
  /**
   * With a photo, the badge offers "Remove photo": the page confirms
   * (RemovePhotoConfirm), then removes. Omit for a badge that only picks.
   */
  onRemove?: () => void;
  /** The file input's id, so something else on the page can open the picker. */
  inputId?: string;
  /** How far down (0–1) the crop sits when the face isn't known. */
  objectY?: number;
  ring?: 'none' | 'white';
  className?: string;
};

/**
 * The owner's own photo, editable (ProfilePhoto.dc.html): the person's face or
 * initials with the camera badge on its corner. One for every role and screen.
 */
export function ProfilePhoto({
  person,
  size,
  upload,
  onRemove,
  inputId,
  objectY,
  ring,
  className,
}: ProfilePhotoProps) {
  return (
    <Avatar
      size={size}
      initials={person.initials}
      tone={person.cover}
      src={person.src}
      focus={person.focus}
      alt={person.name}
      objectY={objectY}
      ring={ring}
      className={className}
    >
      <PhotoPicker
        inputId={inputId}
        // Under 96px the badge sits flush with the corner (ProfilePhoto.dc.html).
        compact={size < 96}
        hasPhoto={!!person.src}
        accept={upload.accept}
        uploading={upload.uploading}
        onFile={upload.upload}
        error={upload.error}
        errorFrom={upload.errorFrom}
        onDismissError={upload.dismissError}
        onRemove={onRemove}
        onRetryRemove={onRemove ? upload.remove : undefined}
        removing={upload.removing}
        removedStamp={upload.removedStamp}
      />
    </Avatar>
  );
}
