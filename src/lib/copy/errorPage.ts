/**
 * Error Page.dc.html copy (Routing and errors handoff): one page for every
 * screen. Built: notFound (404) and serverError (500). noAccess, expired,
 * offline and maintenance join here when a screen needs them.
 *
 * One change from the design, logged in PR (small-design-fixes rule): the 500
 * body drops "Your work is saved up to your last change", which the app can't
 * promise (a crash loses a form's unsent input).
 */
export const ERROR_PAGE = {
  notFound: {
    code: 'Error 404',
    title: 'We can’t find that page',
    body: 'The link may be old or mistyped, or the page has moved.',
    /** Then the support address. */
    help: 'Followed a link from us?',
  },
  serverError: {
    code: 'Error 500',
    title: 'Something went wrong on our side',
    body: 'It’s not you. Try again in a moment.',
    /** Around the support address: "If it keeps happening, email {address} and quote EF-7Q2K9X." */
    help: 'If it keeps happening, email',
  },
  actions: {
    home: 'Go to Home',
    site: 'Go to EduFurther',
    findMentor: 'Find a mentor',
    back: 'Go back',
    retry: 'Try again',
  },
  /** After the address on the 500: the reference support can look up, when there is one. */
  after: (ref: string | null) => (ref ? ` and quote ${ref}.` : '.'),
} as const;

export type ErrorPageType = 'notFound' | 'serverError';
