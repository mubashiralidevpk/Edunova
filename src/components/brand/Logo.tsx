import logo from '@/assets/edunova-logo.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  tagline?: string;
  priority?: boolean;
}

/** Edunova brand mark. Use everywhere the product identifies itself. */
export function Logo({ size = 40, className, withWordmark = false, tagline, priority = false }: LogoProps) {
  const mark = (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-primary/10 border border-primary/25 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]',
        !withWordmark && className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logo}
        alt="Edunova logo"
        width={size}
        height={size}
        loading={priority ? 'eager' : 'lazy'}
        className="object-contain"
        style={{ width: size * 0.72, height: size * 0.72 }}
      />
    </span>
  );

  if (!withWordmark) return mark;

  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      {mark}
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-foreground">
          Edu<span className="text-primary">nova</span>
        </span>
        {tagline && <span className="kicker mt-1">{tagline}</span>}
      </span>
    </span>
  );
}

export default Logo;
