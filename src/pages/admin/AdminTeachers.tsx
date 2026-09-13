import { useState, useEffect } from 'react';
import { GraduationCap, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Profile, UserRole } from '@/types/database';

export default function AdminTeachers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase.from('profiles').select('*');
      const { data: rolesData } = await supabase.from('user_roles').select('*');
      setProfiles((profilesData as Profile[]) || []);
      setUserRoles((rolesData as UserRole[]) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teacher: Profile) => {
    setDeletingId(teacher.user_id);
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
            steps: [{ id: 1, type: 'delete_teacher', label: `Delete ${teacher.email}`, params: { email: teacher.email } }],
          }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Delete failed');
      }
      // Drain SSE so the request completes
      const reader = resp.body?.getReader();
      if (reader) { while (true) { const { done } = await reader.read(); if (done) break; } }

      toast({ title: 'Teacher deleted', description: teacher.full_name });
      await fetchData();
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const teachers = profiles.filter(p => userRoles.some(r => r.user_id === p.user_id && r.role === 'teacher'));

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading teachers...</div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Teachers</h1>
        {teachers.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No teachers" description="No teachers have registered yet." />
        ) : (
          <Card>
            <CardHeader><CardTitle>All Teachers ({teachers.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{teacher.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{teacher.email}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingId === teacher.user_id}>
                          {deletingId === teacher.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete teacher?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>{teacher.full_name}</strong> ({teacher.email}), their profile, role and login. Classes they own will become orphaned. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(teacher)} className="bg-destructive hover:bg-destructive/90">
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
