import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Parent, ParentStudent, ParentNotification, StudentResult } from '@/types/school';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

interface ChildSnapshot {
  student_id: string;
  full_name: string;
  class_name: string;
  today_attendance: 'present' | 'absent' | 'late' | 'not_marked';
  upcoming_assignments: number;
  unread_announcements: number;
  attendance_percentage: number;
  recent_grades: { subject: string; score: number; max_score: number }[];
}

export function useParentPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [parent, setParent] = useState<Parent | null>(null);
  const [children, setChildren] = useState<ParentStudent[]>([]);
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [childSnapshots, setChildSnapshots] = useState<Record<string, ChildSnapshot>>({});
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParentProfile = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('parents')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setParent(data as Parent | null);
    return data;
  }, [user]);

  const fetchChildren = useCallback(async () => {
    if (!user) return;

    const { data: parentData } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!parentData) return;

    const { data } = await supabase
      .from('parent_students')
      .select(`
        *,
        student:students(
          id,
          full_name,
          roll_number,
          class_id,
          class:classes(class_name, subject)
        )
      `)
      .eq('parent_id', parentData.id);

    const typedData = (data || []).map(c => ({
      ...c,
      relationship: c.relationship as ParentStudent['relationship'],
    })) as ParentStudent[];

    setChildren(typedData);
    return typedData;
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data: parentData } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!parentData) return;

    const { data } = await supabase
      .from('parent_notifications')
      .select('*')
      .eq('parent_id', parentData.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    const typedData = (data || []).map(n => ({
      ...n,
      notification_type: n.notification_type as ParentNotification['notification_type'],
    })) as ParentNotification[];

    setNotifications(typedData);
  }, [user]);

  const fetchChildSnapshot = useCallback(async (studentId: string) => {
    // Fetch student info
    const { data: student } = await supabase
      .from('students')
      .select('full_name, class_id, class:classes(class_name)')
      .eq('id', studentId)
      .single();

    if (!student) return null;

    const today = format(new Date(), 'yyyy-MM-dd');

    // Today's attendance
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .eq('date', today)
      .maybeSingle();

    // Upcoming assignments (next 7 days)
    const sevenDaysLater = format(subDays(new Date(), -7), 'yyyy-MM-dd');
    const { data: upcomingAssignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('class_id', student.class_id)
      .eq('is_published', true)
      .gte('due_date', today)
      .lte('due_date', sevenDaysLater);

    // Recent grades (last 5)
    const { data: recentGrades } = await supabase
      .from('student_grades')
      .select(`
        score,
        assignment:assignments(title, max_score, class:classes(subject))
      `)
      .eq('student_id', studentId)
      .not('score', 'is', null)
      .order('graded_at', { ascending: false })
      .limit(5);

    // Attendance percentage (last 30 days)
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .gte('date', thirtyDaysAgo);

    const totalDays = attendanceRecords?.length || 0;
    const presentDays = attendanceRecords?.filter(a => 
      a.status === 'present' || a.status === 'late'
    ).length || 0;

    const snapshot: ChildSnapshot = {
      student_id: studentId,
      full_name: student.full_name,
      class_name: (student.class as any)?.class_name || 'Unknown',
      today_attendance: (todayAttendance?.status as ChildSnapshot['today_attendance']) || 'not_marked',
      upcoming_assignments: upcomingAssignments?.length || 0,
      unread_announcements: 0, // Would need to track read status
      attendance_percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      recent_grades: recentGrades?.map(g => ({
        subject: (g.assignment as any)?.class?.subject || 'Unknown',
        score: g.score || 0,
        max_score: (g.assignment as any)?.max_score || 100,
      })) || [],
    };

    setChildSnapshots(prev => ({ ...prev, [studentId]: snapshot }));
    return snapshot;
  }, []);

  const fetchResults = useCallback(async (studentId: string) => {
    const { data } = await supabase
      .from('student_results')
      .select(`
        *,
        term:exam_terms(*)
      `)
      .eq('student_id', studentId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    setResults((data || []) as StudentResult[]);
    return (data || []) as StudentResult[];
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchParentProfile();
      const childrenData = await fetchChildren();
      await fetchNotifications();
      
      // Fetch snapshots for all children
      if (childrenData) {
        await Promise.all(
          childrenData.map(c => fetchChildSnapshot((c.student as any)?.id))
        );
      }
      
      setLoading(false);
    };

    init();

    // Subscribe to notifications
    if (user) {
      const channel = supabase
        .channel('parent_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'parent_notifications',
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchParentProfile, fetchChildren, fetchNotifications, fetchChildSnapshot]);

  const markNotificationRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('parent_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (!error) {
      await fetchNotifications();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    parent,
    children,
    notifications,
    childSnapshots,
    results,
    loading,
    unreadCount,
    markNotificationRead,
    fetchResults,
    refetchSnapshot: fetchChildSnapshot,
    refetch: () => {
      fetchParentProfile();
      fetchChildren();
      fetchNotifications();
    },
  };
}
