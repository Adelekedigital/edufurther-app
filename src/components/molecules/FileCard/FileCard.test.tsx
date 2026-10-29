import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileCard } from './FileCard';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('FileCard', () => {
  it('shows the name and size and opens the file', async () => {
    const onOpen = vi.fn();
    render(
      <FileCard
        name="CV.pdf"
        sizeBytes={312 * 1024}
        contentType="application/pdf"
        label="View CV.pdf"
        tone="theirs"
        onOpen={onOpen}
      />,
    );
    const card = screen.getByRole('button', { name: 'View CV.pdf' });
    expect(card).toHaveTextContent('CV.pdf');
    expect(card).toHaveTextContent('312 KB');
    expect(card).toHaveTextContent('picture_as_pdf');
    await userEvent.click(card);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('a Word file gets the plain document glyph', () => {
    render(
      <FileCard
        name="Plan.docx"
        sizeBytes={2048}
        contentType={DOCX}
        label="View Plan.docx"
        tone="mine"
        onOpen={() => {}}
      />,
    );
    expect(screen.getByRole('button')).toHaveTextContent('description');
  });

  it('renders a name that looks like markup as text', () => {
    const name = '<img src=x onerror=alert(1)>.pdf';
    const { container } = render(
      <FileCard
        name={name}
        sizeBytes={10}
        contentType="application/pdf"
        label={`View ${name}`}
        tone="theirs"
        onOpen={() => {}}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('button')).toHaveTextContent(name);
  });
});
