import { NextResponse } from 'next/server';
import type { PendingResponses } from '@/lib/api/data/pending';
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

/** The error statuses the mocks answer with. */
export type ErrorStatus = 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503;

/** An RFC 9457 problem body; `status` is always the response's own. */
export type ProblemBody = {
  type?: string;
  title?: string;
  detail?: string;
  errors?: unknown[];
  [k: string]: unknown;
};

/** An RFC 9457 error, as the backend answers: application/problem+json, status in the body and on the line. */
export function problem(
  status: ErrorStatus,
  body: ProblemBody = {},
  init?: { headers?: HeadersInit },
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/problem+json');
  return NextResponse.json(
    { type: 'about:blank', title: 'Error', ...body, status },
    { status, headers },
  );
}

/** A mock helper's answer before it becomes a response: the contract's success, or a problem. */
export type MockResult<B, S extends number = 201> =
  { ok: true; status: S; body: B } | { ok: false; status: ErrorStatus; problem: ProblemBody };

/**
 * A success body for a status other than the one `ok` picks (the completion
 * route: 201 with the record, a bare 200 after), still typed by the contract.
 */
export function okStatus<P extends keyof paths, M extends MethodOf<P>, S extends 200 | 201 | 202>(
  _path: P,
  _method: M,
  status: S,
  body: Responses<P, M> extends { [K in S]: infer R } ? Json<R> : never,
): NextResponse {
  return NextResponse.json(body, { status });
}

/** True once the published spec defines this "METHOD path" operation. */
type Shipped<K> = K extends `${infer M} ${infer Path}`
  ? Path extends keyof paths
    ? Lowercase<M> extends keyof paths[Path]
      ? paths[Path][Lowercase<M>] extends { responses: unknown }
        ? true
        : false
      : false
    : false
  : false;

/**
 * PENDING BACKEND: a success body for an operation the published spec doesn't
 * have yet ("PUT /api/v1/me/onboarding"), typed by the frontend's request shape
 * (lib/api/data/pending.ts). Once the regenerated spec has it, this stops
 * compiling: answer with `ok`.
 */
export function pendingOk<K extends keyof PendingResponses>(
  _op: Shipped<K> extends true ? never : K,
  body: PendingResponses[K],
  init?: { status: 200 | 201 },
): NextResponse {
  return NextResponse.json(body, init);
}
