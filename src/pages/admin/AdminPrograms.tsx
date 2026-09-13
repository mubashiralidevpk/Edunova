import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap, Plus, Trash2, RefreshCw, Save, ShieldAlert, FileText, Layers, Eye, EyeOff,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { useStaffRoles } from '@/hooks/useStaffRoles';
import { useAdmissionCatalog } from '@/hooks/useAdmissionCatalog';

const db = supabase as any;

interface InstitutionProgram {
  id: string;
  country_id: string;
  board_id: string;
  program_id: string;
  seats: number | null;
  admission_status: string;
  opens_on: string | null;
  closes_on: string | null;
  eligibility: string | null;
  fee_amount: number | null;
  merit_note: string | null;
  require_test: boolean;
  require_interview: boolean;
  public_visible: boolean;
  is_active: boolean;
  admission_programs?: { name: string; code: string } | null;
  admission_boards?: { name: string; short_name: string | null } | null;
}

interface Requirement {
  id: string;
  label: string;
  description: string | null;
  kind: string;
  is_required: boolean;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

interface Combination {
  id: string;
  name: string;
  code: string | null;
  subjects: string[];
  seats: number | null;
  is_active: boolean;
  sort_order: number;
}

interface FormVersion {

  id: string;
  version: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPrograms() {
  const { profile, role } = useAuth();
  const { isAdmissionManager, loading: rolesLoading } = useStaffRoles();
  const { toast } = useToast();
  const { countries, boards, programs, loadBoards, loadPrograms } = useAdmissionCatalog();

  const authorised = role === 'admin' || isAdmissionManager;
  const schoolId = profile?.school_id || null;

  const [rows, setRows] = useState<InstitutionProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [newRequirement, setNewRequirement] = useState({ label: '', kind: 'information' });
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [newCombination, setNewCombination] = useState({ name: '', subjects: '', seats: '' });


  const [draft, setDraft] = useState({ countryId: '', boardId: '', programId: '' });
  const [customProgram, setCustomProgram] = useState('');

  async function addCustomProgram() {
    if (!schoolId || !draft.boardId || !customProgram.trim()) {
      toast({ title: 'Pick a board and type a program name', variant: 'destructive' });
      return;
    }
    const name = customProgram.trim();
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 24);
    const { data, error } = await db.from('admission_programs')
      .insert({ board_id: draft.boardId, school_id: schoolId, name, code, sort_order: 900 })
      .select('id')
      .single();
    if (error) { toast({ title: 'Could not create program', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setCustomProgram('');
    await loadPrograms(draft.boardId);
    setDraft((d) => ({ ...d, programId: data.id }));
    toast({ title: `"${name}" added`, description: 'Now set seats, dates and requirements for it.' });
  }

  const load = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    const { data } = await db
      .from('institution_programs')
      .select('*, admission_programs(name, code), admission_boards(name, short_name)')
      .eq('school_id', schoolId)
      .order('created_at');
    setRows((data || []) as InstitutionProgram[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const loadDetails = useCallback(async (ipId: string) => {
    const [{ data: reqs }, { data: vers }, { data: combos }] = await Promise.all([
      db.from('admission_requirements').select('*').eq('institution_program_id', ipId).order('sort_order'),
      db.from('admission_form_versions').select('id, version, name, is_active, created_at')
        .eq('institution_program_id', ipId).order('version', { ascending: false }),
      db.from('admission_program_combinations').select('*')
        .eq('institution_program_id', ipId).order('sort_order'),
    ]);
    setRequirements((reqs || []) as Requirement[]);
    setVersions((vers || []) as FormVersion[]);
    setCombinations((combos || []) as Combination[]);

  }, []);

  useEffect(() => { if (selectedId) loadDetails(selectedId); }, [selectedId, loadDetails]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  async function addProgram() {
    if (!schoolId || !draft.countryId || !draft.boardId || !draft.programId) {
      toast({ title: 'Choose country, board and program first', variant: 'destructive' });
      return;
    }
    const { data, error } = await db.from('institution_programs').insert({
      school_id: schoolId,
      country_id: draft.countryId,
      board_id: draft.boardId,
      program_id: draft.programId,
      admission_status: 'closed',
    }).select('id').maybeSingle();
    if (error) { toast({ title: 'Could not add program', description: getErrorMessage(error), variant: 'destructive' }); return; }
    if (data?.id) {
      await db.rpc('seed_default_requirements', { _institution_program_id: data.id });
      setSelectedId(data.id);
    }
    toast({ title: 'Program added', description: 'Default requirements were added — you can edit or remove any of them.' });
    setDraft({ countryId: draft.countryId, boardId: draft.boardId, programId: '' });
    load();
  }

  async function patchProgram(id: string, patch: Record<string, unknown>) {
    const { error } = await db.from('institution_programs').update(patch).eq('id', id);
    if (error) { toast({ title: 'Could not save', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as InstitutionProgram : r)));
  }

  async function removeProgram(id: string) {
    const { error } = await db.from('institution_programs').delete().eq('id', id);
    if (error) { toast({ title: 'Could not remove', description: getErrorMessage(error), variant: 'destructive' }); return; }
    if (selectedId === id) setSelectedId(null);
    load();
  }

  async function addCombination() {
    if (!selectedId || !schoolId || !newCombination.name.trim()) {
      toast({ title: 'Type a combination name first', variant: 'destructive' });
      return;
    }
    const name = newCombination.name.trim();
    const subjects = newCombination.subjects.split(',').map((s) => s.trim()).filter(Boolean);
    const { error } = await db.from('admission_program_combinations').insert({
      school_id: schoolId,
      institution_program_id: selectedId,
      name,
      code: name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 20),
      subjects,
      seats: newCombination.seats === '' ? null : Number(newCombination.seats),
      sort_order: (combinations.at(-1)?.sort_order ?? 0) + 1,
    });
    if (error) { toast({ title: 'Could not add combination', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setNewCombination({ name: '', subjects: '', seats: '' });
    loadDetails(selectedId);
  }

  async function patchCombination(id: string, patch: Record<string, unknown>) {
    const { error } = await db.from('admission_program_combinations').update(patch).eq('id', id);
    if (error) { toast({ title: 'Could not save', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setCombinations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } as Combination : c)));
  }

  async function removeCombination(id: string) {
    const { error } = await db.from('admission_program_combinations').delete().eq('id', id);
    if (error) { toast({ title: 'Could not remove', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setCombinations((prev) => prev.filter((c) => c.id !== id));
  }

  async function addRequirement() {

    if (!selectedId || !schoolId || !newRequirement.label.trim()) return;
    const { error } = await db.from('admission_requirements').insert({
      school_id: schoolId,
      institution_program_id: selectedId,
      label: newRequirement.label.trim(),
      kind: newRequirement.kind,
      sort_order: (requirements.at(-1)?.sort_order ?? 0) + 1,
    });
    if (error) { toast({ title: 'Could not add requirement', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setNewRequirement({ label: '', kind: newRequirement.kind });
    loadDetails(selectedId);
  }

  async function patchRequirement(id: string, patch: Record<string, unknown>) {
    const { error } = await db.from('admission_requirements').update(patch).eq('id', id);
    if (error) { toast({ title: 'Could not save', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as Requirement : r)));
  }

  async function removeRequirement(id: string) {
    const { error } = await db.from('admission_requirements').delete().eq('id', id);
    if (error) { toast({ title: 'Could not remove', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  }

  async function newVersion() {
    if (!selectedId || !selected) return;
    const name = `${selected.admission_programs?.name || 'Admission'} Form`;
    const { error } = await db.rpc('create_admission_form_version', {
      _name: name,
      _institution_program_id: selectedId,
      _copy_from: versions[0]?.id ?? null,
    });
    if (error) { toast({ title: 'Could not create version', description: getErrorMessage(error), variant: 'destructive' }); return; }
    toast({ title: 'New form version created', description: 'New applicants use it; submitted applications stay on their own version.' });
    loadDetails(selectedId);
  }

  if (rolesLoading) {
    return <DashboardLayout><p className="text-sm text-muted-foreground">Checking your permissions…</p></DashboardLayout>;
  }

  if (!authorised) {
    return (
      <DashboardLayout>
        <Card className="glass-card">
          <CardContent className="space-y-2 p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <p className="font-medium">Admission management access required</p>
            <p className="text-sm text-muted-foreground">Ask your school admin for the Admission Manager role.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dash-bento space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Programs & Admissions</h1>
          <p className="text-muted-foreground">
            Country → board → program → requirements → form. Defaults are yours to edit, disable or remove.
          </p>
        </div>

        {/* Add a program */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Programs we support
            </CardTitle>
            <CardDescription>Add a program your institution accepts applications for.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select
                value={draft.countryId}
                onValueChange={async (v) => { setDraft({ countryId: v, boardId: '', programId: '' }); await loadBoards(v); }}
              >
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Board</Label>
              <Select
                value={draft.boardId}
                onValueChange={async (v) => { setDraft((d) => ({ ...d, boardId: v, programId: '' })); await loadPrograms(v); }}
                disabled={!draft.countryId}
              >
                <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                <SelectContent>
                  {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.short_name || b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select
                value={draft.programId}
                onValueChange={(v) => setDraft((d) => ({ ...d, programId: v }))}
                disabled={!draft.boardId}
              >
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addProgram} className="w-full gap-2 whitespace-nowrap"><Plus className="h-4 w-4" /> Add program</Button>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label>Or create your own program</Label>
              <Input
                value={customProgram}
                onChange={(e) => setCustomProgram(e.target.value)}
                placeholder="e.g. Montessori, O-Level Science, Hifz Program"
                disabled={!draft.boardId}
              />
              <p className="text-xs text-muted-foreground">
                Defaults on every board: Primary (Prep–5), Elementary (6–8), Matric (SSC), Matric Tech (SSC-TECH),
                Inter (HSSC), Inter Tech (HSSC-TECH), Associate Degree, Post Graduate (PG College), 4 Year Program (BS).

              </p>
            </div>
            <div className="flex items-start">
              <Button variant="outline" onClick={addCustomProgram} disabled={!draft.boardId} className="w-full gap-2 whitespace-nowrap">
                <Plus className="h-4 w-4" /> Create program
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configured programs */}
        {loading ? (
          <Card className="glass-card h-40 animate-pulse" />
        ) : rows.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No programs configured yet. Add one above to appear in the public admission search.
            </CardContent>
          </Card>
        ) : (
          <div className="bento-grid grid gap-4 lg:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.id} className={`glass-card ${selectedId === r.id ? 'border-primary/50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{r.admission_programs?.name}</CardTitle>
                      <CardDescription>{r.admission_boards?.short_name || r.admission_boards?.name}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={r.admission_status === 'open' ? 'border-primary/40 text-primary' : ''}>
                        {r.admission_status === 'open' ? 'Admissions open' : 'Closed'}
                      </Badge>
                      <Button variant="ghost" size="icon" aria-label="Remove program" onClick={() => removeProgram(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Seats</Label>
                      <Input
                        type="number"
                        defaultValue={r.seats ?? ''}
                        onBlur={(e) => patchProgram(r.id, { seats: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fee</Label>
                      <Input
                        type="number"
                        defaultValue={r.fee_amount ?? ''}
                        onBlur={(e) => patchProgram(r.id, { fee_amount: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Opens on</Label>
                      <Input type="date" defaultValue={r.opens_on ?? ''} onBlur={(e) => patchProgram(r.id, { opens_on: e.target.value || null })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Closes on</Label>
                      <Input type="date" defaultValue={r.closes_on ?? ''} onBlur={(e) => patchProgram(r.id, { closes_on: e.target.value || null })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Eligibility</Label>
                    <Textarea
                      defaultValue={r.eligibility ?? ''}
                      placeholder="Who can apply for this program"
                      onBlur={(e) => patchProgram(r.id, { eligibility: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Merit rule</Label>
                    <Textarea
                      defaultValue={r.merit_note ?? ''}
                      placeholder="How merit is calculated"
                      onBlur={(e) => patchProgram(r.id, { merit_note: e.target.value || null })}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { key: 'require_test', label: 'Entry test required', value: r.require_test },
                      { key: 'require_interview', label: 'Interview required', value: r.require_interview },
                      { key: 'public_visible', label: 'Show publicly', value: r.public_visible },
                      { key: 'is_active', label: 'Active', value: r.is_active },
                    ].map((f) => (
                      <div key={f.key} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                        <span className="text-sm">{f.label}</span>
                        <Switch checked={f.value} onCheckedChange={(v) => patchProgram(r.id, { [f.key]: v })} />
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 sm:col-span-2">
                      <span className="text-sm">Admissions open</span>
                      <Switch
                        checked={r.admission_status === 'open'}
                        onCheckedChange={(v) => patchProgram(r.id, { admission_status: v ? 'open' : 'closed' })}
                      />
                    </div>
                  </div>

                  <Button
                    variant={selectedId === r.id ? 'default' : 'outline'}
                    className="w-full gap-2"
                    onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                  >
                    <Layers className="h-4 w-4" />
                    {selectedId === r.id ? 'Hide requirements & form' : 'Requirements & form'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Requirements + versions */}
        {selected && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> {selected.admission_programs?.name} — requirements
              </CardTitle>
              <CardDescription>
                Defaults are marked. Change what is required, switch items off, or delete them completely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1 space-y-1.5">
                  <Label>New requirement</Label>
                  <Input
                    value={newRequirement.label}
                    onChange={(e) => setNewRequirement((n) => ({ ...n, label: e.target.value }))}
                    placeholder="e.g. Domicile certificate"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={newRequirement.kind} onValueChange={(v) => setNewRequirement((n) => ({ ...n, kind: v }))}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="information">Information</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addRequirement} className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
              </div>

              <div className="space-y-2">
                {requirements.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No requirements yet for this program.
                  </p>
                ) : (
                  requirements.map((req) => (
                    <div key={req.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
                      <span className="min-w-[200px] flex-1 text-sm">
                        {req.label}
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {req.kind}
                        </span>
                        {req.is_default && <Badge variant="outline" className="ml-2 text-[10px]">default</Badge>}
                      </span>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        Required
                        <Switch checked={req.is_required} onCheckedChange={(v) => patchRequirement(req.id, { is_required: v })} />
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={req.is_active ? 'Disable requirement' : 'Enable requirement'}
                        onClick={() => patchRequirement(req.id, { is_active: !req.is_active })}
                      >
                        {req.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete requirement" onClick={() => removeRequirement(req.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Subject combinations */}
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="font-medium">Subject combinations</p>
                <p className="text-xs text-muted-foreground">
                  For Matric and above, create the combinations students pick — e.g. ICS (Maths, Statistics, Computer),
                  ICS (Maths, Physics, Computer), Pre-Medical, Pre-Engineering, I.Com. Applicants choose one on the form.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1 space-y-1.5">
                    <Label>Combination name</Label>
                    <Input
                      value={newCombination.name}
                      onChange={(e) => setNewCombination((n) => ({ ...n, name: e.target.value }))}
                      placeholder="e.g. ICS"
                    />
                  </div>
                  <div className="min-w-[220px] flex-1 space-y-1.5">
                    <Label>Subjects (comma separated)</Label>
                    <Input
                      value={newCombination.subjects}
                      onChange={(e) => setNewCombination((n) => ({ ...n, subjects: e.target.value }))}
                      placeholder="Maths, Statistics, Computer"
                    />
                  </div>
                  <div className="w-[110px] space-y-1.5">
                    <Label>Seats</Label>
                    <Input
                      type="number"
                      value={newCombination.seats}
                      onChange={(e) => setNewCombination((n) => ({ ...n, seats: e.target.value }))}
                    />
                  </div>
                  <Button onClick={addCombination} className="gap-2 whitespace-nowrap"><Plus className="h-4 w-4" /> Add</Button>
                </div>
                <div className="mt-3 space-y-2">
                  {combinations.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No combinations yet for this program.
                    </p>
                  ) : (
                    combinations.map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
                        <span className="min-w-[200px] flex-1 text-sm">
                          {c.name}
                          {c.subjects.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">({c.subjects.join(', ')})</span>
                          )}
                          {c.seats != null && <Badge variant="outline" className="ml-2 text-[10px]">{c.seats} seats</Badge>}
                        </span>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Active
                          <Switch checked={c.is_active} onCheckedChange={(v) => patchCombination(c.id, { is_active: v })} />
                        </label>
                        <Button variant="ghost" size="icon" aria-label="Delete combination" onClick={() => removeCombination(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>


              <div className="rounded-2xl border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Admission form versions</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted applications stay attached to the version they were filled on.
                    </p>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={newVersion}>
                    <RefreshCw className="h-4 w-4" /> Create new version
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No version yet — create one to lock the current form fields for this program.
                    </p>
                  ) : (
                    versions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-xl bg-muted/25 px-3 py-2 text-sm">
                        <span>{v.name} — Version {v.version}</span>
                        <div className="flex items-center gap-2">
                          {v.id === versions[0].id && <Badge variant="outline" className="border-primary/40 text-primary">Current</Badge>}
                          <Switch checked={v.is_active} onCheckedChange={async (val) => {
                            await db.from('admission_form_versions').update({ is_active: val }).eq('id', v.id);
                            loadDetails(selected.id);
                          }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Save className="h-3.5 w-3.5" /> Changes save as soon as you leave a field.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
