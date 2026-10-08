'use client';

import type { ComponentProps } from 'react';
import { ReviewFlow } from '@/components/organisms/ReviewFlow/ReviewFlow';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';

type ReviewDialogProps = Omit<ComponentProps<typeof ReviewFlow>, 'renderShell'>;

/**
 * The review modal (ReviewModal.dc.html) as every page opens it: ReviewFlow in
 * a ModalShell. Shared by the mentor's profile and the session page, so the
 * two can never word or frame a review differently.
 */
export function ReviewDialog(props: ReviewDialogProps) {
  return (
    <ReviewFlow
      {...props}
      renderShell={(shell, body) => (
        <ModalShell
          title={shell.title}
          subtitle={shell.subtitle}
          icon={shell.icon}
          tone={shell.tone}
          size="md"
          onClose={props.onClose}
        >
          {body}
        </ModalShell>
      )}
    />
  );
}
