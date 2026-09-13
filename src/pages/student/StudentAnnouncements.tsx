import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Student, Announcement } from '@/types/database';
import { useActivityTracking } from '@/hooks/useActivityTracking';

export default function StudentAnnouncements() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());
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
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*')
          .eq('class_id', studentData.class_id)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });

        setAnnouncements((announcementsData as Announcement[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementRead = useCallback((announcement: Announcement) => {
    // Only track once per session
    if (readAnnouncements.has(announcement.id)) return;
    
    setReadAnnouncements(prev => new Set([...prev, announcement.id]));
    trackActivity('announcement_read', announcement.class_id, { 
      announcementId: announcement.id, 
      title: announcement.title 
    });
  }, [readAnnouncements, trackActivity]);

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
          <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with the latest announcements from your teacher.
          </p>
        </div>

        {!student ? (
          <EmptyState
            icon={Bell}
            title="Not enrolled"
            description="You are not enrolled in any class yet. Please contact your teacher or administrator."
          />
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No announcements"
            description="Your teacher hasn't posted any announcements yet. Check back later!"
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} onClick={() => handleAnnouncementRead(announcement)}>
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
                    {new Date(announcement.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
