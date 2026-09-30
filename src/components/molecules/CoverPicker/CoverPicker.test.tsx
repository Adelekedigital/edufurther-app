import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoverKey } from '@/lib/utils/cover';
import { CoverPicker, type CoverSaveState } from './CoverPicker';

type Extra = Partial<{
  hasImage: boolean;
  uploading: boolean;
  imageError: string | null;
  removing: boolean;
  removedStamp: number;
  saveState: CoverSaveState;
  savedStamp: number;
}>;

function setup(extra: Extra = {}) {
  const onPickColor = vi.fn();
  const onToggleArt = vi.fn();
  const onFile = vi.fn();
  const onRemoveImage = vi.fn();
  function Host() {
    const [color, setColor] = useState<CoverKey>('sky');
    const [artOn, setArtOn] = useState(false);
    return (
      <CoverPicker
        color={color}
        artOn={artOn}
        onPickColor={(k) => {
          onPickColor(k);
          setColor(k);
        }}
        onToggleArt={(on) => {
          onToggleArt(on);
          setArtOn(on);
        }}
        saveState={extra.saveState ?? 'idle'}
        savedStamp={extra.savedStamp ?? 0}
        hasImage={extra.hasImage ?? false}
        onFile={onFile}
        uploading={extra.uploading ?? false}
        onRemoveImage={onRemoveImage}
        removing={extra.removing ?? false}
        removedStamp={extra.removedStamp ?? 0}
        imageError={extra.imageError ?? null}
        accept="image/jpeg,image/png,image/webp"
      />
    );
  }
  const user = userEvent.setup();
  const view = render(<Host />);
  return { user, onPickColor, onToggleArt, onFile, onRemoveImage, ...view };
}

const trigger = () => screen.getByRole('button', { name: 'Change cover' });

