import { useEffect, useState } from 'react';
import { Plus, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Class } from '@/types/database';
import { getErrorMessage } from '@/lib/errors';

interface ClassRow extends Class { school_id: string | null }

export default function GenerateDummyStudents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('classes')
      .select('*')
      .eq('level', 10)
      .order('section')
      .then(({ data }) => setClasses((data as ClassRow[]) || []));
  }, [user]);

  const handleGenerate = async () => {
    if (!classId) {
      toast({ title: 'Pick a class first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('generate_dummy_students', {
      _class_id: classId,
      _count: count,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    const inserted = (data as { inserted?: number } | null)?.inserted ?? 0;
    toast({ title: `Generated ${inserted} dummy students` });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Generate Dummy Students</h1>
          <p className="text-muted-foreground mt-1">For testing only. Adds random students to a Class 10 section.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Dummy data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Class 10 section</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder={classes.length ? 'Select section' : 'No Class 10 sections found'} />
                </SelectTrigger>
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
              <Label>How many?</Label>
              <Input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <Button className="gap-2 w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
