import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherCheckin, SubstitutionRequest, SubstitutionAssignment } from '@/types/school';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function useTeacherCheckin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todayCheckin, setTodayCheckin] = useState<TeacherCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [substitutionRequests, setSubstitutionRequests] = useState<SubstitutionRequest[]>([]);
  const [myAssignments, setMyAssignments] = useState<SubstitutionAssignment[]>([]);

  const parseCheckinData = (raw: any): TeacherCheckin | null => {
    if (!raw) return null;
    return {
      ...raw,
      status: raw.status as TeacherCheckin['status'],
      location_coordinates: raw.location_coordinates as TeacherCheckin['location_coordinates'],
    };
  };

  const fetchTodayCheckin = useCallback(async () => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data: rawData, error } = await supabase
      .from('teacher_checkins')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!error) {
      setTodayCheckin(parseCheckinData(rawData));
    }
    setLoading(false);
  }, [user]);

  const fetchSubstitutionRequests = useCallback(async () => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    // Get pending requests for today
    const { data: requests } = await supabase
      .from('substitution_requests')
      .select(`
        *,
        class:classes(class_name, subject)
      `)
      .eq('date', today)
      .eq('status', 'pending')
      .order('urgency', { ascending: false });

    if (requests) {
      // Fetch absent teacher profiles separately
      const teacherIds = [...new Set(requests.map(r => r.absent_teacher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', teacherIds);

      const requestsWithProfiles = requests.map(r => ({
        ...r,
        status: r.status as SubstitutionRequest['status'],
        urgency: r.urgency as SubstitutionRequest['urgency'],
        absent_teacher_profile: profiles?.find(p => p.user_id === r.absent_teacher_id),
      })) as SubstitutionRequest[];

      setSubstitutionRequests(requestsWithProfiles);
    }

    // Get my assignments
    const { data: assignments } = await supabase
      .from('substitution_assignments')
      .select('*')
      .eq('substitute_id', user.id);

    if (assignments) {
      setMyAssignments(assignments as SubstitutionAssignment[]);
    }
  }, [user]);

  useEffect(() => {
    fetchTodayCheckin();
    fetchSubstitutionRequests();

    // Subscribe to realtime updates for substitution requests
    const channel = supabase
      .channel('substitution_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'substitution_requests',
        },
        () => {
          fetchSubstitutionRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTodayCheckin, fetchSubstitutionRequests]);

  const checkIn = async (params?: { coordinates?: { lat: number; lng: number } | null; qrToken?: string; gpsVerified?: boolean }) => {
    if (!user) return false;

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const checkInTime = now.toISOString();

    const deadline = new Date();
    deadline.setHours(8, 30, 0, 0);
    const status = now > deadline ? 'late' : 'present';

    try {
      const { data: rawData, error } = await supabase
        .from('teacher_checkins')
        .upsert({
          teacher_id: user.id,
          date: today,
          checkin_time: checkInTime,
          status,
          location_coordinates: (params?.coordinates as any) || null,
          qr_token_used: params?.qrToken || null,
          gps_verified: params?.gpsVerified ?? false,
        }, { onConflict: 'teacher_id,date' })
        .select()
        .single();

      if (error) throw error;

      setTodayCheckin(parseCheckinData(rawData));
      toast({
        title: status === 'late' ? "Checked in (Late)" : "Checked in",
        description: `Verified at ${format(now, 'h:mm a')}`,
      });
      return true;
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast({
        title: "Check-in failed",
        description: error?.message || "Could not complete check-in",
        variant: "destructive",
      });
      return false;
    }
  };

  const checkOut = async () => {
    if (!user || !todayCheckin) return false;

    try {
      const now = new Date();
      const checkoutTime = now.toISOString();
      
      const { data: rawData, error } = await supabase
        .from('teacher_checkins')
        .update({ checkout_time: checkoutTime })
        .eq('id', todayCheckin.id)
        .select()
        .single();

      if (error) throw error;

      setTodayCheckin(parseCheckinData(rawData));
      toast({
        title: "Checked out",
        description: `You checked out at ${format(now, 'h:mm a')}`,
      });

      return true;
    } catch (error) {
      console.error('Check-out error:', error);
      toast({
        title: "Check-out failed",
        variant: "destructive",
      });
      return false;
    }
  };

  const volunteerForSubstitution = async (requestId: string, notes?: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('substitution_assignments')
        .insert({
          request_id: requestId,
          substitute_id: user.id,
          notes,
        });

      if (error) throw error;

      // Update request status
      await supabase
        .from('substitution_requests')
        .update({ status: 'assigned' })
        .eq('id', requestId);

      toast({
        title: "Volunteered successfully",
        description: "You have been assigned to cover this class",
      });

      await fetchSubstitutionRequests();
      return true;
    } catch (error) {
      console.error('Volunteer error:', error);
      toast({
        title: "Could not volunteer",
        description: "Someone may have already taken this slot",
        variant: "destructive",
      });
      return false;
    }
  };

  const rateSubstitution = async (
    assignmentId: string,
    rating: number,
    asSubstitute: boolean
  ) => {
    if (!user) return false;

    try {
      const updateField = asSubstitute ? 'rating_by_substitute' : 'rating_by_regular';
      
      const { error } = await supabase
        .from('substitution_assignments')
        .update({ [updateField]: rating })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({ title: "Rating submitted" });
      return true;
    } catch (error) {
      console.error('Rating error:', error);
      return false;
    }
  };

  return {
    todayCheckin,
    loading,
    substitutionRequests,
    myAssignments,
    checkIn,
    checkOut,
    volunteerForSubstitution,
    rateSubstitution,
    isCheckedIn: !!todayCheckin,
    refetch: () => {
      fetchTodayCheckin();
      fetchSubstitutionRequests();
    },
  };
}
