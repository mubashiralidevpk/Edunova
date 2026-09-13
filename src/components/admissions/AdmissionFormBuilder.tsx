import { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { AdmissionClassLevels } from '@/components/admissions/AdmissionClassLevels';
import { AdmissionProcessSettings } from '@/components/admissions/AdmissionProcessSettings';

export interface FormField {
  id: string;
  school_id: string;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: string;
  options: any;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

export const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Free text (long)' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Single choice' },
  { value: 'multiselect', label: 'Multiple options' },
  { value: 'checkbox', label: 'Yes / No' },
  { value: 'file', label: 'Attachment' },
];

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'field';

export function AdmissionFormBuilder() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState({
    label: '',
    help_text: '',
    field_type: 'text',
    optionsText: '',
    is_required: false,
  });

  const schoolId = profile?.school_id;

  const load = async () => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from('admission_form_fields')
      .select('*')
      .eq('school_id', schoolId)
      .order('sort_order')
      .order('created_at');
    if (error) toast({ title: 'Could not load fields', description: getErrorMessage(error), variant: 'destructive' });
    setFields((data as FormField[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [schoolId]);

  const addField = async () => {
    if (!schoolId) return;
    if (!draft.label.trim()) {
      toast({ title: 'Give the field a label', variant: 'destructive' });
      return;
    }
    const needsOptions = draft.field_type === 'select' || draft.field_type === 'multiselect';
    const options = draft.optionsText.split(',').map((o) => o.trim()).filter(Boolean);
    if (needsOptions && options.length < 2) {
      toast({ title: 'Add at least two options (comma separated)', variant: 'destructive' });
      return;
    }
    let key = slug(draft.label);
    if (fields.some((f) => f.field_key === key)) key = `${key}_${Date.now().toString().slice(-4)}`;

    setSaving(true);
    const { error } = await supabase.from('admission_form_fields').insert({
      school_id: schoolId,
      field_key: key,
      label: draft.label.trim(),
      help_text: draft.help_text.trim() || null,
      field_type: draft.field_type,
      options,
      is_required: draft.is_required,
      sort_order: fields.length,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not add field', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    setDraft({ label: '', help_text: '', field_type: 'text', optionsText: '', is_required: false });
    toast({ title: 'Field added to your admission form' });
    load();
  };

  const patch = async (f: FormField, changes: Partial<FormField>) => {
    setFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, ...changes } : x)));
    const { error } = await supabase.from('admission_form_fields').update(changes as any).eq('id', f.id);
    if (error) {
      toast({ title: 'Update failed', description: getErrorMessage(error), variant: 'destructive' });
      load();
    }
  };

  const remove = async (f: FormField) => {
    if (!confirm(`Delete "${f.label}" from the admission form?`)) return;
    const { error } = await supabase.from('admission_form_fields').delete().eq('id', f.id);
    if (error) {
      toast({ title: 'Delete failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    setFields((prev) => prev.filter((x) => x.id !== f.id));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
    await Promise.all(next.map((f, i) => supabase.from('admission_form_fields').update({ sort_order: i }).eq('id', f.id)));
  };

  const needsOptions = draft.field_type === 'select' || draft.field_type === 'multiselect';

  return (
    <div className="space-y-6">
      <AdmissionClassLevels />
      <AdmissionProcessSettings />

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Add a custom question</CardTitle>
          <CardDescription>
            Parents applying to your school will see these extra questions on the public admission form.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Question / label *</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="e.g. Previous school name"
            />
          </div>
          <div className="space-y-2">
            <Label>Answer type</Label>
            <Select value={draft.field_type} onValueChange={(v) => setDraft({ ...draft, field_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Helper text (optional)</Label>
            <Input
              value={draft.help_text}
              onChange={(e) => setDraft({ ...draft, help_text: e.target.value })}
              placeholder="Shown in small text under the field"
            />
          </div>
          {needsOptions ? (
            <div className="space-y-2">
              <Label>Options (comma separated) *</Label>
              <Input
                value={draft.optionsText}
                onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
                placeholder="Urdu, English, Sindhi"
              />
            </div>
          ) : <div />}
          <div className="flex items-center gap-3">
            <Switch checked={draft.is_required} onCheckedChange={(v) => setDraft({ ...draft, is_required: v })} />
            <Label className="cursor-pointer">Mandatory field</Label>
          </div>
          <div className="flex md:justify-end">
            <Button onClick={addField} disabled={saving} className="gap-2 whitespace-nowrap">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add field
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Your admission form</CardTitle>
          <CardDescription>{fields.length} custom field(s) — standard fields (name, B-Form, parents) are always shown.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields yet. Add your first question above.</p>
          ) : (
            fields.map((f, i) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex flex-col">
                  <button className="text-muted-foreground hover:text-primary" onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                  <button className="text-muted-foreground hover:text-primary" onClick={() => move(i, 1)} aria-label="Move down">▼</button>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{f.field_key}</p>
                </div>
                <Badge variant="outline">{FIELD_TYPES.find((t) => t.value === f.field_type)?.label || f.field_type}</Badge>
                <div className="flex items-center gap-2">
                  <Switch checked={f.is_required} onCheckedChange={(v) => patch(f, { is_required: v })} />
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
                <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => patch(f, { is_active: !f.is_active })}>
                  {f.is_active ? <><Eye className="h-3 w-3" /> Visible</> : <><EyeOff className="h-3 w-3" /> Hidden</>}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(f)} aria-label="Delete field">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdmissionFormBuilder;
