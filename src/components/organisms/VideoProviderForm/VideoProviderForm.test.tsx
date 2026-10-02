import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoProviderForm } from './VideoProviderForm';

describe('VideoProviderForm', () => {
  it('offers EduFurther video (recommended) and Google Meet, never Zoom', () => {
    render(
      <VideoProviderForm
        initial="daily"
        customUrl={null}
        saving={false}
        error={null}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /EduFurther video/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.queryByText(/Zoom/)).toBeNull();
  });

  it('arrow keys move and pick; Save sends the choice', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <VideoProviderForm
        initial="daily"
        customUrl={null}
        saving={false}
        error={null}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    await user.tab();
    expect(screen.getByRole('radio', { name: /EduFurther video/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /Google Meet/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('google_meet');
  });

  it('a personal link shows only when it’s the current choice', () => {
    render(
      <VideoProviderForm
        initial="custom"
        customUrl="https://meet.example.com/room"
        saving={false}
        error={null}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole('radio', { name: /Personal meeting link/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByText('https://meet.example.com/room')).toBeInTheDocument();
  });
});
