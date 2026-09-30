import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { groupTopics } from '@/lib/utils/topicGroups';
import { ProfileItemModal, type ProfileItemModalProps } from './ProfileItemModal';

/** ProfileItemModal.dc.html: the owner's topics and background editors. */
const meta: Meta = { title: 'Organisms/Profile item modal' };
export default meta;
type Story = StoryObj;

const catalog = [
  ['o5', 'test-preparation', 'Test Preparation'],
  ['o4', 'document-preparation', 'Document Preparation'],
  ['o1', 'school-selection', 'School Selection'],
  ['o3', 'program-selection', 'Program Selection'],
  ['o6', 'scholarships-financial-aid', 'Scholarships & Financial Aid'],
  ['o2', 'interview-preparation', 'Interview Preparation'],
].map(([id, slug, label]) => ({ id: id!, slug: slug!, label: label! }));

const ALL_LANGUAGES = [
  'Afrikaans',
  'Amharic',
  'Arabic',
  'English',
  'French',
  'Hausa',
  'Igbo',
  'Nigerian Pidgin',
  'Portuguese',
  'Swahili',
  'Twi',
  'Yoruba',
  'Zulu',
].map((label) => ({ id: label.toLowerCase(), label }));

const countries = ['Nigeria', 'Ghana', 'Kenya', 'United States', 'United Kingdom', 'Canada'].map(
  (label) => ({ id: label, label }),
);

// Organism stories can't import ModalShell (a template), so this stand-in
// frame is 480px like the modal's md size, with its padding and gap; the page
// renders it in ModalShell.
function Frame(props: ProfileItemModalProps) {
  return (
    <ProfileItemModal
      {...props}
      renderShell={(s, body) => (
        <div
          role="dialog"
          aria-label={s.title}
          style={{
            maxWidth: 480,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{s.title}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-tertiary)' }}>{s.subtitle}</p>
          </div>
          {body}
        </div>
      )}
    />
  );
}

function Background({
  status = 'ready' as 'ready' | 'loading' | 'error',
  languages = 'ready' as 'ready' | 'loading' | 'error',
  list = countries,
}) {
  const [q, setQ] = useState('');
  const results = ALL_LANGUAGES.filter((l) => l.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Frame
      kind="background"
      countries={list}
      languages={{
        results: languages === 'ready' ? results : [],
        query: q,
        onQueryChange: setQ,
        status: languages,
        onRetry: fn(),
      }}
      initial={{
        originId: 'Nigeria',
        studyId: 'United States',
        languages: [ALL_LANGUAGES[3]!, ALL_LANGUAGES[11]!],
      }}
      catalog={{ status, onRetry: fn() }}
      saving={false}
      error={null}
      onSave={fn()}
      onClose={fn()}
      renderShell={() => null}
    />
  );
}

const topics = (over: Partial<ProfileItemModalProps> = {}) => (
  <Frame
    kind="topics"
    groups={groupTopics(catalog)}
    initial={['o1', 'o6']}
    catalog={{ status: 'ready', onRetry: fn() }}
    saving={false}
    error={null}
    onSave={fn()}
    onClose={fn()}
    renderShell={() => null}
    {...(over as object)}
  />
);

export const Topics: Story = { render: () => topics() };
export const TopicsSaving: Story = { render: () => topics({ saving: true }) };
export const TopicsSaveFailed: Story = {
  render: () =>
    topics({
      error: 'You’re offline. Your changes are still here; try again when you’re connected.',
    }),
};
export const TopicsLoading: Story = {
  render: () => topics({ catalog: { status: 'loading', onRetry: fn() } }),
};
export const TopicsError: Story = {
  render: () => topics({ catalog: { status: 'error', onRetry: fn() } }),
};
export const TopicsEmpty: Story = {
  render: () => topics({ groups: [] } as Partial<ProfileItemModalProps>),
};

export const BackgroundEdit: Story = { render: () => <Background /> };
export const BackgroundLanguagesLoading: Story = {
  render: () => <Background languages="loading" />,
};
export const BackgroundLanguagesError: Story = { render: () => <Background languages="error" /> };
export const BackgroundCountriesLoading: Story = { render: () => <Background status="loading" /> };
export const BackgroundCountriesError: Story = { render: () => <Background status="error" /> };
export const BackgroundCountriesEmpty: Story = { render: () => <Background list={[]} /> };
export const Phone: Story = {
  render: () => <Background />,
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};

const award = (over: Partial<ProfileItemModalProps> = {}) => (
  <Frame
    kind="award"
    editing={false}
    initial={null}
    thisYear={2026}
    saving={false}
    error={null}
    onSave={fn()}
    onClose={fn()}
    renderShell={() => null}
    {...(over as object)}
  />
);
const saved = {
  title: 'Fulbright Scholarship',
  org: 'Stanford University',
  year: 2022,
  funding: 'full' as const,
};

export const AwardAdd: Story = { render: () => award() };
export const AwardEdit: Story = {
  render: () =>
    award({
      editing: true,
      initial: saved,
    } as Partial<ProfileItemModalProps>),
};
export const AwardSaving: Story = {
  render: () =>
    award({ editing: true, initial: saved, saving: true } as Partial<ProfileItemModalProps>),
};
export const AwardSaveFailed: Story = {
  render: () =>
    award({
      editing: true,
      initial: saved,
      error: 'That didn’t save. Try again.',
    } as Partial<ProfileItemModalProps>),
};
export const AwardLongNames: Story = {
  render: () =>
    award({
      editing: true,
      initial: {
        ...saved,
        title:
          'Mastercard Foundation Scholars Program at the University of Edinburgh School of Social and Political Science',
        org: 'The University of Edinburgh, College of Arts, Humanities and Social Sciences',
      },
    } as Partial<ProfileItemModalProps>),
};
export const AwardPhone: Story = {
  render: () => award(),
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};

const education = (over: Partial<ProfileItemModalProps> = {}) => (
  <Frame
    kind="education"
    editing={false}
    initial={null}
    thisYear={2026}
    hasOther={false}
    saving={false}
    error={null}
    onSave={fn()}
    onClose={fn()}
    renderShell={() => null}
    {...(over as object)}
  />
);
const degree = {
  school: 'Mississippi State University',
  degree: 'PhD',
  course: 'Sociology',
  start: 2023,
  end: 2027,
  current: true,
};

export const EducationAdd: Story = { render: () => education() };
/** Another degree is current: a new one isn't, and ticking it says it replaces that one. */
export const EducationAddWithCurrent: Story = {
  render: () => education({ hasOther: true } as Partial<ProfileItemModalProps>),
};
export const EducationEdit: Story = {
  render: () =>
    education({
      editing: true,
      initial: degree,
    } as Partial<ProfileItemModalProps>),
};
export const EducationLoading: Story = {
  render: () =>
    education({
      editing: true,
      catalog: { status: 'loading', onRetry: fn() },
    } as Partial<ProfileItemModalProps>),
};
export const EducationLoadError: Story = {
  render: () =>
    education({
      editing: true,
      catalog: { status: 'error', onRetry: fn() },
    } as Partial<ProfileItemModalProps>),
};
export const EducationLongSchool: Story = {
  render: () =>
    education({
      editing: true,
      initial: {
        ...degree,
        school: 'The London School of Hygiene and Tropical Medicine, University of London',
        course: 'Global Health Policy and Health Systems Economics',
      },
    } as Partial<ProfileItemModalProps>),
};
export const EducationPhone: Story = {
  render: () => education(),
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};
