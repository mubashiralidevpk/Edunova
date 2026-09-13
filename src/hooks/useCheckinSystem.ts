import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { invokeFn, getErrorMessage } from '@/lib/errors';

interface CheckinRecord {
  id: string;
  teacher_id: string;
  checkin_time: string;
  checkout_time: string | null;
  status: string;
  arrival_status: string;
  date: string;
  notes: string | null;
  admin_remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  is_locked: boolean;
  location_coordinates: any;
  teacher_profile?: { full_name: string; email: string };
}

interface ClassImpact {
  id: string;
  date: string;
  teacher_id: string;
  class_id: string;
  period: number;
  subject: string | null;
  time_slot: string | null;
  status: string;
  substitute_teacher_id: string | null;
  approved_by: string | null;
  admin_remarks: string | null;
  classes?: { class_name: string; subject: string };
  teacher_profile?: { full_name: string };
  substitute_profile?: { full_name: string };
}

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

export function useCheckinSystem() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [impacts, setImpacts] = useState<ClassImpact[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchCheckins = useCallback(async (date?: string) => {
    const targetDate = date || today;
    
    const query = supabase
      .from('teacher_checkins')
      .select('*')
      .eq('date', targetDate)
      .order('checkin_time', { ascending: true });

    const { data } = await query;
    
    if (data) {
      // Fetch teacher profiles
      const teacherIds = [...new Set(data.map((c: any) => c.teacher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', teacherIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setCheckins(data.map((c: any) => ({
        ...c,
        teacher_profile: profileMap.get(c.teacher_id),
      })));
    }
  }, [today]);

  const fetchImpacts = useCallback(async (date?: string) => {
    const targetDate = date || today;

    const { data } = await supabase
      .from('class_impacts')
      .select('*, classes:class_id(class_name, subject)')
      .eq('date', targetDate)
      .order('period', { ascending: true });

    if (data) {
      const teacherIds = [...new Set(data.map((i: any) => i.teacher_id))];
      const subIds = [...new Set(data.filter((i: any) => i.substitute_teacher_id).map((i: any) => i.substitute_teacher_id))];
      const allIds = [...new Set([...teacherIds, ...subIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', allIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setImpacts(data.map((i: any) => ({
        ...i,
        teacher_profile: profileMap.get(i.teacher_id),
        substitute_profile: i.substitute_teacher_id ? profileMap.get(i.substitute_teacher_id) : undefined,
      })));
    }
  }, [today]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('system_notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as SystemNotification[]);
    }
  }, [user]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchCheckins(), fetchImpacts(), fetchNotifications()]);
      setLoading(false);
    };
    loadAll();

    // Realtime subscriptions
    const notifChannel = supabase
      .channel('system_notifications_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    const impactChannel = supabase
      .channel('class_impacts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_impacts' }, () => {
        fetchImpacts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(impactChannel);
    };
  }, [fetchCheckins, fetchImpacts, fetchNotifications]);

  const calculateImpact = async () => {
    try {
      const { data, error } = await invokeFn('checkin-impact-engine', {
        body: { action: 'calculate_impact', data: {} },
      });
      if (error) throw error;
      toast({ title: "Impact calculated", description: data.message });
      await Promise.all([fetchCheckins(), fetchImpacts(), fetchNotifications()]);
      return data;
    } catch (error: any) {
      toast({ title: "Failed to calculate impact", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const volunteerForClass = async (impactId: string) => {
    if (!user) return;
    try {
      const { error } = await invokeFn('checkin-impact-engine', {
        body: { action: 'volunteer_replacement', data: { impact_id: impactId } },
      });
      if (error) throw error;
      toast({ title: "Volunteered successfully", description: "Waiting for admin approval." });
      await fetchImpacts();
    } catch (error: any) {
      toast({ title: "Failed to volunteer", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const approveReplacement = async (impactId: string, remarks?: string) => {
    if (!user) return;
    try {
      const { error } = await invokeFn('checkin-impact-engine', {
        body: { action: 'approve_replacement', data: { impact_id: impactId, remarks } },
      });
      if (error) throw error;
      toast({ title: "Replacement approved" });
      await fetchImpacts();
    } catch (error: any) {
      toast({ title: "Failed to approve", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const adminReviewCheckin = async (checkinId: string, newStatus: string, remarks: string) => {
    if (!user) return;
    try {
      const { error } = await invokeFn('checkin-impact-engine', {
        body: { action: 'admin_review_checkin', data: { checkin_id: checkinId, new_status: newStatus, remarks } },
      });
      if (error) throw error;
      toast({ title: "Check-in reviewed" });
      await fetchCheckins();
    } catch (error: any) {
      toast({ title: "Failed to review", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const markNotificationRead = async (notifId: string) => {
    await supabase
      .from('system_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('system_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    checkins,
    impacts,
    notifications,
    loading,
    unreadCount,
    calculateImpact,
    volunteerForClass,
    approveReplacement,
    adminReviewCheckin,
    markNotificationRead,
    markAllRead,
    fetchCheckins,
    fetchImpacts,
    refetch: () => Promise.all([fetchCheckins(), fetchImpacts(), fetchNotifications()]),
  };
}
