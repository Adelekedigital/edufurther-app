/**
 * A full page load that replaces this history entry: everything held in memory
 * for the previous viewer is dropped, and Back doesn't return to it. For
 * leaving a signed-in state (Logout); in-app moves use the router.
 */
export function hardNavigate(path: string) {
  window.location.replace(path);
}
