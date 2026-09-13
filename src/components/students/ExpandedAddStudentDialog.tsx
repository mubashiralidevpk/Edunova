import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserPlus, Upload, FileCheck2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invokeFn, getErrorMessage } from '@/lib/errors';

interface Cls { id: string; level: number; section: string; class_name: string | null; subject: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classes: Cls[];
  defaultClassId?: string;
  onCreated?: () => void;
}

const ELECTIVES = ['Pre-Medical', 'Pre-Engineering', 'Computer Science', 'Humanities'];
const RELIGIONS = ['Islam', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const blank = {
  // Identity
  full_name: '', gender: '', date_of_birth: '', place_of_birth: '',
  b_form_number: '', nationality: 'Pakistani', religion: '', blood_group: '',
  previous_school: '',
  // Class
  class_id: '', roll_number: '', elective_group: '',
  // Father
  parent_father_name: '', parent_father_nic: '', parent_father_mobile: '',
  father_occupation: '', father_monthly_income: '',
  // Mother
  parent_mother_name: '', parent_mother_nic: '', parent_mother_mobile: '',
  // Guardian
  guardian_name: '', guardian_relationship: '', guardian_nic: '', guardian_mobile: '',
  // Contact
  parent_email: '', parent_mobile: '', address: '', emergency_contact: '',
};

type CustomField = { id: string; field_key: string; label: string; field_type: string; options: unknown; is_required: boolean; help_text: string | null };

export default function ExpandedAddStudentDialog({ open, onOpenChange, classes, defaultClassId, onCreated }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...blank });
  const [tab, setTab] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<{ bform?: File; photo?: File; tc?: File }>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({ ...blank, class_id: defaultClassId || '' });
      setFiles({});
      setTab('identity');
      setCustomValues({});
    }
  }, [open, defaultClassId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const db = supabase as any;
      const { data: profile } = await db.from('profiles').select('school_id').eq('id', (await supabase.auth.getUser()).data.user?.id).maybeSingle();
      if (!profile?.school_id) return;
      const { data } = await db.rpc('list_admission_form_fields', { _school_id: profile.school_id });
      if (!cancelled) setCustomFields(((data as CustomField[]) || []).filter((f: any) => f.is_active !== false));
    })();
    return () => { cancelled = true; };
  }, [open]);


  const selectedClass = useMemo(() => classes.find(c => c.id === form.class_id), [classes, form.class_id]);
  const requiresElective = selectedClass && (selectedClass.level === 9 || selectedClass.level === 10);

  const set = (k: keyof typeof blank, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!form.gender) return 'Gender is required';
    if (!form.date_of_birth) return 'Date of birth is required';
    if (!form.b_form_number.trim()) return 'B-Form / CNIC is required';
    if (!form.class_id) return 'Class is required';
    if (!form.roll_number.trim()) return 'Roll number is required';
    if (!form.parent_father_name.trim()) return "Father's name is required";
    if (!form.parent_father_mobile.trim() && !form.parent_mother_mobile.trim() && !form.guardian_mobile.trim()) {
      return 'At least one parent/guardian mobile is required';
    }
    if (requiresElective && !form.elective_group) return 'Elective group is required for Class 9-10';
    const missing = customFields.find((f) => f.is_required && !String(customValues[f.field_key] ?? '').trim());
    if (missing) return `${missing.label} is required`;
    return null;

  };

  const uploadDocs = async (studentTempKey: string) => {
    const urls: { bform_document_url?: string; photo_document_url?: string; transfer_certificate_url?: string } = {};
    const upload = async (file: File, kind: string) => {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${studentTempKey}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('student-documents').upload(path, file, { upsert: true });
      if (error) throw error;
      return path;
    };
    if (files.bform) urls.bform_document_url = await upload(files.bform, 'bform');
    if (files.photo) urls.photo_document_url = await upload(files.photo, 'photo');
    if (files.tc) urls.transfer_certificate_url = await upload(files.tc, 'tc');
    return urls;
  };

  const submit = async () => {
    const err = validate();
    if (err) { toast({ title: err, variant: 'destructive' }); return; }
    setSaving(true);
    try {
      // 1. Create the student account via existing edge function
      const { data, error } = await invokeFn('create-student-account', {
        body: {
          fullName: form.full_name,
          rollNumber: form.roll_number,
          classId: form.class_id,
          parentMobile: form.parent_father_mobile || form.parent_mother_mobile || form.guardian_mobile,
          parentEmail: form.parent_email,
          dateOfBirth: form.date_of_birth,
          gender: form.gender,
          bFormNumber: form.b_form_number,
          address: form.address,
          emergencyContact: form.emergency_contact,
          parentFatherName: form.parent_father_name,
          parentFatherNic: form.parent_father_nic,
          parentMotherName: form.parent_mother_name,
          parentMotherNic: form.parent_mother_nic,
          parentMotherMobile: form.parent_mother_mobile,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const studentId = (data as any)?.student?.id;

      // 2. Patch with extended fields
      const extended = {
        place_of_birth: form.place_of_birth || null,
        nationality: form.nationality || null,
        religion: form.religion || null,
        blood_group: form.blood_group || null,
        previous_school: form.previous_school || null,
        father_occupation: form.father_occupation || null,
        father_monthly_income: form.father_monthly_income ? Number(form.father_monthly_income) : null,
        guardian_name: form.guardian_name || null,
        guardian_relationship: form.guardian_relationship || null,
        guardian_nic: form.guardian_nic || null,
        guardian_mobile: form.guardian_mobile || null,
        elective_group: form.elective_group || null,
        custom_fields: customFields.length > 0 ? customValues : {},

      };
      if (studentId) {
        await supabase.from('students').update(extended).eq('id', studentId);
        // 3. Upload documents under student folder
        try {
          const urls = await uploadDocs(studentId);
          if (Object.keys(urls).length) {
            await supabase.from('students').update(urls).eq('id', studentId);
          }
        } catch (e: any) {
          toast({ title: 'Student created, but document upload failed', description: getErrorMessage(e), variant: 'destructive' });
        }
      }

      const creds = (data as any)?.credentials;
      toast({
        title: 'Student created ✓',
        description: creds ? `Login: ${creds.email} • Password: ${creds.password}` : undefined,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast({ title: 'Failed to create student', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add New Student</DialogTitle>
          <DialogDescription>Complete enrollment with full details, parents, and documents.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className={`grid w-full ${customFields.length > 0 ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="class">Class</TabsTrigger>
            <TabsTrigger value="parents">Parents</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
            {customFields.length > 0 && <TabsTrigger value="extra">Extra</TabsTrigger>}

          </TabsList>

          {/* IDENTITY */}
          <TabsContent value="identity" className="space-y-3 pt-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Full Name *"><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} /></Field>
              <Field label="Gender *">
                <Select value={form.gender} onValueChange={v => set('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of Birth *"><Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></Field>
              <Field label="Place of Birth"><Input value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} /></Field>
              <Field label="B-Form / CNIC *"><Input value={form.b_form_number} onChange={e => set('b_form_number', e.target.value)} placeholder="00000-0000000-0" /></Field>
              <Field label="Nationality"><Input value={form.nationality} onChange={e => set('nationality', e.target.value)} /></Field>
              <Field label="Religion">
                <Select value={form.religion} onValueChange={v => set('religion', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Blood Group">
                <Select value={form.blood_group} onValueChange={v => set('blood_group', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Previous School" className="md:col-span-2"><Input value={form.previous_school} onChange={e => set('previous_school', e.target.value)} /></Field>
            </div>
          </TabsContent>

          {/* CLASS */}
          <TabsContent value="class" className="space-y-3 pt-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Class *">
                <Select value={form.class_id} onValueChange={v => set('class_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name || `Class ${c.level}-${c.section}`} ({c.subject})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Roll Number *"><Input value={form.roll_number} onChange={e => set('roll_number', e.target.value)} /></Field>
              {requiresElective && (
                <Field label="Elective Group * (Class 9-10)" className="md:col-span-2">
                  <Select value={form.elective_group} onValueChange={v => set('elective_group', v)}>
                    <SelectTrigger><SelectValue placeholder="Select elective group" /></SelectTrigger>
                    <SelectContent>{ELECTIVES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          </TabsContent>

          {/* PARENTS */}
          <TabsContent value="parents" className="space-y-4 pt-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-primary">Father</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Father's Name *"><Input value={form.parent_father_name} onChange={e => set('parent_father_name', e.target.value)} /></Field>
                <Field label="Father's CNIC"><Input value={form.parent_father_nic} onChange={e => set('parent_father_nic', e.target.value)} /></Field>
                <Field label="Father's Mobile"><Input value={form.parent_father_mobile} onChange={e => set('parent_father_mobile', e.target.value)} /></Field>
                <Field label="Father's Occupation"><Input value={form.father_occupation} onChange={e => set('father_occupation', e.target.value)} /></Field>
                <Field label="Monthly Income (PKR)" className="md:col-span-2"><Input type="number" value={form.father_monthly_income} onChange={e => set('father_monthly_income', e.target.value)} /></Field>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-primary">Mother</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Mother's Name"><Input value={form.parent_mother_name} onChange={e => set('parent_mother_name', e.target.value)} /></Field>
                <Field label="Mother's CNIC"><Input value={form.parent_mother_nic} onChange={e => set('parent_mother_nic', e.target.value)} /></Field>
                <Field label="Mother's Mobile" className="md:col-span-2"><Input value={form.parent_mother_mobile} onChange={e => set('parent_mother_mobile', e.target.value)} /></Field>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-primary">Guardian (if not parents)</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Guardian Name"><Input value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} /></Field>
                <Field label="Relationship"><Input value={form.guardian_relationship} onChange={e => set('guardian_relationship', e.target.value)} placeholder="Uncle, Grandparent..." /></Field>
                <Field label="Guardian CNIC"><Input value={form.guardian_nic} onChange={e => set('guardian_nic', e.target.value)} /></Field>
                <Field label="Guardian Mobile"><Input value={form.guardian_mobile} onChange={e => set('guardian_mobile', e.target.value)} /></Field>
              </div>
            </div>
          </TabsContent>

          {/* CONTACT */}
          <TabsContent value="contact" className="space-y-3 pt-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Parent Email"><Input type="email" value={form.parent_email} onChange={e => set('parent_email', e.target.value)} /></Field>
              <Field label="Emergency Contact"><Input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} /></Field>
              <Field label="Home Address" className="md:col-span-2">
                <Textarea value={form.address} onChange={e => set('address', e.target.value)} rows={3} />
              </Field>
            </div>
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="docs" className="space-y-3 pt-4">
            <FileSlot label="B-Form / CNIC scan" file={files.bform} onChange={f => setFiles(s => ({ ...s, bform: f }))} />
            <FileSlot label="Passport-size photo" file={files.photo} onChange={f => setFiles(s => ({ ...s, photo: f }))} />
            <FileSlot label="Transfer certificate (if any)" file={files.tc} onChange={f => setFiles(s => ({ ...s, tc: f }))} />
            <p className="text-xs text-muted-foreground">Documents are private — only school staff can view.</p>
          </TabsContent>

          {/* SCHOOL-CONFIGURED EXTRA QUESTIONS */}
          {customFields.length > 0 && (
            <TabsContent value="extra" className="space-y-3 pt-4">
              <p className="text-xs text-muted-foreground">Questions your school added to the admission form.</p>
              <div className="grid md:grid-cols-2 gap-3">
                {customFields.map((f) => {
                  const options = Array.isArray(f.options) ? f.options.map(String) : [];
                  const value = customValues[f.field_key] ?? '';
                  return (
                    <Field key={f.id} label={`${f.label}${f.is_required ? ' *' : ''}`} className={f.field_type === 'textarea' ? 'md:col-span-2' : undefined}>
                      {f.field_type === 'textarea' ? (
                        <Textarea rows={3} value={value} onChange={(e) => setCustomValues((p) => ({ ...p, [f.field_key]: e.target.value }))} />
                      ) : f.field_type === 'select' && options.length > 0 ? (
                        <Select value={value || undefined} onValueChange={(v) => setCustomValues((p) => ({ ...p, [f.field_key]: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={f.field_type === 'number' || f.field_type === 'date' ? f.field_type : 'text'}
                          value={value}
                          onChange={(e) => setCustomValues((p) => ({ ...p, [f.field_key]: e.target.value }))}
                        />
                      )}
                      {f.help_text && <p className="text-xs text-muted-foreground mt-1">{f.help_text}</p>}
                    </Field>
                  );
                })}
              </div>
            </TabsContent>
          )}

        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function FileSlot({ label, file, onChange }: { label: string; file?: File; onChange: (f: File | undefined) => void }) {
  return (
    <div className="border border-border rounded-lg p-3 flex items-center gap-3">
      <div className="flex-1">
        <Label className="text-xs">{label}</Label>
        <Input type="file" accept="image/*,application/pdf" onChange={e => onChange(e.target.files?.[0])} className="mt-1" />
      </div>
      {file && (
        <div className="flex items-center gap-1 text-xs text-primary"><FileCheck2 className="h-4 w-4" /> {(file.size/1024).toFixed(0)} KB</div>
      )}
    </div>
  );
}
