import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Focus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FocusMode — minimalist study overlay that hides distractions.
 * Toggle from any student page. Persists for session.
 */
export function FocusModeToggle() {
  const [active, setActive] = useState(() => sessionStorage.getItem('focus_mode') === '1');

  useEffect(() => {
    sessionStorage.setItem('focus_mode', active ? '1' : '0');
    document.documentElement.classList.toggle('focus-mode', active);
    return () => document.documentElement.classList.remove('focus-mode');
  }, [active]);

  return (
    <>
      <Button
        size="sm"
        variant={active ? 'default' : 'outline'}
        onClick={() => setActive(a => !a)}
        className="gap-1 transition-all hover:scale-105"
      >
        <Focus className="h-3 w-3" />
        {active ? 'Exit Focus' : 'Focus Mode'}
      </Button>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium backdrop-blur shadow-lg flex items-center gap-2"
          >
            <Focus className="h-3 w-3" /> Focus Mode active
            <button onClick={() => setActive(false)} className="hover:opacity-70"><X className="h-3 w-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default FocusModeToggle;
