'use client';

import { useContext } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { ButtonAnchor } from '@/components/atoms/Button/Button';
import { ErrorPage } from '@/components/organisms/ErrorPage/ErrorPage';
import { ERROR_PAGE } from '@/lib/copy/errorPage';
import { ErrorScreen } from './ErrorScreen';

/**
 * The 404. Next can render it without the root layout (an unknown server
 * action builds a not-found tree of its own, from paths the proxy doesn't
 * match too), so no providers and no viewer. Then it is the standalone page,
 * as global-error is: one way home, a full page load.
 */
export function NotFoundScreen() {
  if (useContext(QueryClientContext)) return <ErrorScreen type="notFound" landmark />;
  return (
    <ErrorPage
      type="notFound"
      landmark
      actions={
        <ButtonAnchor href="/" size="large">
          {ERROR_PAGE.actions.site}
        </ButtonAnchor>
      }
    />
  );
}
