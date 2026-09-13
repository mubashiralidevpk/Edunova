import { useEffect, useState } from 'react';
import { Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Class } from '@/types/database';
import { getErrorMessage } from '@/lib/errors';

interface ParsedStudent {
  full_name: string;
  father_name?: string;
  roll_number?: string;
  mobile?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
}

export function AIBulkAddStudents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [classId, setClassId] = useState('');
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [parsed, setParsed] = useState<ParsedStudent[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('level')
      .then(({ data }) => setClasses((data as Class[]) || []));
  }, [user]);

  const parseList = () => {
    if (!text.trim()) return;
    setParsing(true);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const out: ParsedStudent[] = [];
    for (const line of lines) {
      // Drop leading numbering: "1.", "1)", "-"
      const cleaned = line.replace(/^\s*(\d+[\.\)]|[-*])\s*/, '');
      // Split by tab, semicolon, pipe, or comma
      const parts = cleaned.split(/\s*[\t;|,]\s*/);
      const [name, father, roll, mobile, email, dob] = parts;
      if (!name) continue;
      out.push({
        full_name: name.trim(),
        father_name: father?.trim() || undefined,
        roll_number: roll?.trim() || undefined,
        mobile: mobile?.trim() || undefined,
        email: email?.trim() || undefined,
        date_of_birth: dob?.trim() || undefined,
      });
    }
    setParsed(out);
    setParsing(false);
    if (out.length === 0) toast({ title: 'Could not parse any rows', variant: 'destructive' });
  };

  const confirmInsert = async () => {
    if (!classId || !parsed?.length) return;
    setInserting(true);
    const { data, error } = await supabase.rpc('bulk_insert_students', {
      _class_id: classId,
      _students: parsed as unknown as never,
    });
    setInserting(false);
    if (error) {
      toast({ title: 'Insert failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    const result = data as { inserted: number; skipped: number } | null;
    toast({ title: `Added ${result?.inserted ?? 0} students`, description: result?.skipped ? `${result.skipped} skipped` : undefined });
    setParsed(null);
    setText('');
  };

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wand2 className="h-5 w-5" /> Bulk add students from list
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Target class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Select your class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.class_name || `Class ${c.level} - ${c.section}`} ({c.subject})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Paste list (one student per line; commas / tabs separate fields)</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={`Ali Khan, Ahmed Khan, 1, 03001234567\nHamza Raza, Bilal Raza, 2`}
          />
          <p className="text-xs text-muted-foreground">
            Order: Name, Father, Roll, Mobile, Email, DOB (YYYY-MM-DD). Father, roll and rest are optional.
          </p>
        </div>
        <Button onClick={parseList} disabled={parsing || !text.trim()} className="gap-2">
          {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Parse
        </Button>

        {parsed && parsed.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Father</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Mobile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell>{p.father_name || '—'}</TableCell>
                      <TableCell>{p.roll_number || 'auto'}</TableCell>
                      <TableCell>{p.mobile || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={confirmInsert} disabled={inserting || !classId} className="w-full gap-2">
              {inserting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm and add {parsed.length} students
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
