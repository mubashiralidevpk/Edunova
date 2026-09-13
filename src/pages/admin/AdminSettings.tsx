import { useState, useEffect, useRef } from 'react';
import { Settings, MapPin, QrCode, RefreshCw, Save, Globe, ClipboardCheck, Bot, Sparkles, UserCheck, FileText, GraduationCap, ArrowRight, Landmark, Layers, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmissionCatalog } from '@/hooks/useAdmissionCatalog';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { useCheckingMode, type CheckingMode } from '@/hooks/useExamChecking';
import { Badge } from '@/components/ui/badge';

interface SchoolSettings {
  id: string;
  school_name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  checkin_deadline: string;
  qr_token: string | null;
  public_results_enabled: boolean;
  country_id: string | null;
  board_id: string | null;
}


const CHECKING_MODES: {
  value: CheckingMode;
  label: string;
  description: string;
  icon: typeof ClipboardCheck;
  steps: string[];
}[] = [
  {
    value: 'manual',
    label: 'Manual checking',
    description: 'Your teachers check every answer online themselves.',
    icon: UserCheck,
    steps: ['Upload question paper', 'Upload answer sheet per student', 'Check question by question', 'Confirm marks'],
  },
  {
    value: 'automatic',
    label: 'Automatic checking',
    description: 'The system reads the sheet and proposes marks for every question.',
    icon: Bot,
    steps: ['Upload question paper', 'Upload answer sheet', 'Student and roll number detected', 'Low-confidence answers flagged'],
  },
  {
    value: 'hybrid',
    label: 'Hybrid checking',
    description: 'Automatic suggestions, final authority stays with the teacher.',
    icon: Sparkles,
    steps: ['Automatic evaluation', 'Suggested marks shown', 'Teacher accepts, changes or rejects', 'Teacher confirms official marks'],
  },
];

const ADMISSION_LINKS = [
  { to: '/admin/programs', label: 'Programs & requirements', description: 'Boards, programs, seats, dates, fees, entry test, interview, requirements and form versions.', icon: Layers },
  { to: '/admin/admission-form', label: 'Admission form builder', description: 'Add, reorder, require or remove any field on the public application form.', icon: FileText },
  { to: '/admin/admissions', label: 'Admission process & classes', description: 'Open classes, entry test, interview, marks, passing marks and applicant notes.', icon: GraduationCap },
  { to: '/admissions', label: 'Institution comparison', description: 'The same guided search families use — compare institutions on your real attendance, result and admission data.', icon: BarChart3 },
];

