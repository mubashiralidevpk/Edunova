 import { useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
 
 type ActivityType = 'note_viewed' | 'announcement_read' | 'message_sent' | 'login';
 
 export function useActivityTracking() {
   const { user, role } = useAuth();
 
   const trackActivity = useCallback(async (
     activityType: ActivityType,
     classId?: string,
    metadata?: Json
   ) => {
     // Only track for students
     if (!user || role !== 'student') return;
 
     try {
       // Get the student record for this user
       const { data: student } = await supabase
         .from('students')
         .select('id')
         .eq('user_id', user.id)
         .single();
 
       if (!student) return;
 
      await supabase
        .from('student_activity')
        .insert([{
          student_id: student.id,
          activity_type: activityType,
          class_id: classId || null,
          metadata: metadata || null,
        }]);
     } catch (error) {
       console.error('Error tracking activity:', error);
     }
   }, [user, role]);
 
   return { trackActivity };
 }