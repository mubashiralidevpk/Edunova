import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Search, GraduationCap, Send, CheckCircle2, ArrowLeft, Building2, History, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { schoolMapLink } from '@/lib/mapLink';
import { saveApplication } from '@/lib/admissionStorage';
import PageMeta from '@/components/seo/PageMeta';
import { getErrorMessage } from '@/lib/errors';
import Logo from '@/components/brand/Logo';
import { PageFooter } from '@/components/layout/PageFooter';
import { MAX_CLASS_LEVEL, ALL_CLASS_LEVELS, classLevelLabel } from '@/lib/admissionStatus';
import { useProgramRequirements } from '@/hooks/useAdmissionCatalog';

interface PublicSchool { id: string; name: string; latitude: number | null; longitude: number | null; }
interface PublicFormField {
  id: string;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: string;
  options: unknown;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

interface SchoolProgram {
  institution_program_id: string;
  program_name: string;
  board_name: string | null;
  seats: number | null;
  admission_status: string;
  opens_on: string | null;
  closes_on: string | null;
  eligibility: string | null;
  fee_amount: number | null;
}

type CustomValues = Record<string, string | string[]>;


const applicationSchema = z.object({
  full_name: z.string().trim().min(1, 'Child name is required').max(100),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  b_form_number: z.string().trim().min(1, 'B-Form number is required').max(50),
  desired_class_level: z.coerce.number().int().min(1).max(MAX_CLASS_LEVEL),
  parent_father_name: z.string().trim().max(100).optional().or(z.literal('')),
  parent_mother_name: z.string().trim().max(100).optional().or(z.literal('')),
  parent_father_mobile: z.string().trim().max(30).optional().or(z.literal('')),
  parent_mother_mobile: z.string().trim().max(30).optional().or(z.literal('')),
  parent_email: z.string().trim().max(255).email('Invalid email').optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

const blank = {
  full_name: '', date_of_birth: '', b_form_number: '', desired_class_level: '1',
  parent_father_name: '', parent_mother_name: '',
  parent_father_mobile: '', parent_mother_mobile: '',
  parent_email: '', notes: '',
};

/** Standard details schools ask for; saved on the application record. */
const blankExtra = {
  gender: '', place_of_birth: '', nationality: 'Pakistani', religion: '', blood_group: '',
  previous_school: '', previous_class_passed: '', previous_result: '', previous_school_city: '',
  parent_father_nic: '', parent_mother_nic: '', father_occupation: '', mother_occupation: '',
  father_education: '', mother_education: '', monthly_income: '',
  guardian_name: '', guardian_relationship: '', guardian_mobile: '', guardian_nic: '',
  home_phone: '', whatsapp_number: '', city: '', siblings_in_school: '',
  transport_required: '', hostel_required: '', medical_conditions: '', special_needs: '',
  address: '', permanent_address: '', emergency_contact: '', emergency_contact_relation: '',
  elective_group: '', how_did_you_hear: '',
};

type ExtraField = { key: keyof typeof blankExtra; label: string; type?: string; options?: string[] };

const STUDENT_FIELDS: ExtraField[] = [
  { key: 'gender', label: 'Gender', options: ['Male', 'Female', 'Other'] },
  { key: 'place_of_birth', label: 'Place of birth' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'religion', label: 'Religion' },
  { key: 'blood_group', label: 'Blood group', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  { key: 'medical_conditions', label: 'Medical conditions / allergies' },
  { key: 'special_needs', label: 'Special learning needs' },
  { key: 'elective_group', label: 'Preferred group / electives' },
];

const PREVIOUS_SCHOOL_FIELDS: ExtraField[] = [
  { key: 'previous_school', label: 'Previous school name' },
  { key: 'previous_school_city', label: 'Previous school city' },
  { key: 'previous_class_passed', label: 'Last class passed' },
  { key: 'previous_result', label: 'Last result (marks or %)' },
];

const PARENT_FIELDS: ExtraField[] = [
  { key: 'parent_father_nic', label: "Father's CNIC" },
  { key: 'father_occupation', label: "Father's occupation" },
  { key: 'father_education', label: "Father's education" },
  { key: 'parent_mother_nic', label: "Mother's CNIC" },
  { key: 'mother_occupation', label: "Mother's occupation" },
  { key: 'mother_education', label: "Mother's education" },
  { key: 'monthly_income', label: 'Household monthly income' },
  { key: 'home_phone', label: 'Home phone', type: 'tel' },
  { key: 'whatsapp_number', label: 'WhatsApp number', type: 'tel' },
  { key: 'guardian_name', label: 'Guardian name (if not parent)' },
  { key: 'guardian_relationship', label: 'Guardian relationship' },
  { key: 'guardian_mobile', label: 'Guardian mobile', type: 'tel' },
  { key: 'guardian_nic', label: "Guardian's CNIC" },
  { key: 'emergency_contact', label: 'Emergency contact number', type: 'tel' },
  { key: 'emergency_contact_relation', label: 'Emergency contact relationship' },
];

const OTHER_FIELDS: ExtraField[] = [
  { key: 'city', label: 'City' },
  { key: 'siblings_in_school', label: 'Siblings already in this school' },
  { key: 'transport_required', label: 'School transport required', options: ['Yes', 'No'] },
  { key: 'hostel_required', label: 'Hostel required', options: ['Yes', 'No'] },
  { key: 'how_did_you_hear', label: 'How did you hear about the school' },
];


export default function ApplyPage() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PublicSchool | null>(null);
  const [form, setForm] = useState(blank);
  const [extra, setExtra] = useState(blankExtra);
  const [customFields, setCustomFields] = useState<PublicFormField[]>([]);
  const [customValues, setCustomValues] = useState<CustomValues>({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [openLevels, setOpenLevels] = useState<number[]>([]);
  const [schoolLevels, setSchoolLevels] = useState<number[]>([]);
  const [programs, setPrograms] = useState<SchoolProgram[]>([]);
  const [programId, setProgramId] = useState<string>('');
  const [requirementValues, setRequirementValues] = useState<Record<string, string>>({});
  const [combinations, setCombinations] = useState<{ id: string; name: string; subjects: string[]; seats: number | null }[]>([]);
  const [combinationId, setCombinationId] = useState<string>('');


  const [process, setProcess] = useState<{ require_test: boolean; require_interview: boolean; test_total_marks: number; passing_marks: number; instructions: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedKey, setSubmittedKey] = useState<{ bForm: string; dob: string } | null>(null);
  const [searchParams] = useSearchParams();
  const preselectedSchool = searchParams.get('school');
  const preselectedProgram = searchParams.get('program');
  const institutionProgramId = programId || preselectedProgram;
  const { requirements } = useProgramRequirements(institutionProgramId);

  useEffect(() => {
    let cancelled = false;
    setCombinationId('');
    if (!institutionProgramId) { setCombinations([]); return; }
    (async () => {
      const { data } = await (supabase as any).rpc('list_program_combinations_public', {
        _institution_program_id: institutionProgramId,
      });
      if (!cancelled) setCombinations((data || []) as any[]);
    })();
    return () => { cancelled = true; };
  }, [institutionProgramId]);




  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('list_public_schools', { _q: null });
      if (error) toast({ title: 'Could not load schools', description: getErrorMessage(error), variant: 'destructive' });
      const list = (data as PublicSchool[]) || [];
      setSchools(list);
      if (preselectedSchool) {
        const match = list.find((s) => s.id === preselectedSchool);
        if (match) setSelected(match);
      }
      setLoadingSchools(false);
    })();
  }, [toast, preselectedSchool]);

  useEffect(() => {
    let cancelled = false;
    if (!selected) {
      setCustomFields([]);
      setCustomValues({});
      setRequirementValues({});
      setOpenLevels([]);
      setSchoolLevels([]);
      setPrograms([]);
      setProgramId('');
      setProcess(null);
      return;
    }
    setLoadingFields(true);
    (async () => {
      const db = supabase as any;
      const [fieldsRes, levelsRes, schoolLevelsRes, programsRes] = await Promise.all([
        supabase.rpc('list_admission_form_fields', { _school_id: selected.id }),
        supabase.rpc('list_admission_class_levels', { _school_id: selected.id }),
        db.rpc('list_school_class_levels', { _school_id: selected.id }),
        db.rpc('list_school_programs_public', { _school_id: selected.id }),
      ]);
      const processRes = await supabase.rpc('get_admission_process', { _school_id: selected.id });
      if (!cancelled) setProcess((processRes.data as any[])?.[0] ?? null);
      if (cancelled) return;
      if (fieldsRes.error) {
        toast({ title: 'Could not load this school’s form', description: getErrorMessage(fieldsRes.error), variant: 'destructive' });
        setCustomFields([]);
      } else {
        setCustomFields(((fieldsRes.data as PublicFormField[]) || []).filter((field) => field.is_active));
      }
      const clean = (v: unknown) =>
        ((v as number[]) || []).filter((n) => n >= 1 && n <= MAX_CLASS_LEVEL).sort((a, b) => a - b);
      const open = clean(levelsRes.data);
      const runs = clean(schoolLevelsRes?.data);
      setOpenLevels(open);
      setSchoolLevels(runs);

      const list = ((programsRes?.data as SchoolProgram[]) || []);
      setPrograms(list);
      const preset = preselectedProgram && list.some((p) => p.institution_program_id === preselectedProgram)
        ? preselectedProgram
        : list.length === 1 ? list[0].institution_program_id : '';
      setProgramId(preset);

      const usable = runs.length > 0 && open.length > 0 ? open.filter((n) => runs.includes(n)) : open.length > 0 ? open : runs;
      if (usable.length > 0) setForm((prev) => ({ ...prev, desired_class_level: String(usable[0]) }));
      setCustomValues({});
      setRequirementValues({});
      setLoadingFields(false);
    })();
    return () => { cancelled = true; };
  }, [selected, toast, preselectedProgram]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(s => s.name.toLowerCase().includes(q));
  }, [schools, search]);

