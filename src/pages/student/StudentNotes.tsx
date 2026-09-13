import { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Student, ClassNote } from '@/types/database';
import { useActivityTracking } from '@/hooks/useActivityTracking';

export default function StudentNotes() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState<ClassNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedNotes, setViewedNotes] = useState<Set<string>>(new Set());
  const { trackActivity } = useActivityTracking();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setStudent(studentData as Student | null);

      if (studentData?.class_id) {
        const { data: notesData } = await supabase
          .from('class_notes')
          .select('*')
          .eq('class_id', studentData.class_id)
          .order('created_at', { ascending: false });

        setNotes((notesData as ClassNote[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoteView = useCallback((note: ClassNote) => {
    // Only track once per session
    if (viewedNotes.has(note.id)) return;
    
    setViewedNotes(prev => new Set([...prev, note.id]));
    trackActivity('note_viewed', note.class_id, { noteId: note.id, title: note.title });
  }, [viewedNotes, trackActivity]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Class Notes</h1>
          <p className="text-muted-foreground mt-1">
            Access study materials and notes shared by your teacher.
          </p>
        </div>

        {!student ? (
          <EmptyState
            icon={FileText}
            title="Not enrolled"
            description="You are not enrolled in any class yet. Please contact your teacher or administrator."
          />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No notes available"
            description="Your teacher hasn't shared any notes yet. Check back later!"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {notes.map((note) => (
              <Card key={note.id} onClick={() => handleNoteView(note)}>
                <CardHeader>
                  <CardTitle className="text-lg">{note.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
