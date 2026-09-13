import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Class } from '@/types/database';

/**
 * Returns ALL classes a teacher should see:
 *   - Classes they own (classes.teacher_id == user.id)
 *   - Classes assigned to them via class_teachers (status accepted)
 */
export function useTeacherClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    if (!user) {
      setClasses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ownedRes, assignedRes] = await Promise.all([
        supabase.from('classes').select('*').eq('teacher_id', user.id),
        supabase
          .from('class_teachers')
          .select('class_id, classes:class_id(*)')
          .eq('teacher_id', user.id)
          .eq('invitation_status', 'accepted'),
      ]);

      const owned = (ownedRes.data || []) as Class[];
      const assigned = ((assignedRes.data || []) as any[])
        .map((r) => r.classes)
        .filter(Boolean) as Class[];

      const map = new Map<string, Class>();
      [...owned, ...assigned].forEach((c) => map.set(c.id, c));
      const merged = Array.from(map.values()).sort((a, b) =>
        (a.class_name || '').localeCompare(b.class_name || '')
      );
      setClasses(merged);
    } catch (e) {
      console.error('useTeacherClasses error:', e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, refetch: fetchClasses };
}
