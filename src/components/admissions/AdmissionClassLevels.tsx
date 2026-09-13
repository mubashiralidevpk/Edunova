import { useEffect, useState } from 'react';
import { Loader2, Save, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { ALL_CLASS_LEVELS, classLevelLabel } from '@/lib/admissionStatus';

const ALL_LEVELS = ALL_CLASS_LEVELS;

export function AdmissionClassLevels() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [levels, setLevels] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data, error } = await supabase.rpc('list_admission_class_levels', { _school_id: schoolId });
      if (error) toast({ title: 'Could not load open classes', description: getErrorMessage(error), variant: 'destructive' });
      setLevels((data as number[]) || []);
      setLoading(false);
    })();
  }, [schoolId, toast]);

  const toggle = (level: number, checked: boolean) =>
    setLevels((prev) => (checked ? [...prev, level].sort((a, b) => a - b) : prev.filter((l) => l !== level)));

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc('set_admission_class_levels', { _levels: levels });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    setLevels((data as number[]) || []);
    toast({ title: 'Open classes updated', description: 'The public admission form now shows only these classes.' });
  };

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" /> Classes open for admission
        </CardTitle>
        <CardDescription>
          Applicants can only choose the classes you tick here. If none are ticked, the form shows all classes 1–16.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {ALL_LEVELS.map((level) => (
                <label
                  key={level}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2 text-sm cursor-pointer hover:border-primary/40"
                >
                  <Checkbox checked={levels.includes(level)} onCheckedChange={(v) => toggle(level, Boolean(v))} />
                  <span className="truncate" title={classLevelLabel(level)}>Class {level}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save open classes
              </Button>
              <Button variant="outline" onClick={() => setLevels(ALL_LEVELS)} disabled={saving}>Select all</Button>
              <Button variant="ghost" onClick={() => setLevels([])} disabled={saving}>Clear</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AdmissionClassLevels;
