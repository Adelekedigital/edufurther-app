import { act, renderHook } from '@testing-library/react';
import { previewStore, resetPreviewStoreForTests } from '@/lib/api/data/previewStore';
import { useDeviceFlag } from './deviceFlag';

const amara = {
  id: 'u-1',
  email: 'amara@example.test',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee' as const,
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetPreviewStoreForTests();
});

it('in Preview as user a flag lasts for the visit and is never saved to the device', () => {
  previewStore.started('s-1', amara, { revealed: false, canReveal: false }, '/admin/mentors');
  const { result } = renderHook(() => useDeviceFlag('home-getting-started-done', 'u-1'));
  act(() => result.current[1](true));
  expect(result.current[0]).toBe(true);
  expect(localStorage.getItem('ef-home-getting-started-done-u-1')).toBeNull();
});

it('outside a preview it is saved as before', () => {
  const { result } = renderHook(() => useDeviceFlag('invite-shared', 'u-2'));
  act(() => result.current[1](true));
  expect(localStorage.getItem('ef-invite-shared-u-2')).toBe('1');
});
