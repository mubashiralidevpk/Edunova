import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Class } from '@/types/database';

export default function AdminClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('level');
    setClasses((data as Class[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleDelete = async (cls: Class) => {
    setDeletingId(cls.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            steps: [{ id: 1, type: 'delete_class', label: `Delete ${cls.level}-${cls.section}`,
              params: { class_level: cls.level, class_section: cls.section } }],
          }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Delete failed');
      }
      const reader = resp.body?.getReader();
      if (reader) { while (true) { const { done } = await reader.read(); if (done) break; } }
      toast({ title: 'Class deleted', description: `${cls.level}-${cls.section} (${cls.subject})` });
      await fetchClasses();
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading...</div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">Classes</h1>
          <Link to="/admin/classes/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </Link>
        </div>
        {classes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No classes"
            description="No classes have been created yet. Create one to get started."
            action={
              <Link to="/admin/classes/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Class
                </Button>
              </Link>
            }
          />
        ) : (
          <Card>
            <CardHeader><CardTitle>All Classes ({classes.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y">
                {classes.map((cls) => (
                  <div key={cls.id} className="py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {cls.class_name || `Class ${cls.level}-${cls.section}`}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        Level {cls.level} · Section {cls.section} · {cls.subject}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingId === cls.id}>
                          {deletingId === cls.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete class?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete class <strong>{cls.level}-{cls.section} ({cls.subject})</strong> along with ALL its students and announcements. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(cls)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
