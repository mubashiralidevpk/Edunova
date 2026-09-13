import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Search, Loader2, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PageMeta from '@/components/seo/PageMeta';
import { getErrorMessage } from '@/lib/errors';
import { PageFooter } from '@/components/layout/PageFooter';

interface SchoolRow { id: string; name: string }
interface ResultRow {
  id: string; term_name: string; subject: string;
  total_marks: number; obtained_marks: number;
  grade: string | null; remarks: string | null;
  student_name: string; roll_number: string; student_code: string;
  class_name: string | null; class_level: number; class_section: string;
}

export default function ResultsPortalPage() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [level, setLevel] = useState('');
  const [section, setSection] = useState('');
  const [roll, setRoll] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('list_result_portal_schools');
      if (!error) setSchools((data as SchoolRow[]) || []);
    })();
  }, []);

  const search = async () => {
    if (!schoolId || !level || !section || !roll) {
      toast({ title: 'Fill in all fields', variant: 'destructive' });
      return;
    }
    setSearching(true);
    setResults(null);
    const { data, error } = await supabase.rpc('search_published_results', {
      p_school_id: schoolId,
      p_level: parseInt(level, 10),
      p_section: section,
      p_roll: roll,
    });
    setSearching(false);
    if (error) {
      toast({ title: 'Search failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    setResults((data as ResultRow[]) || []);
  };

  const grouped = results ? results.reduce<Record<string, ResultRow[]>>((acc, r) => {
    (acc[r.term_name] ||= []).push(r); return acc;
  }, {}) : {};

  const student = results && results[0];

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold tracking-wider text-sm">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            <span className="font-bold tracking-wider">RESULT PORTAL</span>
          </div>
        </div>
      </header>

      <main className="container py-10 space-y-6 max-w-3xl">
        <PageMeta
          title="Check Student Results | Edunova Result Portal"
          description="Find your child's published exam results. Select the school, class, and roll number — no sign-in required."
          path="/results"
        />
        <h1 className="sr-only">Public Student Results Portal</h1>
        <h2 className="sr-only">Search for published results</h2>
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Find Your Child's Results</CardTitle>
            <CardDescription>Enter school, class & roll number — no sign-in required. Only published results are shown.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger><SelectValue placeholder={schools.length ? 'Select school' : 'No schools have enabled the portal yet'} /></SelectTrigger>
                <SelectContent>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Class level</Label>
                <Input type="number" min={1} max={12} value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. 8" />
              </div>
              <div>
                <Label className="text-xs">Section</Label>
                <Input value={section} onChange={e => setSection(e.target.value)} placeholder="A" maxLength={1} />
              </div>
              <div>
                <Label className="text-xs">Roll number</Label>
                <Input value={roll} onChange={e => setRoll(e.target.value)} placeholder="e.g. 12" />
              </div>
            </div>
            <Button onClick={search} disabled={searching} className="w-full gap-2">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Results
            </Button>
          </CardContent>
        </Card>

        {results !== null && results.length === 0 && (
          <Card className="glass-card border-border">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No published results found for that class & roll number.
            </CardContent>
          </Card>
        )}

        {student && (
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle>{student.student_name}</CardTitle>
              <CardDescription className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline">Roll {student.roll_number}</Badge>
                <Badge variant="outline">{student.student_code}</Badge>
                <Badge variant="outline">{student.class_name || `Class ${student.class_level}-${student.class_section}`}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(grouped).map(([term, rows]) => {
                const total = rows.reduce((a, r) => a + r.total_marks, 0);
                const obt = rows.reduce((a, r) => a + r.obtained_marks, 0);
                const pct = total > 0 ? ((obt / total) * 100).toFixed(1) : '0';
                return (
                  <div key={term}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-primary">{term}</h3>
                      <span className="text-xs font-mono">{obt}/{total} • {pct}%</span>
                    </div>
                    <div className="rounded border border-border overflow-hidden text-sm">
                      <table className="w-full">
                        <thead className="bg-muted/40 text-xs">
                          <tr><th className="text-left p-2">Subject</th><th className="text-right p-2">Marks</th><th className="text-center p-2">Grade</th></tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.id} className="border-t border-border">
                              <td className="p-2">{r.subject}</td>
                              <td className="p-2 text-right font-mono">{r.obtained_marks}/{r.total_marks}</td>
                              <td className="p-2 text-center"><Badge variant="outline">{r.grade || '—'}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {schools.length === 0 && results === null && (
          <Card className="glass-card border-border">
            <CardContent className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <School className="h-4 w-4" /> No schools have enabled the public Result Portal yet.
            </CardContent>
          </Card>
        )}
      </main>
      <PageFooter />
    </div>
  );
}
