import { Hanken_Grotesk, Inter, Nunito_Sans, Poppins } from 'next/font/google';

// Each family becomes a --ff-* variable; styles/tokens/fonts.css maps the DS
// role names (--font-brand, --font-ui, …) onto them.
export const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--ff-hanken',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--ff-inter',
  display: 'swap',
});

export const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
  variable: '--ff-poppins',
  display: 'swap',
  preload: false,
});

// Stands in for Avenir (DS substitution). Only form fields use it.
export const nunito = Nunito_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--ff-nunito',
  display: 'swap',
  preload: false,
});

export const fontVariables = [
  hanken.variable,
  inter.variable,
  poppins.variable,
  nunito.variable,
].join(' ');
