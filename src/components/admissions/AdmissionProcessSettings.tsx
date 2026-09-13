import { useEffect, useState } from 'react';
import { Loader2, Save, Workflow } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

interface ProcessState {
  require_test: boolean;
  require_interview: boolean;
  test_total_marks: number;
  passing_marks: number;
  auto_pass: boolean;
  instructions: string;
}

const defaults: ProcessState = {
  require_test: true,
  require_interview: false,
  test_total_marks: 100,
  passing_marks: 40,
  auto_pass: false,
  instructions: '',
};

export function AdmissionProcessSettings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<ProcessState>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select(
          'admission_require_test, admission_require_interview, admission_test_total_marks, admission_passing_marks, admission_auto_pass, admission_instructions'
        )
        .eq('school_id', schoolId)
        .maybeSingle();
      if (error) {
        toast({ title: 'Could not load admission process', description: getErrorMessage(error), variant: 'destructive' });
      } else if (data) {
        const row = data as Record<string, unknown>;
        setState({
          require_test: (row.admission_require_test as boolean) ?? true,
          require_interview: (row.admission_require_interview as boolean) ?? false,
          test_total_marks: (row.admission_test_total_marks as number) ?? 100,
          passing_marks: (row.admission_passing_marks as number) ?? 40,
          auto_pass: (row.admission_auto_pass as boolean) ?? false,
          instructions: (row.admission_instructions as string) ?? '',
        });
      }
      setLoading(false);
    })();
  }, [schoolId, toast]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('set_admission_process', {
      _require_test: state.require_test,
      _require_interview: state.require_interview,
      _test_total_marks: Number(state.test_total_marks) || 100,
      _passing_marks: Number(state.passing_marks) || 0,
      _auto_pass: state.auto_pass,
      _instructions: state.instructions,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Admission process updated', description: 'Applicants will see these steps on the apply page.' });
  };

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" /> Admission process
        </CardTitle>
        <CardDescription>
          Decide the steps every applicant must go through — entry test, interview, marks and pass rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="font-medium text-sm">Entry test required</p>
                <p className="text-xs text-muted-foreground">Applicants must sit a written test before a decision.</p>
              </div>
              <Switch
                checked={state.require_test}
                onCheckedChange={(v) => setState((p) => ({ ...p, require_test: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="font-medium text-sm">Interview required</p>
                <p className="text-xs text-muted-foreground">A face-to-face interview is scheduled after the test.</p>
              </div>
              <Switch
                checked={state.require_interview}
                onCheckedChange={(v) => setState((p) => ({ ...p, require_interview: v }))}
              />
            </div>

            {state.require_test && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Test total marks</Label>
                  <Input
                    type="number"
                    min={1}
                    value={state.test_total_marks}
                    onChange={(e) => setState((p) => ({ ...p, test_total_marks: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passing marks</Label>
                  <Input
                    type="number"
                    min={0}
                    value={state.passing_marks}
                    onChange={(e) => setState((p) => ({ ...p, passing_marks: Number(e.target.value) }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="font-medium text-sm">Mark passing applicants automatically</p>
                <p className="text-xs text-muted-foreground">
                  When marks are entered, anyone at or above the passing score moves to “passed”.
                </p>
              </div>
              <Switch
                checked={state.auto_pass}
                onCheckedChange={(v) => setState((p) => ({ ...p, auto_pass: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes for applicants (optional)</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Bring the original B-Form and two photographs on test day."
                value={state.instructions}
                onChange={(e) => setState((p) => ({ ...p, instructions: e.target.value }))}
              />
            </div>

            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save process
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AdmissionProcessSettings;
