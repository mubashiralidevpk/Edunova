import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, User, Mail, Hash, IdCard, Calendar, Clock, BookOpen, Bell,
  CheckCircle, XCircle, Award,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Student, Class, Attendance, StudentActivity, StudentSession } from '@/types/database';

interface StudentWithClass extends Student {
  classes?: Class | null;
}

export default function AdminStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentWithClass | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) void load();
  }, [id]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [studentRes, attRes, actRes, sesRes, resRes] = await Promise.all([
        supabase.from('students').select('*, classes(*)').eq('id', id).maybeSingle(),
        supabase.from('attendance').select('*').eq('student_id', id).order('date', { ascending: false }).limit(100),
        supabase.from('student_activity').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(100),
        supabase.from('student_sessions').select('*').eq('student_id', id).order('started_at', { ascending: false }).limit(50),
        supabase.from('student_exam_results').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(50),
      ]);
      setStudent((studentRes.data as StudentWithClass) || null);
      setAttendance((attRes.data as Attendance[]) || []);
      setActivities((actRes.data as StudentActivity[]) || []);
      setSessions((sesRes.data as StudentSession[]) || []);
      setResults(resRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const present = attendance.filter((a) => a.status === 'present').length;
  const total = attendance.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const totalMins = Math.floor(sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0) / 60);

  // Use the real login_email saved when the student account was provisioned.
  // Falls back to a clear placeholder for legacy records that pre-date login_email.
  const studentEmail = (student as any)?.login_email || '';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Student not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{student.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {student.classes ? (
                <Badge variant="secondary">
                  {student.classes.class_name || `Class ${student.classes.level}`} - {student.classes.section}
                </Badge>
              ) : (
                <Badge variant="outline">No class</Badge>
              )}
              <Badge variant="outline">Roll {student.roll_number}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{pct}%</p><p className="text-sm text-muted-foreground">Attendance</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold">{totalMins}m</p><p className="text-sm text-muted-foreground">Total usage</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Award className="h-5 w-5 text-purple-500" /></div>
            <div><p className="text-2xl font-bold">{results.length}</p><p className="text-sm text-muted-foreground">Results</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><BookOpen className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold">{activities.length}</p><p className="text-sm text-muted-foreground">Activities</p></div>
          </div></CardContent></Card>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Login & Identity</CardTitle><CardDescription>Account credentials and core identifiers</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" value={student.full_name} />
                <Field label="Roll Number" value={student.roll_number} />
                <Field label="Student ID" value={student.student_id} />
                <Field label="Enrolled" value={format(new Date(student.created_at), 'PPP')} />
                <Field label="Login Email" value={studentEmail || 'Not set — recreate this student account'} mono highlight />
                <Field label="Password" value={student.password_text || 'aksmsb'} mono highlight />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Gender" value={(student as any).gender} />
                <Field label="Date of Birth" value={(student as any).date_of_birth ? format(new Date((student as any).date_of_birth), 'PPP') : null} />
                <Field label="Place of Birth" value={(student as any).place_of_birth} />
                <Field label="B-Form / CNIC" value={(student as any).b_form_number} />
                <Field label="Nationality" value={(student as any).nationality} />
                <Field label="Religion" value={(student as any).religion} />
                <Field label="Blood Group" value={(student as any).blood_group} />
                <Field label="Address" value={(student as any).address} wide />
                <Field label="Emergency Contact" value={(student as any).emergency_contact} />
                <Field label="Previous School" value={(student as any).previous_school} />
                <Field label="Elective Group" value={(student as any).elective_group} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Father</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name" value={(student as any).parent_father_name} />
                <Field label="CNIC" value={(student as any).parent_father_nic} />
                <Field label="Mobile" value={(student as any).parent_mobile} />
                <Field label="Occupation" value={(student as any).father_occupation} />
                <Field label="Monthly Income" value={(student as any).father_monthly_income ? `Rs. ${(student as any).father_monthly_income}` : null} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Mother</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name" value={(student as any).parent_mother_name} />
                <Field label="CNIC" value={(student as any).parent_mother_nic} />
                <Field label="Mobile" value={(student as any).parent_mother_mobile} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Guardian / Contact</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Guardian Name" value={(student as any).guardian_name} />
                <Field label="Relationship" value={(student as any).guardian_relationship} />
                <Field label="Guardian CNIC" value={(student as any).guardian_nic} />
                <Field label="Guardian Mobile" value={(student as any).guardian_mobile} />
                <Field label="Parent Email" value={(student as any).parent_email} mono />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DocLink label="Photo" url={(student as any).photo_document_url} />
                <DocLink label="B-Form" url={(student as any).bform_document_url} />
                <DocLink label="Transfer Certificate" url={(student as any).transfer_certificate_url} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader><CardTitle>Attendance History</CardTitle><CardDescription>{total} records • {present} present</CardDescription></CardHeader>
              <CardContent>
                {attendance.length === 0 ? <p className="text-center text-muted-foreground py-8">No records.</p> : (
                  <div className="space-y-2">
                    {attendance.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          {r.status === 'present' ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                            r.status === 'late' ? <Clock className="h-5 w-5 text-yellow-500" /> :
                            <XCircle className="h-5 w-5 text-red-500" />}
                          <span className="font-medium">{format(new Date(r.date), 'PPP')}</span>
                        </div>
                        <Badge variant={r.status === 'present' ? 'default' : r.status === 'late' ? 'secondary' : 'destructive'}>{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader><CardTitle>Exam Results</CardTitle></CardHeader>
              <CardContent>
                {results.length === 0 ? <p className="text-center text-muted-foreground py-8">No results.</p> : (
                  <div className="space-y-2">
                    {results.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <div><p className="font-medium">{r.subject}</p><p className="text-xs text-muted-foreground">{r.term_name}</p></div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{r.obtained_marks}/{r.total_marks}</Badge>
                          {r.grade && <Badge>{r.grade}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
              <CardContent>
                {activities.length === 0 ? <p className="text-center text-muted-foreground py-8">No activity.</p> : (
                  <div className="space-y-2">
                    {activities.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-background">
                            {a.activity_type === 'note_viewed' ? <BookOpen className="h-4 w-4" /> :
                              a.activity_type === 'announcement_read' ? <Bell className="h-4 w-4" /> :
                              a.activity_type === 'message_sent' ? <BookOpen className="h-4 w-4" /> :
                              <User className="h-4 w-4" />}
                          </div>
                          <span className="capitalize">{a.activity_type.replace('_', ' ')}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader><CardTitle>Usage Sessions</CardTitle><CardDescription>Total: {totalMins} minutes</CardDescription></CardHeader>
              <CardContent>
                {sessions.length === 0 ? <p className="text-center text-muted-foreground py-8">No sessions.</p> : (
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{format(new Date(s.started_at), 'PP')}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(s.started_at), 'p')}{s.ended_at && ` - ${format(new Date(s.ended_at), 'p')}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{s.duration_seconds ? `${Math.round(s.duration_seconds / 60)} min` : 'Active'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, mono, highlight, wide }: { label: string; value: any; mono?: boolean; highlight?: boolean; wide?: boolean }) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/40 border-border'} ${wide ? 'md:col-span-2' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`${mono ? 'font-mono text-sm' : 'font-medium'} truncate`}>{display}</p>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">Not uploaded</p>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors block">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-primary truncate">View document →</p>
    </a>
  );
}