  const availableLevels = useMemo(() => {
    if (openLevels.length > 0 && schoolLevels.length > 0) {
      const both = openLevels.filter((n) => schoolLevels.includes(n));
      return both.length > 0 ? both : openLevels;
    }
    if (openLevels.length > 0) return openLevels;
    if (schoolLevels.length > 0) return schoolLevels;
    return ALL_CLASS_LEVELS;
  }, [openLevels, schoolLevels]);

  const levelHint = !selected
    ? 'Pick a school to see its open classes.'
    : openLevels.length > 0 && schoolLevels.length > 0
      ? 'Only classes this school runs and has opened for admission are listed.'
      : openLevels.length > 0
        ? 'Only the classes this school has opened for admission are listed.'
        : schoolLevels.length > 0
          ? 'These are the classes this school currently runs.'
          : 'This school has not limited classes — all classes are open.';



  const update = (k: keyof typeof blank, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const updateExtra = (k: keyof typeof blankExtra, v: string) => setExtra(prev => ({ ...prev, [k]: v }));
  const updateCustom = (key: string, value: string | string[]) => setCustomValues((prev) => ({ ...prev, [key]: value }));
  const updateRequirement = (key: string, value: string) => setRequirementValues((prev) => ({ ...prev, [key]: value }));


  const submit = async () => {
    if (!selected) return;
    const parsed = applicationSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Please fix the form', description: parsed.error.issues[0]?.message, variant: 'destructive' });
      return;
    }
    if (programs.length > 0 && !institutionProgramId) {
      toast({ title: 'Please choose a program', description: 'Select which program you are applying for.', variant: 'destructive' });
      return;
    }
    if (combinations.length > 0 && !combinationId) {
      toast({ title: 'Please choose a subject combination', description: 'Select the subject group you are applying for.', variant: 'destructive' });
      return;
    }

    const missing = requirements.filter((r) => r.is_required && !String(requirementValues[r.id] ?? '').trim());
    if (missing.length > 0) {
      toast({ title: 'Missing required item', description: `Please complete: ${missing[0].label}`, variant: 'destructive' });
      return;
    }
    const missingCustom = customFields.filter((f) => {
      if (!f.is_required) return false;
      const v = customValues[f.field_key];
      return Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim();
    });
    if (missingCustom.length > 0) {
      toast({ title: 'Missing required answer', description: `Please complete: ${missingCustom[0].label}`, variant: 'destructive' });
      return;
    }
    const requirementAnswers = requirements.reduce<Record<string, string>>((acc, r) => {
      const v = String(requirementValues[r.id] ?? '').trim();
      const ref = String(requirementValues[`${r.id}_ref`] ?? '').trim();
      if (v) acc[r.label] = ref ? `${v} (${ref})` : v;
      return acc;
    }, {});
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc('submit_program_application', {
      _school_id: selected.id,
      _institution_program_id: institutionProgramId,
      _full_name: parsed.data.full_name,
      _date_of_birth: parsed.data.date_of_birth,
      _b_form_number: parsed.data.b_form_number,
      _desired_class_level: parsed.data.desired_class_level,
      _parent_father_name: parsed.data.parent_father_name || '',
      _parent_mother_name: parsed.data.parent_mother_name || '',
      _parent_father_mobile: parsed.data.parent_father_mobile || '',
      _parent_mother_mobile: parsed.data.parent_mother_mobile || '',
      _parent_email: parsed.data.parent_email || '',
      _notes: parsed.data.notes || '',
      _custom_fields: customValues,
      _extra: (() => {
        const chosen = combinations.find((c) => c.id === combinationId);
        const label = chosen
          ? `${chosen.name}${chosen.subjects.length > 0 ? ` (${chosen.subjects.join(', ')})` : ''}`
          : '';
        return {
          ...extra,
          elective_group: label || (extra as any).elective_group || '',
          requirements: requirementAnswers,
        };
      })(),

    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Submission failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    const ref = String(data).slice(0, 8).toUpperCase();
    saveApplication({
      reference: ref, school_id: selected.id, school_name: selected.name,
      full_name: parsed.data.full_name, desired_class_level: parsed.data.desired_class_level,
      b_form_number: parsed.data.b_form_number, date_of_birth: parsed.data.date_of_birth,
      submitted_at: new Date().toISOString(),
    });
    setSubmittedRef(ref);
    setSubmittedKey({ bForm: parsed.data.b_form_number, dob: parsed.data.date_of_birth });
    setForm(blank);
    setExtra(blankExtra);
    setCustomValues({});
    setRequirementValues({});
  };

  if (submittedRef) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center p-4">
        <Card className="glass-card max-w-md w-full">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center"><CheckCircle2 className="h-8 w-8 text-accent" /></div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Application submitted</h2>
              <p className="text-muted-foreground mt-1">Your application is now <Badge variant="outline" className="ml-1">PENDING</Badge> with <span className="text-primary font-medium">{selected?.name}</span>.</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Reference</p>
              <p className="font-mono text-lg text-primary">{submittedRef}</p>
              <p className="text-xs text-muted-foreground mt-2">The admission team will contact you on the phone you provided.</p>
            </div>
            {submittedKey && <Link to={`/admission-chat?bform=${encodeURIComponent(submittedKey.bForm)}&dob=${submittedKey.dob}`} className="block"><Button className="w-full gap-2" variant="default"><MessageSquare className="h-4 w-4" /> Chat with the school</Button></Link>}
            <div className="flex gap-2 justify-center"><Button variant="outline" onClick={() => { setSubmittedRef(null); setSubmittedKey(null); setSelected(null); }}>Apply for another</Button><Link to="/"><Button variant="ghost">Back to home</Button></Link></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><Logo size={36} priority /><span className="font-bold tracking-tight text-foreground">Edu<span className="text-primary">nova</span></span></Link>
          <div className="flex items-center gap-2"><Link to="/admission-history"><Button variant="ghost" size="sm" className="gap-2"><History className="h-4 w-4" /> Check status</Button></Link><Link to="/"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Home</Button></Link></div>
        </div>
      </header>

      <main className="container py-10 max-w-5xl">
        <PageMeta title="Apply for Admission | Edunova" description="Submit an admission application to a partner school on Edunova — no account required. The admission team will review and contact you." path="/apply" />
        <div className="mb-8 text-center"><Badge variant="outline" className="mb-3">No account needed</Badge><h1 className="text-3xl md:text-4xl font-bold text-foreground">Apply for <span className="text-primary neon-text">Admission</span></h1><p className="text-muted-foreground mt-2 max-w-xl mx-auto">Find a school and submit an admission application. Their admission team will review and contact you.</p></div>
        <h2 className="sr-only">School selection and application form</h2>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-primary" /> Choose a school</CardTitle><CardDescription>Browse all schools or search by name.</CardDescription></CardHeader>
            <CardContent className="space-y-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input aria-label="Search schools" placeholder="Search school name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" maxLength={100} /></div>
              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">{loadingSchools ? <p className="text-sm text-muted-foreground p-4 text-center">Loading schools...</p> : filtered.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">No schools found.</p> : filtered.map((s) => { const active = selected?.id === s.id; const map = schoolMapLink(s.latitude, s.longitude); return <div key={s.id} className={`w-full text-left p-3 rounded-lg border transition-all ${active ? 'border-primary bg-primary/10 neon-border' : 'border-border bg-muted/20 hover:border-primary/40'}`}><button onClick={() => setSelected(s)} className="w-full text-left"><p className="font-medium text-foreground">{s.name}</p><p className="text-xs text-muted-foreground font-mono">ID: {s.id.slice(0, 8)}…</p></button>{map && <a href={map} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">Get directions</a>}</div>; })}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-primary" /> Application form</CardTitle><CardDescription>{selected ? <>Applying to <span className="text-primary font-medium">{selected.name}</span></> : 'Pick a school on the left first.'}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {selected && process && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                  <p className="text-sm font-medium text-foreground">Admission steps at this school</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>1. Submit this application form</li>
                    {process.require_test && (
                      <li>2. Entry test — {process.passing_marks} of {process.test_total_marks} marks needed to pass</li>
                    )}
                    {process.require_interview && <li>{process.require_test ? '3' : '2'}. Interview with the admission team</li>}
                    <li>Final step: admission decision and class allocation</li>
                  </ul>
                  {process.instructions && <p className="text-xs text-foreground/80 pt-1">{process.instructions}</p>}
                </div>
              )}
              <fieldset disabled={!selected || submitting} className="space-y-4 disabled:opacity-50">
                <div className="space-y-2"><Label>Child full name *</Label><Input value={form.full_name} maxLength={100} onChange={(e) => update('full_name', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Date of birth *</Label><Input type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} /></div><div className="space-y-2"><Label>Class applying for *</Label><Select value={form.desired_class_level} onValueChange={(v) => update('desired_class_level', v)}><SelectTrigger><SelectValue placeholder={loadingFields ? 'Loading classes…' : 'Select a class'} /></SelectTrigger><SelectContent>{availableLevels.map((n) => <SelectItem key={n} value={String(n)}>{classLevelLabel(n)}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{levelHint}</p></div></div>
                {selected && (
                  <div className="space-y-2">
                    <Label>Program applying for {programs.length > 0 ? '*' : ''}</Label>
                    {loadingFields ? (
                      <p className="text-sm text-muted-foreground">Loading programs…</p>
                    ) : programs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">This school has not opened a specific program — your application goes to the general admission list.</p>
                    ) : (
                      <>
                        <Select value={programId} onValueChange={setProgramId}>
                          <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                          <SelectContent>
                            {programs.map((p) => (
                              <SelectItem key={p.institution_program_id} value={p.institution_program_id}>
                                {p.program_name}{p.board_name ? ` — ${p.board_name}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(() => {
                          const p = programs.find((x) => x.institution_program_id === programId);
                          if (!p) return <p className="text-xs text-muted-foreground">Only programs currently open at this school are listed.</p>;
                          return (
                            <p className="text-xs text-muted-foreground">
                              {p.seats != null && `${p.seats} seats · `}
                              {p.closes_on ? `applications close ${p.closes_on}` : 'applications open'}
                              {p.fee_amount != null && ` · fee ${Number(p.fee_amount).toLocaleString()}`}
                              {p.eligibility && ` · ${p.eligibility}`}
                            </p>
                          );
                        })()}
                        {combinations.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <Label>Subject combination *</Label>
                            <Select value={combinationId} onValueChange={setCombinationId}>
                              <SelectTrigger><SelectValue placeholder="Select a subject combination" /></SelectTrigger>
                              <SelectContent>
                                {combinations.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}{c.subjects.length > 0 ? ` — ${c.subjects.join(', ')}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>

                    )}
                  </div>
                )}

                <div className="space-y-2"><Label>B-Form number *</Label><Input value={form.b_form_number} maxLength={50} onChange={(e) => update('b_form_number', e.target.value)} /></div>

                {[
                  { title: 'Student details', fields: STUDENT_FIELDS },
                  { title: 'Previous school', fields: PREVIOUS_SCHOOL_FIELDS },
                  { title: 'Parent & guardian details', fields: PARENT_FIELDS },
                  { title: 'Other information', fields: OTHER_FIELDS },
                ].map((section) => (
                  <div key={section.title} className="pt-2 border-t border-border">
                    <p className="text-xs font-mono uppercase text-muted-foreground mb-3">{section.title}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {section.fields.map((f) => (
                        <div key={f.key} className="space-y-2">
                          <Label>{f.label}</Label>
                          {f.options ? (
                            <Select value={extra[f.key] || undefined} onValueChange={(v) => updateExtra(f.key, v)}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <Input type={f.type || 'text'} maxLength={120} value={extra[f.key]} onChange={(e) => updateExtra(f.key, e.target.value)} />
                          )}
                        </div>
                      ))}
                    </div>
                    {section.title === 'Other information' && (
                      <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        <div className="space-y-2">
                          <Label>Current home address</Label>
                          <Textarea rows={2} maxLength={300} value={extra.address} onChange={(e) => updateExtra('address', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Permanent address</Label>
                          <Textarea rows={2} maxLength={300} value={extra.permanent_address} onChange={(e) => updateExtra('permanent_address', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {requirements.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-3">
                    <div>
                      <p className="text-xs font-mono uppercase text-muted-foreground">Required documents & information</p>
                      <p className="text-xs text-muted-foreground mt-1">Set by {selected?.name}. Documents must also be brought to the school in original.</p>
                    </div>
                    {requirements.map((r) => {
                      const value = String(requirementValues[r.id] ?? '');
                      return (
                        <div key={r.id} className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                          <Label className="flex items-start gap-2">
                            <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${r.is_required ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span>
                              {r.label}{r.is_required && <span className="text-primary"> *</span>}
                              {r.description && <span className="block text-xs font-normal text-muted-foreground">{r.description}</span>}
                            </span>
                          </Label>
                          {r.kind === 'document' ? (
                            <div className="space-y-1.5">
                              <Select value={value || undefined} onValueChange={(v) => updateRequirement(r.id, v)}>
                                <SelectTrigger><SelectValue placeholder="Do you have this document?" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Available — will bring original">Available — will bring original</SelectItem>
                                  <SelectItem value="Available — copy attached">Available — copy attached</SelectItem>
                                  <SelectItem value="Applied for — not received yet">Applied for — not received yet</SelectItem>
                                  <SelectItem value="Not available">Not available</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Document number / reference (optional)"
                                maxLength={100}
                                value={String(requirementValues[`${r.id}_ref`] ?? '')}
                                onChange={(e) => updateRequirement(`${r.id}_ref`, e.target.value)}
                              />
                            </div>
                          ) : (
                            <Input maxLength={200} value={value} onChange={(e) => updateRequirement(r.id, e.target.value)} placeholder="Your answer" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}


                <div className="pt-2 border-t border-border"><p className="text-xs font-mono uppercase text-muted-foreground mb-3">Parent contact</p><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Father's name</Label><Input value={form.parent_father_name} maxLength={100} onChange={(e) => update('parent_father_name', e.target.value)} /></div><div className="space-y-2"><Label>Father's mobile</Label><Input type="tel" value={form.parent_father_mobile} maxLength={30} onChange={(e) => update('parent_father_mobile', e.target.value)} /></div><div className="space-y-2"><Label>Mother's name</Label><Input value={form.parent_mother_name} maxLength={100} onChange={(e) => update('parent_mother_name', e.target.value)} /></div><div className="space-y-2"><Label>Mother's mobile</Label><Input type="tel" value={form.parent_mother_mobile} maxLength={30} onChange={(e) => update('parent_mother_mobile', e.target.value)} /></div></div><div className="space-y-2 mt-3"><Label>Email (optional)</Label><Input type="email" value={form.parent_email} maxLength={255} onChange={(e) => update('parent_email', e.target.value)} /></div></div>

                {loadingFields ? <div className="border-t border-border pt-4 text-sm text-muted-foreground">Loading school-specific questions…</div> : customFields.length > 0 ? <div className="border-t border-border pt-4 space-y-4"><div><p className="text-xs font-mono uppercase text-muted-foreground">Additional information</p><p className="text-xs text-muted-foreground mt-1">Questions configured by {selected?.name}.</p></div>{customFields.map((field) => { const value = customValues[field.field_key] ?? (field.field_type === 'multiselect' ? [] : ''); const options = Array.isArray(field.options) ? field.options.map(String) : []; const required = field.is_required ? ' *' : ''; return <div key={field.id} className="space-y-2"><Label>{field.label}{required}</Label>{field.field_type === 'textarea' ? <Textarea rows={3} value={String(value)} onChange={(e) => updateCustom(field.field_key, e.target.value)} /> : field.field_type === 'select' ? <Select value={String(value)} onValueChange={(v) => updateCustom(field.field_key, v)}><SelectTrigger><SelectValue placeholder="Choose an option" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select> : field.field_type === 'multiselect' ? <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3">{options.map((option) => { const selectedOptions = Array.isArray(value) ? value : []; const checked = selectedOptions.includes(option); return <label key={option} className="flex items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={(next) => updateCustom(field.field_key, next ? [...selectedOptions, option] : selectedOptions.filter((item) => item !== option))} />{option}</label>; })}</div> : field.field_type === 'checkbox' ? <label className="flex items-center gap-2 text-sm"><Checkbox checked={value === 'true'} onCheckedChange={(next) => updateCustom(field.field_key, next ? 'true' : 'false')} />Yes</label> : field.field_type === 'file' ? <Input type="file" onChange={(e) => updateCustom(field.field_key, e.target.files?.[0]?.name || '')} /> : <Input type={field.field_type === 'number' || field.field_type === 'date' ? field.field_type : 'text'} value={String(value)} onChange={(e) => updateCustom(field.field_key, e.target.value)} />}{field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}</div>; })}</div> : null}

                <div className="space-y-2"><Label>Notes / message to school</Label><Textarea rows={3} maxLength={1000} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Anything the school should know..." /><p className="text-xs text-muted-foreground text-right">{form.notes.length}/1000</p></div>
                <Button onClick={submit} disabled={!selected || submitting} className="w-full gap-2" size="lg"><Send className="h-4 w-4" />{submitting ? 'Submitting...' : 'Submit application'}</Button>
              </fieldset>
            </CardContent>
          </Card>
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
