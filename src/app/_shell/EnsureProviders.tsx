'use client';

import { useContext, type ReactNode } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { Providers } from '../providers';

/**
 * The app's providers, only where the root layout didn't mount them. Next can
 * render not-found without the root layout (an unknown server action builds a
 * not-found tree of its own), and the screen's viewer query needs a client.
 * Inside the app this adds nothing, so there is never a second client.
 */
export function EnsureProviders({ children }: { children: ReactNode }) {
  const client = useContext(QueryClientContext);
  if (client) return children;
  return <Providers session={null}>{children}</Providers>;
}
