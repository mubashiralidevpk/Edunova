import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ScanLine, Upload, Loader2, CheckCircle2, XCircle, FileImage, RefreshCw,
  Plus, Eye, EyeOff, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { invokeFn, getErrorMessage } from '@/lib/errors';

interface UploadRow {
  id: string; class_id: string; subject: string | null; image_url: string;
  ocr_status: string; parsed_results: any[]; ocr_raw_text: string | null;
  error_message: string | null; created_at: string;
}

interface Student { id: string; full_name: string; roll_number: string }

interface ResultRow {
  id: string; student_id: string; class_id: string; term_name: string;
  subject: string; total_marks: number; obtained_marks: number;
  grade: string | null; remarks: string | null; is_published: boolean;
}

function calcGrade(pct: number) {
  if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
  if (pct >= 70) return 'B'; if (pct >= 60) return 'C';
  if (pct >= 50) return 'D'; return 'F';
}

export default function TeacherResults() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { classes } = useTeacherClasses();

  // Shared
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [termName, setTermName] = useState('');

  // Manual entry
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [totalMarks, setTotalMarks] = useState('100');
  const [savingManual, setSavingManual] = useState(false);

  // Results browse
  const [results, setResults] = useState<(ResultRow & { student?: Student })[]>([]);

  // OCR
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadUploads = async () => {
    if (!user) return;
    const { data } = await supabase.from('result_uploads').select('*')
      .eq('teacher_id', user.id).order('created_at', { ascending: false }).limit(50);
    setUploads((data as UploadRow[]) || []);
  };

  useEffect(() => { loadUploads(); }, [user]);

  // Load students + results when class chosen
  useEffect(() => {
    if (!classId) { setStudents([]); setResults([]); return; }
    (async () => {
      const [{ data: stu }, { data: res }] = await Promise.all([
        supabase.from('students').select('id, full_name, roll_number').eq('class_id', classId).order('roll_number'),
        supabase.from('student_exam_results').select('*').eq('class_id', classId).order('created_at', { ascending: false }),
      ]);
      const list = (stu as Student[]) || [];
      setStudents(list);
      const map = Object.fromEntries(list.map(s => [s.id, s]));
      setResults(((res as ResultRow[]) || []).map(r => ({ ...r, student: map[r.student_id] })));
    })();
  }, [classId]);

  const saveManual = async () => {
    if (!user || !classId || !subject || !termName) {
      toast({ title: 'Pick class, term & subject', variant: 'destructive' }); return;
    }
    const total = parseInt(totalMarks, 10) || 100;
    const rowsToInsert = students
      .filter(s => marks[s.id] && marks[s.id].trim() !== '')
      .map(s => {
        const obt = Math.max(0, Math.min(total, Number(marks[s.id])));
        return {
          student_id: s.id, class_id: classId, teacher_id: user.id,
          term_name: termName, subject, total_marks: total,
          obtained_marks: obt, grade: calcGrade((obt / total) * 100),
          is_published: false,
        };
      });
    if (rowsToInsert.length === 0) {
      toast({ title: 'Enter marks for at least one student', variant: 'destructive' }); return;
    }
    setSavingManual(true);
    const { error } = await supabase.from('student_exam_results').insert(rowsToInsert);
    setSavingManual(false);
    if (error) { toast({ title: 'Failed to save', description: getErrorMessage(error), variant: 'destructive' }); return; }
    toast({ title: `Saved ${rowsToInsert.length} results (unpublished)` });
    setMarks({});
    // refresh results
    const { data: res } = await supabase.from('student_exam_results').select('*').eq('class_id', classId).order('created_at', { ascending: false });
    const map = Object.fromEntries(students.map(s => [s.id, s]));
    setResults(((res as ResultRow[]) || []).map(r => ({ ...r, student: map[r.student_id] })));
  };

  const togglePublish = async (r: ResultRow) => {
    const { error } = await supabase.from('student_exam_results')
      .update({ is_published: !r.is_published }).eq('id', r.id);
    if (error) { toast({ title: 'Failed', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setResults(prev => prev.map(x => x.id === r.id ? { ...x, is_published: !r.is_published } : x));
  };

  const publishAll = async () => {
    const ids = results.filter(r => !r.is_published).map(r => r.id);
    if (ids.length === 0) { toast({ title: 'Nothing to publish' }); return; }
    const { error } = await supabase.from('student_exam_results')
      .update({ is_published: true }).in('id', ids);
    if (error) { toast({ title: 'Failed', description: getErrorMessage(error), variant: 'destructive' }); return; }
    toast({ title: `Published ${ids.length} results` });
    setResults(prev => prev.map(x => ids.includes(x.id) ? { ...x, is_published: true } : x));
  };

  const deleteResult = async (id: string) => {
    if (!confirm('Delete this result?')) return;
    const { error } = await supabase.from('student_exam_results').delete().eq('id', id);
    if (error) { toast({ title: 'Failed', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setResults(prev => prev.filter(x => x.id !== id));
  };

  const upload = async () => {
    if (!user || !file || !classId) { toast({ title: 'Pick a class and image', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('result-uploads').upload(path, file);
      if (upErr) throw upErr;
      const { data: row, error: insErr } = await supabase.from('result_uploads').insert({
        teacher_id: user.id, class_id: classId, subject: subject || null, image_url: path,
      }).select().single();
      if (insErr) throw insErr;
      toast({ title: 'Uploaded — running OCR…' });
      setFile(null); await loadUploads();
      setProcessing(row.id);
      const { error: fnErr } = await invokeFn('result-ocr', { body: { upload_id: row.id } });
      setProcessing(null);
      if (fnErr) throw fnErr;
      toast({ title: 'OCR complete ✓' }); await loadUploads();
    } catch (e: any) {
      setProcessing(null);
      toast({ title: 'Upload/OCR failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setUploading(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" /> Exam Results
          </h1>
          <p className="text-muted-foreground text-sm">Enter marks manually or scan a result sheet with AI.</p>
        </div>

        <Card className="glass-card border-border">
          <CardContent className="p-4 grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.class_name || `Class ${c.level}-${c.section}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Term</Label>
              <Input value={termName} onChange={e => setTermName(e.target.value)} placeholder="e.g. First Term 2026" />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual"><Plus className="h-3 w-3 mr-1" /> Manual Entry</TabsTrigger>
            <TabsTrigger value="results">All Results</TabsTrigger>
            <TabsTrigger value="ocr"><ScanLine className="h-3 w-3 mr-1" /> AI OCR Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-3 mt-4">
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Enter marks per student</CardTitle>
                <CardDescription>Saved as <b>Unpublished</b> — publish them when ready.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-3 max-w-xs">
                  <div className="flex-1">
                    <Label className="text-xs">Total Marks</Label>
                    <Input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
                  </div>
                </div>

                {!classId ? (
                  <p className="text-sm text-muted-foreground">Choose a class above to load students.</p>
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students in this class yet.</p>
                ) : (
                  <div className="rounded border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs">
                        <tr>
                          <th className="text-left p-2">Roll</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-right p-2">Obtained / {totalMarks || 100}</th>
                          <th className="text-center p-2">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => {
                          const v = marks[s.id] || '';
                          const num = Number(v);
                          const tot = parseInt(totalMarks, 10) || 100;
                          const grade = v !== '' && !isNaN(num) ? calcGrade((num / tot) * 100) : '—';
                          return (
                            <tr key={s.id} className="border-t border-border">
                              <td className="p-2 font-mono text-xs">{s.roll_number}</td>
                              <td className="p-2">{s.full_name}</td>
                              <td className="p-2 text-right">
                                <Input
                                  type="number" min={0} max={parseInt(totalMarks, 10) || 100}
                                  value={v}
                                  onChange={e => setMarks(m => ({ ...m, [s.id]: e.target.value }))}
                                  className="w-24 ml-auto h-8"
                                />
                              </td>
                              <td className="p-2 text-center"><Badge variant="outline">{grade}</Badge></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button onClick={saveManual} disabled={savingManual || !classId} className="gap-2">
                  {savingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Save Results
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-3 mt-4">
            <Card className="glass-card border-border">
              <CardHeader className="flex-row flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Class Results</CardTitle>
                  <CardDescription>{results.length} record(s)</CardDescription>
                </div>
                <Button size="sm" onClick={publishAll} disabled={!classId} className="gap-1">
                  <Eye className="h-3 w-3" /> Publish All
                </Button>
              </CardHeader>
              <CardContent>
                {!classId ? (
                  <p className="text-sm text-muted-foreground">Choose a class above.</p>
                ) : results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No results saved yet.</p>
                ) : (
                  <div className="rounded border border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs">
                        <tr>
                          <th className="text-left p-2">Student</th>
                          <th className="text-left p-2">Term</th>
                          <th className="text-left p-2">Subject</th>
                          <th className="text-right p-2">Marks</th>
                          <th className="text-center p-2">Grade</th>
                          <th className="text-center p-2">Status</th>
                          <th className="text-center p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map(r => (
                          <tr key={r.id} className="border-t border-border">
                            <td className="p-2">{r.student?.full_name || '—'}<span className="text-xs text-muted-foreground ml-1">#{r.student?.roll_number}</span></td>
                            <td className="p-2">{r.term_name}</td>
                            <td className="p-2">{r.subject}</td>
                            <td className="p-2 text-right font-mono">{r.obtained_marks}/{r.total_marks}</td>
                            <td className="p-2 text-center"><Badge variant="outline">{r.grade || '—'}</Badge></td>
                            <td className="p-2 text-center">
                              <Badge variant={r.is_published ? 'default' : 'outline'}>
                                {r.is_published ? 'Published' : 'Draft'}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              <Button size="icon" variant="ghost" onClick={() => togglePublish(r)} title={r.is_published ? 'Unpublish' : 'Publish'}>
                                {r.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteResult(r.id)} title="Delete">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ocr" className="space-y-3 mt-4">
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Upload Result Sheet</CardTitle>
                <CardDescription>JPG/PNG of a printed/handwritten result sheet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                <Button onClick={upload} disabled={uploading || !file || !classId} className="gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload & Run OCR
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h2 className="font-semibold text-sm">Recent uploads</h2>
              {uploads.length === 0 && (
                <Card className="glass-card border-border"><CardContent className="p-6 text-center text-sm text-muted-foreground">No uploads yet</CardContent></Card>
              )}
              {uploads.map(u => (
                <Card key={u.id} className="glass-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{u.subject || 'Result sheet'}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {classes.find(c => c.id === u.class_id)?.class_name || 'Class'}
                        </Badge>
                        <StatusBadge status={u.ocr_status} />
                      </div>
                    </div>
                    {u.error_message && <p className="text-xs text-destructive">{u.error_message}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; i: any; t: string }> = {
    pending:    { c: 'bg-muted text-muted-foreground', i: Loader2, t: 'Pending' },
    processing: { c: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', i: Loader2, t: 'Processing' },
    done:       { c: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', i: CheckCircle2, t: 'OCR Done' },
    failed:     { c: 'bg-destructive/20 text-destructive border-destructive/30', i: XCircle, t: 'Failed' },
    reviewed:   { c: 'bg-primary/20 text-primary border-primary/30', i: CheckCircle2, t: 'Reviewed' },
  };
  const m = map[status] || map.pending;
  const I = m.i;
  return <Badge variant="outline" className={`text-[10px] gap-1 ${m.c}`}><I className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />{m.t}</Badge>;
}
