import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bell, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Class, Announcement, ClassNote, Student } from '@/types/database';

export default function StudentClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [classData, setClassData] = useState<Class | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notes, setNotes] = useState<ClassNote[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    try {
      // Check enrollment
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_id', id)
        .maybeSingle();

      setIsEnrolled(!!studentData);

      if (!studentData) {
        setLoading(false);
        return;
      }

      // Fetch class
      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      setClassData(cls as Class);

      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('class_id', id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      setAnnouncements((announcementsData as Announcement[]) || []);

      // Fetch notes
      const { data: notesData } = await supabase
        .from('class_notes')
        .select('*')
        .eq('class_id', id)
        .order('created_at', { ascending: false });

      setNotes((notesData as ClassNote[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isEnrolled) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You are not enrolled in this class.</p>
          <Link to="/student/classes">
            <Button variant="outline" className="mt-4">Back to Classes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!classData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Class not found.</p>
          <Link to="/student/classes">
            <Button variant="outline" className="mt-4">Back to Classes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/student/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{classData.class_name}</h1>
            <p className="text-muted-foreground">{classData.subject}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="announcements" className="space-y-4">
          <TabsList>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="announcements">
            {announcements.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No announcements"
                description="Your teacher hasn't posted any announcements yet."
              />
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        {announcement.is_pinned && (
                          <span className="text-xs bg-aksms-gold/20 text-aksms-gold px-2 py-1 rounded">
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes">
            {notes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No notes"
                description="Your teacher hasn't shared any notes yet."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {notes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
