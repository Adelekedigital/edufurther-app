/**
 * Android's install prompt, kept from the first byte. Chrome fires
 * `beforeinstallprompt` once per page load, often before the app's bundles
 * run: missed, the install nudge had nothing to offer for the whole visit. The
 * root layout puts EARLY_CAPTURE in <head>; installPrompt.ts adopts what it
 * kept. Not a client module, so the server layout reads the string itself.
 */

/** Where the script keeps the prompt on `window`. */
export const EARLY_PROMPT = '__efInstallPrompt';

/** The <head> script. A fixed string with no input, so inlining it is safe. */
export const EARLY_CAPTURE = `addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.${EARLY_PROMPT}=e});addEventListener('appinstalled',function(){window.${EARLY_PROMPT}=null})`;