export default function AdminSettings() {
  const { toast } = useToast();
  const { countries, boards, loadBoards } = useAdmissionCatalog();
  const { mode: checkingMode, save: saveCheckingMode, loading: modeLoading, saving: modeSaving } = useCheckingMode();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      let schoolId: string | null = null;
      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('user_id', uid)
          .maybeSingle();
        schoolId = prof?.school_id ?? null;
      }

      let row: SchoolSettings | null = null;

      if (schoolId) {
        const { data, error } = await supabase
          .from('school_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle();
        if (error) throw error;
        row = (data as unknown as SchoolSettings) ?? null;

        if (!row) {
          const inserted = await supabase
            .from('school_settings')
            .insert({ school_name: 'Edunova', school_id: schoolId } as never)
            .select('*')
            .maybeSingle();
          if (inserted.error) throw inserted.error;
          row = (inserted.data as unknown as SchoolSettings) ?? null;
        }
      } else {
        const { data, error } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
        if (error) throw error;
        row = (data as unknown as SchoolSettings) ?? null;
      }

      if (row) {
        setSettings(row);
        if (row.country_id) void loadBoards(row.country_id);
      } else {
        setLoadError('No school is linked to your account yet, so settings could not be opened.');
      }
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof SchoolSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateField('latitude', Number(pos.coords.latitude.toFixed(6)));
        updateField('longitude', Number(pos.coords.longitude.toFixed(6)));
        toast({ title: 'Location captured', description: 'Click Save to apply.' });
      },
      () => toast({ title: 'Could not get location', variant: 'destructive' })
    );
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('school_settings')
      .update({
        school_name: settings.school_name,
        latitude: settings.latitude,
        longitude: settings.longitude,
        geofence_radius_meters: settings.geofence_radius_meters,
        checkin_deadline: settings.checkin_deadline,
        public_results_enabled: settings.public_results_enabled,
        country_id: settings.country_id,
        board_id: settings.board_id,
      } as never)
      .eq('id', settings.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save', description: getErrorMessage(error), variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved' });
    }
  };

  const regenerateQR = async () => {
    if (!settings) return;
    setRegenerating(true);
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from('school_settings')
      .update({ qr_token: newToken, qr_generated_at: new Date().toISOString() })
      .eq('id', settings.id);
    setRegenerating(false);
    if (error) {
      toast({ title: 'Failed to regenerate QR', variant: 'destructive' });
    } else {
      setSettings({ ...settings, qr_token: newToken });
      toast({ title: 'QR regenerated', description: 'Old QR codes will no longer work.' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading school settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout>
        <Card className="glass-card max-w-lg">
          <CardHeader>
            <CardTitle>School settings could not be opened</CardTitle>
            <CardDescription>{loadError ?? 'Something went wrong while loading your settings.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchSettings} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const qrPayload = JSON.stringify({ type: 'aksms-checkin', token: settings.qr_token });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">School Settings</h1>
          <p className="text-muted-foreground">Manage location, check-in QR and rules.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General & Location</TabsTrigger>
            <TabsTrigger value="qr">Check-in QR</TabsTrigger>
            <TabsTrigger value="portal">Result Portal</TabsTrigger>
            <TabsTrigger value="exams">Examinations</TabsTrigger>
            <TabsTrigger value="admissions">Admissions</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" /> General
                </CardTitle>
                <CardDescription>School identity, location and check-in window.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>School name</Label>
                  <Input value={settings.school_name} onChange={(e) => updateField('school_name', e.target.value)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={settings.latitude ?? ''}
                      onChange={(e) => updateField('latitude', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={settings.longitude ?? ''}
                      onChange={(e) => updateField('longitude', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={useMyLocation} className="gap-2">
                  <MapPin className="h-4 w-4" /> Use my current location
                </Button>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Geofence radius (meters)</Label>
                    <Input
                      type="number"
                      value={settings.geofence_radius_meters}
                      onChange={(e) => updateField('geofence_radius_meters', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-in deadline (HH:MM)</Label>
                    <Input
                      type="time"
                      value={settings.checkin_deadline?.slice(0, 5) || '08:15'}
                      onChange={(e) => updateField('checkin_deadline', e.target.value + ':00')}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" /> School Check-in QR
                </CardTitle>
                <CardDescription>
                  Display or print this QR at the school entrance. Teachers scan it to check in.
                  Teachers must also be inside the geofence above.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center bg-white p-6 rounded-lg">
                  <QRCodeSVG value={qrPayload} size={260} level="H" includeMargin />
                </div>
                <div className="text-center text-xs text-muted-foreground font-mono break-all">
                  Token: {settings.qr_token?.slice(0, 8)}…
                </div>
                <Button variant="outline" onClick={regenerateQR} disabled={regenerating} className="w-full gap-2">
                  <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Regenerating...' : 'Regenerate QR (invalidates old)'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portal">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" /> Public Result Portal
                </CardTitle>
                <CardDescription>
                  When enabled, your school appears in the public Result Portal at <code className="text-primary">/results</code>.
                  Parents can look up published exam results using their child's class & roll number — no sign-in needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                  <div>
                    <p className="font-medium">Enable public results for this school</p>
                    <p className="text-xs text-muted-foreground">Only results you marked as <b>Published</b> will be visible.</p>
                  </div>
                  <Switch
                    checked={!!settings.public_results_enabled}
                    onCheckedChange={(v) => updateField('public_results_enabled', v)}
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" /> Examination checking system
                </CardTitle>
                <CardDescription>
                  Choose how answer sheets are checked in Exam Management. Teachers always confirm the official marks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bento-grid grid gap-4 md:grid-cols-3">
                  {CHECKING_MODES.map((m) => {
                    const Icon = m.icon;
                    const active = checkingMode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        disabled={modeLoading || modeSaving}
                        onClick={async () => {
                          const err = await saveCheckingMode(m.value);
                          if (err) toast({ title: 'Could not save', description: getErrorMessage(err), variant: 'destructive' });
                          else toast({ title: 'Checking system updated', description: `${m.label} is now used for examinations.` });
                        }}
                        className={`glass-card rounded-2xl p-4 text-left transition-all disabled:opacity-60 ${active ? 'border-primary/60 ring-1 ring-primary/40' : 'hover:border-primary/40'}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          {active && <Badge variant="outline" className="border-primary/40 text-primary">In use</Badge>}
                        </div>
                        <p className="font-semibold">{m.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-snug">{m.description}</p>
                        <ul className="mt-3 space-y-1">
                          {m.steps.map((st) => (
                            <li key={st} className="text-[11px] text-muted-foreground">- {st}</li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  All three modes are workflows of the same examination system: question paper, answer sheets, checking,
                  teacher confirmation, then the existing results. Every action is recorded in the paper history.
                </div>
                <Link to="/admin/exam-terms">
                  <Button variant="outline" className="gap-2">Open Exam Management <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admissions" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" /> Country & examination board
                </CardTitle>
                <CardDescription>
                  Tell us where your institution is and which board it follows. This is used across admissions,
                  the public search and institution comparison.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      value={settings.country_id ?? undefined}
                      onValueChange={async (v) => {
                        updateField('country_id', v);
                        updateField('board_id', null);
                        await loadBoards(v);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Examination board</Label>
                    <Select
                      value={settings.board_id ?? undefined}
                      onValueChange={(v) => updateField('board_id', v)}
                      disabled={!settings.country_id}
                    >
                      <SelectTrigger><SelectValue placeholder={settings.country_id ? 'Select board' : 'Choose a country first'} /></SelectTrigger>
                      <SelectContent>
                        {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.short_name || b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Each program you offer can still use a different board — set that on the Programs page.
                </p>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save settings'}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Admission management
                </CardTitle>
                <CardDescription>
                  Build and control your admission process. Defaults can be edited, disabled or removed by you.
                </CardDescription>
              </CardHeader>
              <CardContent className="bento-grid grid gap-4 md:grid-cols-2">
                {ADMISSION_LINKS.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="glass-card group rounded-2xl p-4 transition-all hover:border-primary/40"
                    >
                      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="font-semibold">{l.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">{l.description}</p>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
