import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Hand, Cpu, GitMerge } from 'lucide-react';
import { useCheckingMode, type CheckingMode } from '@/hooks/useExamChecking';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

const MODES: { value: CheckingMode; label: string; icon: typeof Hand; blurb: string }[] = [
  { value: 'manual', label: 'Manual checking', icon: Hand, blurb: 'Teachers award every mark themselves in the online checking workspace.' },
  { value: 'automatic', label: 'Automatic checking', icon: Cpu, blurb: 'Answer sheets are read and marked automatically; low-confidence answers are flagged.' },
  { value: 'hybrid', label: 'Hybrid checking', icon: GitMerge, blurb: 'Marks are suggested automatically, then accepted, changed or rejected by the teacher.' },
];

export function CheckingModeCard() {
  const { mode, save, loading, saving } = useCheckingMode();
  const { toast } = useToast();

  const choose = async (next: CheckingMode) => {
    const error = await save(next);
    if (error) toast({ title: 'Could not save checking mode', description: getErrorMessage(error), variant: 'destructive' });
    else toast({ title: `Checking mode set to ${next}` });
  };

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Examination checking system
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Choose how papers are marked in this school. All three are workflows of the same examination system —
          the teacher always confirms the official marks.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {MODES.map((m) => {
          const active = mode === m.value;
          const Icon = m.icon;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => choose(m.value)}
              disabled={saving}
              className={`text-left rounded-2xl border p-4 transition-all ${
                active
                  ? 'border-primary bg-primary/10 shadow-[0_0_24px_-8px_hsl(var(--primary))]'
                  : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4 text-primary" /> {m.label}
                </span>
                {active && <Badge className="shrink-0">Active</Badge>}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.blurb}</p>
            </button>
          );
        })}
        <div className="md:col-span-3 flex justify-end">
          <Button variant="ghost" size="sm" disabled className="whitespace-nowrap">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Current mode: ${mode}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
