import type { Metadata } from 'next';
import type { MentorPreview } from '@/lib/api/data/mentorPreview';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';

const COPY = MENTOR_SHARE_COPY.preview;

/**
 * The profile's tab title and og: lines. A profile the server can't read
 * (hidden, unapproved, missing, a failure) gets the generic lines, so a link
 * never previews as an error. The image is opengraph-image.tsx.
 */
export function mentorPreviewMetadata(mentor: MentorPreview | null): Metadata {
  const title = mentor ? COPY.title(mentor.name) : COPY.fallbackTitle;
  const description = mentor ? COPY.description(mentor) : COPY.fallbackBody;
  return {
    // The root template adds " · EduFurther".
    title: mentor ? mentor.name : COPY.tabFallback,
    description: mentor ? description : COPY.tabDescription,
    openGraph: { title, description, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
