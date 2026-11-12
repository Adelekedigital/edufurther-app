import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIRST_PAINT_ZONE, useDeviceTimeZone } from './useDeviceTimeZone';

function Probe() {
  return <span>{useDeviceTimeZone() ?? FIRST_PAINT_ZONE}</span>;
}

describe('useDeviceTimeZone', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the server zone on the server, whatever the device says', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Africa/Lagos',
    } as Intl.ResolvedDateTimeFormatOptions);
    // The first client paint uses the same snapshot, so hydration matches.
    expect(renderToString(<Probe />)).toContain(FIRST_PAINT_ZONE);
  });

  it('gives the device zone once the client is running', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Africa/Lagos',
    } as Intl.ResolvedDateTimeFormatOptions);
    render(<Probe />);
    expect(screen.getByText('Africa/Lagos')).toBeInTheDocument();
  });
});
