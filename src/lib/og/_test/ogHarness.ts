import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Shared test pieces for the link preview image routes: next/og's
 * ImageResponse records what it was asked to draw, and ogAssets answers
 * without reading fonts. Each test file mocks the modules itself, from here:
 *
 *   vi.mock('next/og', async () => (await import('@/lib/og/_test/ogHarness')).nextOg);
 *   vi.mock('@/lib/og/ogAssets', async (orig) => ({
 *     ...(await orig<typeof import('@/lib/og/ogAssets')>()),
 *     ...(await import('@/lib/og/_test/ogHarness')).assetStubs,
 *   }));
 */
export const drawn: ReactElement[] = [];

export const nextOg = {
  ImageResponse: class {
    constructor(el: ReactElement) {
      drawn.push(el);
    }
  },
};

export const assetStubs = {
  ogAssets: async () => ({
    fontFamily: 'DM Sans',
    fonts: [],
    logo: 'data:logo',
    mark: 'data:mark',
  }),
};

/** The last drawn image as HTML, to read its text and styles. */
export const lastDrawn = () => renderToStaticMarkup(drawn.at(-1)!);
