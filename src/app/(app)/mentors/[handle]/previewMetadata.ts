import type { Metadata } from 'next';
import type { MentorPreview } from '@/lib/api/data/mentorPreview';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { mentorProfilePath } from '@/lib/utils/mentorPath';

const COPY = MENTOR_SHARE_COPY.preview;

/**
 * The profile's tab title and og: lines. A profile the server can't read
 * (hidden, unapproved, missing, a failure) gets the generic lines, so a link
 * never previews as an error. The image is opengraph-image.tsx.
 */
export function mentorPreviewMetadata(mentor: MentorPreview | null): Metadata {
  const title = mentor ? COPY.title(mentor.name) : COPY.fallbackTitle;
  const description = mentor ? COPY.description(mentor) : COPY.fallbackBody;
  // One address per mentor (the slug once they have one), so an id link and a
  // slug link count as the same page. Relative: the root metadataBase completes it.
  const url = mentor ? mentorProfilePath(mentor) : undefined;
  return {
    // The root template adds " · EduFurther".
    title: mentor ? mentor.name : COPY.tabFallback,
    description: mentor ? description : COPY.tabDescription,
    ...(url && { alternates: { canonical: url } }),
    openGraph: { title, description, type: 'profile', ...(url && { url }) },
    twitter: { card: 'summary_large_image', title, description },
  };
}
