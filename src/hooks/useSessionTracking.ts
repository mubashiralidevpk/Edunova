 import { useEffect, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 
 export function useSessionTracking() {
   const { user, role } = useAuth();
   const sessionIdRef = useRef<string | null>(null);
   const isTrackingRef = useRef(false);
 
   useEffect(() => {
     // Only track for students
     if (!user || role !== 'student') return;
 
     const startSession = async () => {
       if (isTrackingRef.current) return;
       isTrackingRef.current = true;
 
       try {
         // Get the student record for this user
         const { data: student } = await supabase
           .from('students')
           .select('id')
           .eq('user_id', user.id)
           .single();
 
         if (!student) {
           isTrackingRef.current = false;
           return;
         }
 
         // Create a new session
         const { data: session, error } = await supabase
           .from('student_sessions')
           .insert({
             student_id: student.id,
             started_at: new Date().toISOString(),
           })
           .select()
           .single();
 
         if (error) {
           console.error('Error starting session:', error);
           isTrackingRef.current = false;
           return;
         }
 
         sessionIdRef.current = session.id;
 
         // Also log a login activity
         await supabase
           .from('student_activity')
           .insert({
             student_id: student.id,
             activity_type: 'login',
           });
       } catch (error) {
         console.error('Error in session tracking:', error);
         isTrackingRef.current = false;
       }
     };
 
     const endSession = async () => {
       if (!sessionIdRef.current) return;
 
       try {
         await supabase
           .from('student_sessions')
           .update({
             ended_at: new Date().toISOString(),
           })
           .eq('id', sessionIdRef.current);
 
         sessionIdRef.current = null;
       } catch (error) {
         console.error('Error ending session:', error);
       }
     };
 
     startSession();
 
     // Handle page visibility changes
     const handleVisibilityChange = () => {
       if (document.visibilityState === 'hidden') {
         endSession();
       } else if (document.visibilityState === 'visible' && !sessionIdRef.current) {
         isTrackingRef.current = false;
         startSession();
       }
     };
 
     // Handle page unload
     const handleBeforeUnload = () => {
       if (sessionIdRef.current) {
         // Use sendBeacon for reliable session end
         const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/student_sessions?id=eq.${sessionIdRef.current}`;
         navigator.sendBeacon(url, JSON.stringify({ ended_at: new Date().toISOString() }));
       }
     };
 
     document.addEventListener('visibilitychange', handleVisibilityChange);
     window.addEventListener('beforeunload', handleBeforeUnload);
 
     return () => {
       document.removeEventListener('visibilitychange', handleVisibilityChange);
       window.removeEventListener('beforeunload', handleBeforeUnload);
       endSession();
     };
   }, [user, role]);
 
   return sessionIdRef.current;
 }