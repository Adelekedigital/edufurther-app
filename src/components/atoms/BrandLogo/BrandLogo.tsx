import Image from 'next/image';

const SRC = {
  /** The wordmark, pre-sized to 630px wide: 3x the widest place it is drawn (210). */
  full: '/brand/edufurther-logo-630.png',
  /** The swoosh mark, 128×55: already small. */
  mark: '/brand/edufurther-mark-swoosh.png',
} as const;

type BrandLogoProps = {
  variant?: keyof typeof SRC;
  width: number;
  height: number;
  /** "EduFurther" when the logo stands alone; empty inside a link that names itself. */
  alt?: string;
  priority?: boolean;
  className?: string;
};

/**
 * The EduFurther logo, one place for every frame. Served as-is, never through
 * the image optimizer: each width the optimizer makes is a billed Vercel
 * transformation, and a pre-sized PNG needs none (owner's Vercel cost rules,
 * 2026-11-07).
 */
export function BrandLogo({ variant = 'full', alt = '', ...rest }: BrandLogoProps) {
  return <Image src={SRC[variant]} alt={alt} unoptimized {...rest} />;
}
