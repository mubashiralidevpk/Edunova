import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Inbox } from 'lucide-react';

export interface RecordRow {
  id: string;
  primary: string;
  secondary?: string;
  badge?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  to?: string;
}

export interface RecordGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  to?: string;
  count?: number | string;
  rows: RecordRow[];
  emptyText?: string;
}

const toneClass: Record<string, string> = {
  default: 'bg-primary/10 text-primary border-primary/30',
  warning: 'bg-[hsl(45,100%,55%)]/10 text-[hsl(45,100%,60%)] border-[hsl(45,100%,55%)]/30',
  danger: 'bg-destructive/10 text-destructive-foreground border-destructive/30',
  success: 'bg-accent/10 text-accent border-accent/30',
};

function RecordCard({ group }: { group: RecordGroup }) {
  const Icon = group.icon;
  return (
    <Card className="glass-card flex flex-col border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--bento-accent,var(--primary))/0.14)]">
              <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--bento-accent,var(--primary)))]" />
            </span>
            <span className="leading-tight">{group.title}</span>
          </CardTitle>
          {group.count !== undefined && group.count !== null && (
            <Badge variant="outline" className="font-mono text-[11px] shrink-0">{group.count}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-3">
        {group.rows.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" />
            {group.emptyText || 'Nothing here yet'}
          </div>
        ) : (
          group.rows.slice(0, 4).map((row) => {
            const body = (
              <div className="flex items-start justify-between gap-2 rounded-xl bg-muted/25 px-3 py-2 transition-colors hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{row.primary}</p>
                  {row.secondary && (
                    <p className="truncate text-[11px] text-muted-foreground">{row.secondary}</p>
                  )}
                </div>
                {row.badge && (
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClass[row.tone || 'default']}`}
                  >
                    {row.badge}
                  </span>
                )}
              </div>
            );
            return row.to ? (
              <Link key={row.id} to={row.to} className="block">{body}</Link>
            ) : (
              <div key={row.id}>{body}</div>
            );
          })
        )}
      </CardContent>
      {group.to && (
        <div className="px-4 pb-3">
          <Link to={group.to}>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-primary">
              Open <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

export function QuickRecords({ groups, loading }: { groups: RecordGroup[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="bento-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="glass-card h-44 animate-pulse border-border" />
        ))}
      </div>
    );
  }
  return (
    <div className="bento-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => <RecordCard key={g.key} group={g} />)}
    </div>
  );
}
