import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { CoverBanner } from '@/components/molecules/CoverBanner/CoverBanner';
import { ProfilePhoto } from '@/components/molecules/ProfilePhoto/ProfilePhoto';
import { coverVars } from '@/lib/utils/cover';
import { CoverHeader } from './CoverHeader';

/*
 * Each caller's shape, with inline styles standing in for the caller's CSS
 * (ProfileHeader, MentorProfileForm's photo card, MentorCoverCard).
 */
const card = {
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-card)',
};
const upload = {
  accept: 'image/jpeg,image/png,image/webp',
  upload: fn(),
  uploading: false,
  error: null,
  errorFrom: null,
  dismissError: fn(),
};
const icons = ['school', 'payments', 'edit_document'] as const;
const hint = 'JPG, PNG or WebP, max 5 MB. Covers look best at 1440×180 or larger.';

const meta: Meta = { title: 'Organisms/CoverHeader' };
export default meta;
type Story = StoryObj;

/** The profile header: row from 768px, stacked on phones; actions and topics. */
export const Profile: Story = {
  render: () => (
    <div style={{ maxWidth: 1120 }}>
      <CoverHeader
        as="section"
        aria-label="Profile"
        style={{ ...card, borderRadius: 'var(--radius-2xl)' }}
        cover={
          <CoverBanner
            height={140}
            tones={coverVars('sky')}
            art="icons"
            icons={icons}
            tools={
              <Button variant="secondary-outlined" size="small">
                Change cover
              </Button>
            }
          />
        }
        photo={<Avatar size={112} ring="white" initials="GE" tone="sky" alt="Gbenga Elufisan" />}
        overlap={10}
        phoneOverlap={36}
        layout="responsive"
        clearance={24}
        aside={<Button>Book a session</Button>}
        footer={<span>Scholarships · Visas · Statement of purpose</span>}
      >
        <strong>Gbenga Elufisan</strong>
        <p>PhD candidate at Mississippi State</p>
      </CoverHeader>
    </div>
  ),
};

const settingsCard = (title = 'Profile photo and cover') => (
  <div style={{ maxWidth: 640 }}>
    <CoverHeader
      as="section"
      style={{ ...card, borderRadius: 'var(--radius-xl)' }}
      cover={
        <CoverBanner
          height={120}
          scale="md"
          tones={coverVars('mint')}
          art="icons"
          icons={icons}
          tools={
            <Button variant="secondary-outlined" size="small">
              Change cover
            </Button>
          }
        />
      }
      photo={
        <ProfilePhoto
          size={72}
          ring="white"
          person={{ initials: 'GE', cover: 'mint', src: null, name: 'Your photo' }}
          upload={upload}
        />
      }
      overlap={32}
      contentBasis={200}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong>{title}</strong>
        <span>{hint}</span>
      </div>
    </CoverHeader>
  </div>
);

/** Settings › Profile's photo card: the text beside the photo, below the cover. */
export const SettingsPhotoCard: Story = { render: () => settingsCard() };
/** A title that wraps: the card grows downwards, the text never rises over the cover. */
export const LongTitle: Story = {
  render: () =>
    settingsCard('Profile photo and cover, shown on your profile, in Explore and in emails'),
};
/** At 390px: the hint wraps beside the photo, still below the cover. */
export const SettingsPhone: Story = {
  render: () => settingsCard(),
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};

/** The preview card: a 64px cover, a 52px photo, everything stacked. */
export const PreviewCard: Story = {
  render: () => (
    <div style={{ width: 300 }}>
      <CoverHeader
        style={{ ...card, borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}
        cover={
          <CoverBanner
            height={64}
            scale="sm"
            tones={coverVars('peach')}
            art="icons"
            icons={icons}
          />
        }
        photo={<Avatar size={52} ring="white" initials="GE" tone="peach" alt="" />}
        overlap={24}
        layout="stack"
      >
        <strong>Gbenga Elufisan</strong>
      </CoverHeader>
    </div>
  ),
};
