import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import {
  PreviewUserPicker,
  type PickerRole,
} from '@/components/organisms/PreviewUserPicker/PreviewUserPicker';
import type { PreviewUser } from '@/lib/api/data/previewStore';
import { PreviewBar } from './PreviewBar';

const amara: PreviewUser = {
  id: 'u-1',
  email: 'amara.okafor@example.com',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee',
};
const tunde: PreviewUser = {
  id: 'u-2',
  email: 'tunde.bello@example.com',
  name: 'Tunde Bello',
  firstName: 'Tunde',
  initials: 'TB',
  role: 'mentor',
};

/** The bar with its picker on local state, as PreviewRoot wires it to the API. */
function Wired({ user: initial, open = false }: { user: PreviewUser | null; open?: boolean }) {
  const [user, setUser] = useState(initial);
  const [picking, setPicking] = useState(open);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<PickerRole>('all');
  const q = query.trim().toLowerCase();
  const shown = [amara, tunde].filter(
    (u) => (role === 'all' || u.role === role) && `${u.email} ${u.name}`.toLowerCase().includes(q),
  );
  return (
    <div style={{ minHeight: 520 }}>
      <PreviewBar
        user={user}
        env="staging"
        pickerOpen={picking}
        pickerId="preview-picker"
        onTogglePicker={() => setPicking((p) => !p)}
        onExit={fn()}
        picker={
          <PreviewUserPicker
            id="preview-picker"
            query={query}
            onQuery={setQuery}
            role={role}
            onRole={setRole}
            users={shown}
            status="ready"
            onRetry={fn()}
            currentId={user?.id ?? null}
            miss={null}
            startFailed={false}
            onPick={(u) => {
              setUser(u);
              setPicking(false);
            }}
            more={{ hasMore: false, loadingMore: false, loadMoreFailed: false, loadMore: fn() }}
            onClose={() => setPicking(false)}
          />
        }
      />
    </div>
  );
}

/**
 * The Preview as user bar (AppShell.dc.html "View as user (admin)"), pinned
 * above the header while an admin previews. Phones get the short labels.
 */
const meta: Meta<typeof PreviewBar> = {
  title: 'Organisms/Preview bar',
  component: PreviewBar,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof PreviewBar>;

/** Opened from the header icon: nobody picked yet, the picker open. */
export const ChooseAUser: Story = { render: () => <Wired user={null} open /> };

/** Previewing: the email, "Name · Role", the read-only chip and Exit. */
export const Previewing: Story = { render: () => <Wired user={amara} /> };

/** Phones: "Read only" and "Exit". */
export const PreviewingPhone: Story = {
  render: () => <Wired user={tunde} />,
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};

/** Production names itself on the chip. */
export const Production: Story = {
  args: {
    user: amara,
    env: 'production',
    pickerOpen: false,
    pickerId: 'preview-picker',
    onTogglePicker: fn(),
    onExit: fn(),
  },
};
