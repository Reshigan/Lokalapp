import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  invert?: boolean;
}

/**
 * Lokal mark — clean SVG version of the icon. Renders inline so it never
 * blurs and follows currentColor where appropriate.
 */
export function Logo({ size = 32, showWordmark = false, className, invert = false }: LogoProps) {
  const navy = invert ? '#FFFFFF' : '#1E2D6E';
  const azure = invert ? '#A4CDF6' : '#2D7BCB';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Lokal"
        role="img"
      >
        {/* Left navy "L" */}
        <path
          d="M22 18 H38 a4 4 0 0 1 4 4 V70 a4 4 0 0 1 -4 4 H22 a4 4 0 0 1 -4 -4 V22 a4 4 0 0 1 4 -4 z"
          fill={navy}
        />
        <path d="M18 70 L42 70 L60 86 L36 86 Z" fill={navy} />
        {/* Right azure "k" wing */}
        <path
          d="M52 22 a4 4 0 0 1 4 -4 H78 a4 4 0 0 1 4 4 V62 L60 86 V22 z"
          fill={azure}
        />
      </svg>
      {showWordmark && (
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: invert ? '#FFFFFF' : navy }}
        >
          Lokal
        </span>
      )}
    </span>
  );
}
