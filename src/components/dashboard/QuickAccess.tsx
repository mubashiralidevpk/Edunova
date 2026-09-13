import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export interface QuickAccessItem {
  label: string;
  to: string;
  icon: LucideIcon;
  hint?: string;
}

export function QuickAccess({ items, title = 'Quick access', description }: {
  items: QuickAccessItem[];
  title?: string;
  description?: string;
}) {
  return (
    <Card className="glass-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12">
            <Zap className="h-4 w-4 text-primary" />
          </span>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {items.map((item, i) => {
          const Icon = item.icon;
          const accents = ['var(--bento-1)', 'var(--bento-2)', 'var(--bento-3)', 'var(--bento-4)'];
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
              style={{ ['--bento-accent' as string]: accents[i % 4] }}
            >
              <Link
                to={item.to}
                className="group relative flex h-full flex-col items-start gap-2 overflow-hidden rounded-2xl border border-[hsl(0_0%_100%/0.07)] bg-[hsl(0_0%_100%/0.03)] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(0_0%_100%/0.13)] hover:shadow-[0_18px_38px_-28px_hsl(var(--bento-accent,var(--primary))/0.35)]"
              >
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_80%_at_-8%_112%,hsl(var(--bento-accent,var(--primary))/0.22),hsl(var(--bento-accent,var(--primary))/0.07)_42%,transparent_74%)] opacity-70 transition-all duration-500 group-hover:translate-x-2 group-hover:-translate-y-1 group-hover:opacity-100" />
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_35%_25%,hsl(var(--bento-accent,var(--primary))/0.2),hsl(var(--bento-accent,var(--primary))/0.07)_70%,transparent)] text-[hsl(var(--bento-accent,var(--primary)))] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08)] transition-transform group-hover:scale-105">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="relative text-sm font-medium leading-tight">{item.label}</span>
                {item.hint && <span className="relative text-[11px] text-muted-foreground leading-tight">{item.hint}</span>}
              </Link>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
