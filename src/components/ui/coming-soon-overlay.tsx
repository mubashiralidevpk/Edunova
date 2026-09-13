import { Sparkles, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ComingSoonOverlayProps {
  title?: string;
  description?: string;
  /** Optional back link href (defaults to dashboard / home). */
  backHref?: string;
  backLabel?: string;
}

/**
 * Wraps an entire page route with a blurred lock screen.
 * Use as the single returned element of a page to mark a feature as Coming Soon.
 *
 * Place blurred placeholder content as `children`.
 */
export function ComingSoonOverlay({
  title = 'Coming Soon',
  description = 'The Results module is being upgraded. It will be back online shortly with a brand new experience.',
  backHref,
  backLabel = 'Go back',
  children,
}: React.PropsWithChildren<ComingSoonOverlayProps>) {
  return (
    <div className="relative min-h-[60vh] w-full">
      {/* Blurred mock content */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-md opacity-40 grayscale"
      >
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="glass-card neon-border rounded-2xl max-w-md w-full p-8 text-center space-y-4 backdrop-blur-xl">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center animate-glow-pulse">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary">
            <Sparkles className="h-3 w-3" /> COMING SOON
          </div>
          <h2 className="text-2xl font-bold text-foreground neon-text">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          {backHref && (
            <Link to={backHref}>
              <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                {backLabel}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
