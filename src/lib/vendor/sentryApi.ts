/**
 * The few Sentry functions the error seam uses, re-exported so its dynamic
 * import pulls only these (and what they need), not the whole namespace with
 * replay, feedback and tracing (performance: tree-shakeable).
 */
export { captureException, captureRequestError, init, setUser } from '@sentry/nextjs';
