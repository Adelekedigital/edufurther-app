import {
  mockPhoto,
  mockPhotoRemoved,
  mockPhotoUrl,
  removeMockPhoto,
  setMockPhoto,
} from './photoStore';

const bytes = new ArrayBuffer(4);

describe('mock photo store (Remove photo, Codex on PR 125)', () => {
  it('removing leaves no photo and marks it removed (the profile then shows none, not the sample)', () => {
    setMockPhoto('u-rm', bytes, 'image/png');
    expect(mockPhotoUrl('u-rm')).toMatch(/\?v=1$/);
    removeMockPhoto('u-rm');
    expect(mockPhoto('u-rm')).toBeUndefined();
    expect(mockPhotoUrl('u-rm')).toBeNull();
    expect(mockPhotoRemoved('u-rm')).toBe(true);
    // Removing again is the same (the API is idempotent).
    removeMockPhoto('u-rm');
    expect(mockPhotoRemoved('u-rm')).toBe(true);
  });

  it('a new upload after a removal clears the mark and never reuses an old URL', () => {
    setMockPhoto('u-up', bytes, 'image/png');
    const first = mockPhotoUrl('u-up');
    removeMockPhoto('u-up');
    setMockPhoto('u-up', bytes, 'image/webp');
    expect(mockPhotoRemoved('u-up')).toBe(false);
    expect(mockPhotoUrl('u-up')).not.toBe(first);
    expect(mockPhotoUrl('u-up')).toMatch(/\?v=2$/);
  });
});
