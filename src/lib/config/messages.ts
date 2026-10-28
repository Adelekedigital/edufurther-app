/**
 * Messages (`/messages`, the nav item and badge, SendMessage and every Message
 * button) ships behind one flag until the backend is live (PRD Messages). Off,
 * `/messages` is not found and nothing links to it.
 */
export const MESSAGES_LIVE = process.env.NEXT_PUBLIC_MESSAGES_ENABLED === 'true';
