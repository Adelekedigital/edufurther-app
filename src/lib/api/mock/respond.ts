import { NextResponse } from 'next/server';
import type { paths } from '@/lib/api/generated/schema';

// Why: a mock that drifts from the backend contract should fail `tsc`, not a screen.

type Method = 'get' | 'put' | 'post' | 'delete' | 'patch';

/** The methods `P` actually defines in the contract. */
export type MethodOf<P extends keyof paths> = {
  [M in Method]: paths[P][M] extends { responses: unknown } ? M : never;
}[Method];

type Responses<P extends keyof paths, M extends MethodOf<P>> = paths[P][M] extends {
  responses: infer R;
}
  ? R
  : never;

type Json<R> = R extends { content: { 'application/json': infer B } } ? B : never;

/** The JSON body of the operation's success response: 200, else 201, else 202. */
export type SuccessBody<P extends keyof paths, M extends MethodOf<P>> =
  Responses<P, M> extends { 200: infer R }
    ? Json<R>
    : Responses<P, M> extends { 201: infer R }
      ? Json<R>
      : Responses<P, M> extends { 202: infer R }
        ? Json<R>
        : never;

/**
 * `ok('/api/v1/mentors/{handle}/reviews', 'get', body)` — `body` must be the
 * contract's JSON for that operation's success response. Path and method only
 * pick the type; pass `{ status: 201 }` (or 202) in `init` where the contract says so.
 */
export function ok<P extends keyof paths, M extends MethodOf<P>>(
  _path: P,
  _method: M,
  body: SuccessBody<P, M>,
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json(body, init);
}
