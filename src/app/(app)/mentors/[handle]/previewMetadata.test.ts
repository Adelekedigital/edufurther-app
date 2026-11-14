import type { components } from '@/lib/api/generated/schema';
import { MENTOR_PROFILE } from '@/lib/api/data/_test/serverReadHarness';
import { toMentorPreview } from '@/lib/api/data/mentorPreview';
import { mentorPreviewMetadata } from './previewMetadata';

const preview = (r: object) => toMentorPreview(r as components['schemas']['MentorPublicRead']);

describe('mentorPreviewMetadata', () => {
  it('names the mentor and describes them from headline, school and help areas', () => {
    const m = mentorPreviewMetadata(preview(MENTOR_PROFILE));
    const description =
      'Moved from Lagos to Toronto for an MSc. Studied at University of Toronto. Helps with School selection, Visa and interview, Application documents.';
    expect(m.title).toBe('Gbenga Elufisan');
    expect(m.description).toBe(description);
    expect(m.openGraph).toMatchObject({
      title: 'Gbenga Elufisan · EduFurther mentor',
      description,
    });
    expect(m.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Gbenga Elufisan · EduFurther mentor',
    });
  });

  it('a sparse profile describes only what it has', () => {
    const sparse = mentorPreviewMetadata(
      preview({ ...MENTOR_PROFILE, headline: null, education: [], offerings: [] }),
    );
    expect(sparse.openGraph).toMatchObject({
      description: 'A mentor on EduFurther who’s been through it.',
    });
  });

  it('a headline that names the school isn’t followed by it again', () => {
    const m = mentorPreviewMetadata(
      preview({
        ...MENTOR_PROFILE,
        headline: 'MSc Computer Science · University of Toronto',
        offerings: [],
      }),
    );
    expect(m.description).toBe('MSc Computer Science · University of Toronto.');
  });

  it('falls back to the generic preview, never an error, when there is no profile', () => {
    const m = mentorPreviewMetadata(null);
    expect(m.title).toBe('Mentor profile');
    expect(m.openGraph).toMatchObject({
      title: 'Find a mentor on EduFurther',
      description:
        '1:1 help with your grad school applications from mentors who’ve been through it.',
    });
    expect(m.twitter).toMatchObject({ title: 'Find a mentor on EduFurther' });
  });
});
