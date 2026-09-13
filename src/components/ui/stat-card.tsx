import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; isPositive: boolean; };
  className?: string;
  iconClassName?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className, iconClassName }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={cn("glass-card h-full rounded-xl border border-border overflow-hidden", className)}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="bento-label text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="bento-value text-2xl font-bold font-mono text-primary">{value}</p>
              {description && <p className="text-xs text-muted-foreground leading-snug">{description}</p>}
              {trend && (
                <p className={cn("text-xs font-mono", trend.isPositive ? "text-accent" : "text-destructive-foreground")}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </p>
              )}
            </div>
            <div
              className={cn(
                "shrink-0 rounded-2xl p-2.5",
                "bg-[radial-gradient(circle_at_35%_25%,hsl(var(--bento-accent,var(--primary))/0.2),hsl(var(--bento-accent,var(--primary))/0.07)_68%,transparent)] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08)]",
                iconClassName,
              )}
            >
              <Icon className="h-5 w-5 text-[hsl(var(--bento-accent,var(--primary)))]" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
