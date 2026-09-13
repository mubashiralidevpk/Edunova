import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Search, MapPin, Terminal, Building2, CheckCircle2, XCircle, Clock3, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadSavedApplications, removeApplication, clearApplications, SavedApplication } from '@/lib/admissionStorage';
import PageMeta from '@/components/seo/PageMeta';
import { getErrorMessage } from '@/lib/errors';
import Logo from '@/components/brand/Logo';
import { PageFooter } from '@/components/layout/PageFooter';
import { statusMeta, toneClass, TOTAL_STEPS } from '@/lib/admissionStatus';

interface HistoryRow {
  applicant_id: string;
  reference: string;
  school_name: string;
  full_name: string;
  desired_class_level: number;
  status: string;
  status_note: string | null;
  status_updated_at: string | null;
  test_total_marks: number | null;
  test_obtained_marks: number | null;
  test_completed_at: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  scheduled_venue: string | null;
  interview_scheduled_at: string | null;
  interview_venue: string | null;
  interview_status: string | null;
  applied_at: string;
}

interface TimelineRow {
  applicant_id: string;
  status: string;
  note: string | null;
  created_at: string;
}

export default function AdmissionHistoryPage() {
  const { toast } = useToast();
  const [bForm, setBForm] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HistoryRow[] | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [saved, setSaved] = useState<SavedApplication[]>([]);

  useEffect(() => {
    setSaved(loadSavedApplications());
  }, []);

  const runLookup = async (bFormVal: string, dobVal: string) => {
    if (!bFormVal.trim() || !dobVal) {
      toast({ title: 'Enter B-Form and date of birth', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const [{ data, error }, { data: events }] = await Promise.all([
      supabase.rpc('lookup_admission_history', {
        _b_form_number: bFormVal.trim(),
        _date_of_birth: dobVal,
      }),
      (supabase as any).rpc('lookup_admission_timeline', {
        _b_form_number: bFormVal.trim(),
        _date_of_birth: dobVal,
      }),
    ]);
    setLoading(false);
    if (error) {
      toast({ title: 'Lookup failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    setResults((data as unknown as HistoryRow[]) || []);
    setTimeline((events as TimelineRow[]) || []);
  };

  const lookup = () => runLookup(bForm, dob);

  const lookupFromSaved = (s: SavedApplication) => {
    setBForm(s.b_form_number);
    setDob(s.date_of_birth);
    runLookup(s.b_form_number, s.date_of_birth);
  };

  const deleteSaved = (ref: string) => {
    removeApplication(ref);
    setSaved(loadSavedApplications());
  };

  const clearAllSaved = () => {
    clearApplications();
    setSaved([]);
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={36} priority />
            <span className="font-bold tracking-tight text-foreground">Edu<span className="text-primary">nova</span></span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-10 max-w-3xl">
        <PageMeta
          title="Admission Status & History | Edunova"
          description="Track your child's admission application status. Enter B-Form number and date of birth to view application progress and test schedules."
          path="/admission-history"
        />
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3">No account needed</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Admission <span className="text-primary neon-text">History</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter the child's B-Form number and date of birth to view application status across all schools.
          </p>
        </div>
        <h2 className="sr-only">Look up admission status</h2>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" /> Look up status
            </CardTitle>
            <CardDescription>Both fields must match exactly the data submitted in the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>B-Form number</Label>
                <Input
                  value={bForm}
                  onChange={(e) => setBForm(e.target.value)}
                  maxLength={50}
                  placeholder="xxxxx-xxxxxxx-x"
                />
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>
            <Button onClick={lookup} disabled={loading} className="w-full gap-2" size="lg">
              <Search className="h-4 w-4" />
              {loading ? 'Searching...' : 'Search applications'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Privacy: only minimal status information is shown. Parent contact is never returned.
            </p>
          </CardContent>
        </Card>

        {saved.length > 0 && (
          <Card className="glass-card mt-6">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-primary" /> Saved on this device
                </CardTitle>
                <CardDescription>
                  Applications you submitted from this browser. Tap one to look up its latest status.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={clearAllSaved}>
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {saved.map((s) => (
                <div
                  key={s.reference}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <Building2 className="h-3 w-3 inline mr-1" />
                      {s.school_name} • Class {s.desired_class_level}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Ref {s.reference} • {new Date(s.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link to={`/admission-chat?bform=${encodeURIComponent(s.b_form_number)}&dob=${s.date_of_birth}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <MessageSquare className="h-3 w-3" /> Chat
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => lookupFromSaved(s)}>
                      <RefreshCw className="h-3 w-3" /> Check
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Remove saved application" onClick={() => deleteSaved(s.reference)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {results !== null && (
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {results.length === 0 ? 'No applications found' : `${results.length} application${results.length > 1 ? 's' : ''} found`}
            </h2>
            {results.length === 0 && (
              <Card className="glass-card">
                <CardContent className="p-6 text-sm text-muted-foreground text-center">
                  Double-check the B-Form number and date of birth, then try again. If you never applied, head to{' '}
                  <Link to="/apply" className="text-primary underline">the Apply page</Link>.
                </CardContent>
              </Card>
            )}
            {results.map((r) => {
              const meta = statusMeta(r.status);
              const pct = r.test_obtained_marks != null && r.test_total_marks
                ? ((r.test_obtained_marks / r.test_total_marks) * 100).toFixed(1)
                : null;
              const events = timeline.filter((t) => t.applicant_id === r.applicant_id);
              return (
                <Card key={r.reference} className="glass-card">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Building2 className="h-3 w-3" /> {r.school_name} • Class {r.desired_class_level}
                        </p>
                      </div>
                      <Badge className={`gap-1 ${toneClass[meta.tone]}`}>
                        <Clock3 className="h-3 w-3" /> {meta.label}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.round((meta.step / TOTAL_STEPS) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Step {meta.step} of {TOTAL_STEPS} — {meta.description}
                      </p>
                      {r.status_note && (
                        <p className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs text-foreground">
                          Message from the school: {r.status_note}
                        </p>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between border-b border-border/50 py-1">
                        <span className="text-muted-foreground">Reference</span>
                        <span className="font-mono text-primary">{r.reference}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 py-1">
                        <span className="text-muted-foreground">Applied</span>
                        <span>{new Date(r.applied_at).toLocaleDateString()}</span>
                      </div>
                      {r.scheduled_date && (
                        <>
                          <div className="flex justify-between border-b border-border/50 py-1">
                            <span className="text-muted-foreground">Test date</span>
                            <span>{r.scheduled_date}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/50 py-1">
                            <span className="text-muted-foreground">Test time</span>
                            <span>{r.scheduled_time?.slice(0, 5) || '—'}</span>
                          </div>
                          {r.scheduled_venue && (
                            <div className="flex justify-between border-b border-border/50 py-1 sm:col-span-2">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Venue
                              </span>
                              <span>{r.scheduled_venue}</span>
                            </div>
                          )}
                        </>
                      )}
                      {pct && (
                        <div className="flex justify-between border-b border-border/50 py-1 sm:col-span-2">
                          <span className="text-muted-foreground">Test result</span>
                          <span className="font-medium">
                            {r.test_obtained_marks}/{r.test_total_marks} ({pct}%)
                          </span>
                        </div>
                      )}
                      {r.interview_scheduled_at && (
                        <>
                          <div className="flex justify-between border-b border-border/50 py-1">
                            <span className="text-muted-foreground">Interview</span>
                            <span>{new Date(r.interview_scheduled_at).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/50 py-1">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> Interview venue
                            </span>
                            <span>{r.interview_venue || '—'}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {events.length > 0 && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <p className="text-xs font-mono uppercase text-muted-foreground mb-2">Progress history</p>
                        <ol className="space-y-2">
                          {events.map((e, i) => {
                            const m = statusMeta(e.status);
                            const last = i === events.length - 1;
                            return (
                              <li key={`${e.created_at}-${i}`} className="flex gap-3 text-sm">
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${last ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                                <span className="min-w-0">
                                  <span className={last ? 'text-foreground font-medium' : 'text-foreground/80'}>{m.label}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {new Date(e.created_at).toLocaleString()}
                                  </span>
                                  {e.note && <span className="block text-xs text-foreground/80">{e.note}</span>}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <Link to={`/admission-chat?bform=${encodeURIComponent(bForm)}&dob=${dob}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <MessageSquare className="h-3 w-3" /> Chat with school
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <PageFooter />
    </div>
  );
}
