import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  BookOpen,
  Calendar,
  Clock,
  ClipboardList,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Profile, Class } from '@/types/database';

interface ClassRow extends Class {
  source: 'owner' | 'assigned';
}

export default function AdminTeacherDetail() {
  const { id } = useParams<{ id: string }>(); // user_id of teacher
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) void load();
  }, [id]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [
        profileRes,
        ownedClassesRes,
        assignedClassesRes,
        resultsRes,
        announcementsRes,
        notesRes,
        checkinsRes,
        schedulesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('classes').select('*').eq('teacher_id', id),
        supabase
          .from('class_teachers')
          .select('class_id, role, invitation_status, classes(*)')
          .eq('teacher_id', id)
          .eq('invitation_status', 'accepted'),
        supabase
          .from('student_exam_results')
          .select('*, students(full_name, roll_number)')
          .eq('teacher_id', id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('announcements')
          .select('*, classes(class_name, level, section)')
          .eq('teacher_id', id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('class_notes')
          .select('*, classes(class_name, level, section)')
          .eq('teacher_id', id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('teacher_checkins')
          .select('*')
          .eq('teacher_id', id)
          .order('date', { ascending: false })
          .limit(60),
        supabase
          .from('teacher_schedules')
          .select('*, classes(class_name, level, section)')
          .eq('teacher_id', id)
          .order('day_of_week')
          .order('period'),
      ]);

      setTeacher((profileRes.data as Profile) || null);

      const owned: ClassRow[] = ((ownedClassesRes.data as Class[]) || []).map((c) => ({
        ...c,
        source: 'owner',
      }));
      const assigned: ClassRow[] = ((assignedClassesRes.data as any[]) || [])
        .filter((row) => row.classes)
        .map((row) => ({ ...(row.classes as Class), source: 'assigned' }));
      const merged: ClassRow[] = [];
      const seen = new Set<string>();
      for (const c of [...owned, ...assigned]) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }
      setClasses(merged);

      // Attendance taken by this teacher
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, students(full_name, roll_number), classes(class_name, level, section)')
        .eq('marked_by', id)
        .order('date', { ascending: false })
        .limit(100);
      setAttendance(attendanceData || []);

      setResults(resultsRes.data || []);
      setAnnouncements(announcementsRes.data || []);
      setNotes(notesRes.data || []);
      setCheckins(checkinsRes.data || []);
      setSchedules(schedulesRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Teacher not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const presentCheckins = checkins.filter((c) => c.arrival_status === 'on_time' || c.status === 'present').length;
  const lateCheckins = checkins.filter((c) => c.arrival_status === 'late').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="text-primary font-bold">{teacher.full_name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{teacher.full_name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="font-mono">{teacher.email}</span>
              <Badge variant="outline" className="ml-2">
                <GraduationCap className="h-3 w-3 mr-1" /> Teacher
              </Badge>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{classes.length}</p>
                  <p className="text-sm text-muted-foreground">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><ClipboardList className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{attendance.length}</p>
                  <p className="text-sm text-muted-foreground">Attendance marks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10"><Award className="h-5 w-5 text-purple-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Results uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><CheckCircle2 className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{presentCheckins}</p>
                  <p className="text-sm text-muted-foreground">On-time check-ins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Taken</TabsTrigger>
            <TabsTrigger value="results">Results Uploaded</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins ({checkins.length})</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader><CardTitle>Assigned & Owned Classes</CardTitle></CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No classes assigned.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {classes.map((c) => (
                      <div key={c.id} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{c.class_name || `Class ${c.level}`} - {c.section}</p>
                          <Badge variant={c.source === 'owner' ? 'default' : 'secondary'} className="text-xs">
                            {c.source === 'owner' ? 'Owner' : 'Assigned'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.subject}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Taken by Teacher</CardTitle>
                <CardDescription>Last {attendance.length} records</CardDescription>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No attendance records yet.</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          {a.status === 'present' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                            a.status === 'late' ? <Clock className="h-4 w-4 text-yellow-500" /> :
                            <XCircle className="h-4 w-4 text-red-500" />}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{a.students?.full_name || 'Student'}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {a.classes?.class_name || `Class ${a.classes?.level}`} - {a.classes?.section} • {format(new Date(a.date), 'PP')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={a.status === 'present' ? 'default' : a.status === 'late' ? 'secondary' : 'destructive'}>
                          {a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Exam Results Uploaded</CardTitle>
                <CardDescription>{results.length} entries</CardDescription>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No results uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {results.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {r.students?.full_name || 'Student'} • {r.subject}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.term_name} • {format(new Date(r.created_at), 'PP')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{r.obtained_marks}/{r.total_marks}</Badge>
                          {r.grade && <Badge>{r.grade}</Badge>}
                          {r.is_published && <Badge variant="secondary">Published</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader><CardTitle>Announcements Posted</CardTitle></CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No announcements posted.</p>
                ) : (
                  <div className="space-y-2">
                    {announcements.map((a) => (
                      <div key={a.id} className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{a.title}</p>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {a.classes?.class_name || `Class ${a.classes?.level}`} - {a.classes?.section}
                        </p>
                        <p className="text-sm mt-2 line-clamp-2">{a.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader><CardTitle>Class Notes Created</CardTitle></CardHeader>
              <CardContent>
                {notes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No notes created.</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{n.title}</p>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.classes?.class_name || `Class ${n.classes?.level}`} - {n.classes?.section}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkins">
            <Card>
              <CardHeader>
                <CardTitle>Daily Check-ins</CardTitle>
                <CardDescription>{presentCheckins} on time • {lateCheckins} late</CardDescription>
              </CardHeader>
              <CardContent>
                {checkins.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No check-in records.</p>
                ) : (
                  <div className="space-y-2">
                    {checkins.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <div className="flex items-center gap-3">
                          {c.arrival_status === 'late' ? <AlertCircle className="h-4 w-4 text-yellow-500" /> :
                            <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          <div>
                            <p className="font-medium">{format(new Date(c.date), 'PPP')}</p>
                            <p className="text-xs text-muted-foreground">
                              In: {c.checkin_time ? format(new Date(c.checkin_time), 'p') : '—'}
                              {c.checkout_time && ` • Out: ${format(new Date(c.checkout_time), 'p')}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={c.arrival_status === 'late' ? 'secondary' : 'default'}>{c.arrival_status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader><CardTitle>Weekly Schedule</CardTitle></CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No schedule configured.</p>
                ) : (
                  <div className="space-y-1">
                    {schedules.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">P{s.period}</Badge>
                          <span className="font-mono text-xs">{s.start_time}-{s.end_time}</span>
                          <span>{s.classes?.class_name || `Class ${s.classes?.level}`} - {s.classes?.section}</span>
                          {s.subject && <span className="text-muted-foreground">({s.subject})</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">Day {s.day_of_week}</span>
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