describe('CoverPicker', () => {
  it('opens a Cover dialog with the picked colour focused', async () => {
    const { user } = setup();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Cover' })).toBeInTheDocument();
    const sky = screen.getByRole('radio', { name: 'Sky' });
    expect(sky).toHaveFocus();
    expect(sky).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radiogroup', { name: 'Cover color' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(12);
  });

  it('saves a colour as it’s picked, by click or arrow keys', async () => {
    const { user, onPickColor } = setup();
    await user.click(trigger());
    await user.click(screen.getByRole('radio', { name: 'Mint' }));
    expect(onPickColor).toHaveBeenLastCalledWith('mint');
    await user.keyboard('{ArrowRight}');
    expect(onPickColor).toHaveBeenLastCalledWith('sage');
    expect(screen.getByRole('radio', { name: 'Sage' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(onPickColor).toHaveBeenLastCalledWith('sky');
    await user.keyboard('{ArrowLeft}');
    expect(onPickColor).toHaveBeenLastCalledWith('mist');
  });

  it('doesn’t re-save the colour already picked', async () => {
    const { user, onPickColor } = setup();
    await user.click(trigger());
    await user.click(screen.getByRole('radio', { name: 'Sky' }));
    expect(onPickColor).not.toHaveBeenCalled();
  });

  it('turns the topic icons on and off', async () => {
    const { user, onToggleArt } = setup();
    await user.click(trigger());
    const sw = screen.getByRole('switch', { name: 'Show my topics on the cover' });
    expect(sw).toHaveAccessibleDescription('Faint icons from your first 3 topics.');
    await user.click(sw);
    expect(onToggleArt).toHaveBeenLastCalledWith(true);
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('Escape closes and returns focus to the button', async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('says Saved for a moment after a save, and says so when one fails', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <CoverPicker
          color="sky"
          artOn={false}
          onPickColor={() => {}}
          onToggleArt={() => {}}
          saveState="saved"
          savedStamp={1}
          hasImage={false}
          onFile={() => {}}
          uploading={false}
          onRemoveImage={() => {}}
          removing={false}
          imageError={null}
          accept=""
        />,
      );
      act(() => trigger().click());
      expect(screen.getByRole('status')).toHaveTextContent('Saved');
      act(() => vi.advanceTimersByTime(1900));
      expect(screen.getByRole('status')).toHaveTextContent('');
      rerender(
        <CoverPicker
          color="sky"
          artOn={false}
          onPickColor={() => {}}
          onToggleArt={() => {}}
          saveState="error"
          savedStamp={0}
          hasImage={false}
          onFile={() => {}}
          uploading={false}
          onRemoveImage={() => {}}
          removing={false}
          imageError={null}
          accept=""
        />,
      );
      expect(screen.getByRole('status')).toHaveTextContent('Not saved. Try again.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('hands over a chosen image', async () => {
    const { user, onFile, container } = setup();
    await user.click(trigger());
    expect(screen.getByRole('button', { name: 'Upload an image instead' })).toBeInTheDocument();
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    const f = new File(['x'], 'c.png', { type: 'image/png' });
    await user.upload(input, f);
    expect(onFile).toHaveBeenCalledWith(f);
  });

  it('with an image: no colour reads as picked, and the button removes it (CoverPicker.dc.html)', async () => {
    const { user, onRemoveImage, onFile, container } = setup({ hasImage: true });
    await user.click(trigger());
    const radios = screen.getAllByRole('radio');
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(0);
    // The group keeps one tab stop, the first swatch, and it has focus.
    expect(radios[0]).toHaveFocus();
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
    // The topics switch stays: it saves the art for when the image goes.
    expect(screen.getByRole('switch')).toBeInTheDocument();
    const remove = screen.getByRole('button', { name: 'Remove image' });
    expect(remove.querySelector('[aria-hidden="true"]')).toHaveTextContent('hide_image');
    const pick = vi.spyOn(HTMLInputElement.prototype, 'click');
    try {
      await user.click(remove);
      expect(onRemoveImage).toHaveBeenCalledTimes(1);
      expect(pick).not.toHaveBeenCalled();
      expect(onFile).not.toHaveBeenCalled();
      expect(container.querySelector('input[type=file]')).toBeInTheDocument();
    } finally {
      pick.mockRestore();
    }
  });

  it('while removing: "Removing…", no second removal, and its error shows', async () => {
    const { user, onRemoveImage } = setup({
      hasImage: true,
      removing: true,
      imageError: 'The image wasn’t removed. Try again.',
    });
    await user.click(trigger());
    const btn = screen.getByRole('button', { name: 'Removing…' });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    await user.click(btn);
    expect(onRemoveImage).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('The image wasn’t removed. Try again.');
  });

  it('uploading and failed uploads', async () => {
    const { user } = setup({ uploading: true, imageError: 'Choose an image under 5 MB.' });
    await user.click(trigger());
    expect(screen.getByRole('button', { name: 'Uploading…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an image under 5 MB.');
  });

  it('while uploading, the button keeps focus and Escape still closes (review of #65)', async () => {
    const { user } = setup({ uploading: true });
    await user.click(trigger());
    const up = screen.getByRole('button', { name: 'Uploading…' });
    await user.click(up);
    expect(up).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('a click on the dialog’s text keeps focus inside, so Escape works', async () => {
    const { user } = setup();
    await user.click(trigger());
    await user.click(screen.getByText('Cover color'));
    expect(screen.getByRole('dialog')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when you tab out of it or click outside, and says it closed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <CoverPicker
          color="sky"
          artOn={false}
          onPickColor={() => {}}
          onToggleArt={() => {}}
          saveState="idle"
          savedStamp={0}
          hasImage={false}
          onFile={() => {}}
          uploading={false}
          onRemoveImage={() => {}}
          removing={false}
          imageError={null}
          accept=""
          onClose={onClose}
        />
        <button>After</button>
      </>,
    );
    await user.click(trigger());
    screen.getByRole('button', { name: 'Upload an image instead' }).focus();
    await user.tab();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(trigger());
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(backdrop);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('the button says it opens a dialog', () => {
    setup();
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('while uploading, neither a click nor Enter opens the file chooser again', async () => {
    const open = vi.spyOn(HTMLInputElement.prototype, 'click');
    try {
      const { user } = setup({ uploading: true });
      await user.click(trigger());
      const up = screen.getByRole('button', { name: 'Uploading…' });
      await user.click(up);
      await user.keyboard('{Enter}');
      expect(open).not.toHaveBeenCalled();
    } finally {
      open.mockRestore();
    }
  });

  it('says "Image removed" when a removal is done', async () => {
    const { user } = setup({ removedStamp: 1 });
    await user.click(trigger());
    expect(screen.getByRole('status')).toHaveTextContent('Image removed');
  });
});

describe('CoverPicker popover placement (design reply 56; Codex on PR 102)', () => {
  it('sits 8px below the trigger at whatever height it has, never a fixed offset', async () => {
    // CI's layout check runs a mentee build, which has no owner cover control,
    // so the rule itself is pinned: a fixed top overlapped the 44px phone button.
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/components/molecules/CoverPicker/CoverPicker.module.css', 'utf8');
    const dialog = css.match(/\.dialog\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(dialog).toMatch(/top:\s*calc\(100%\s*\+\s*var\(--space-2\)\)/);
    expect(css).toMatch(/\.root\s*\{[^}]*position:\s*relative/);
  });
});
