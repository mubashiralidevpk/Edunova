import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const ALL_STAFF_ROLES = [
  'Staff',
  'Head',
  'Principal',
  'Vice Principal',
  'Event Manager',
  'IT Expert',
  'Funds Manager',
  'Admission Manager',
  'Exam Manager',
] as const;

export type StaffRole = (typeof ALL_STAFF_ROLES)[number];

/** Roles held by the signed-in user (multi-role aware). */
export function useStaffRoles() {
  const { user, profile, role } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('staff_role_assignments')
        .select('staff_role')
        .eq('user_id', user.id);

      if (cancelled) return;
      const list = (data || []).map((r) => r.staff_role as string);
      if (profile?.staff_role && !list.includes(profile.staff_role)) list.push(profile.staff_role);
      setRoles(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.staff_role]);

  const isAdmin = role === 'admin';
  const has = (r: string) => roles.includes(r);

  return {
    roles,
    loading,
    isAdmin,
    has,
    isAdmissionManager:
      isAdmin || has('Admission Manager') || has('Principal') || has('Vice Principal'),
    isExamManager: isAdmin || has('Exam Manager') || has('Principal') || has('Vice Principal'),
  };
}

/** Roles for any given user id (admin views). */
export async function fetchStaffRoles(userIds: string[]) {
  if (userIds.length === 0) return {} as Record<string, string[]>;
  const { data } = await supabase
    .from('staff_role_assignments')
    .select('user_id, staff_role')
    .in('user_id', userIds);
  const map: Record<string, string[]> = {};
  (data || []).forEach((r: any) => {
    map[r.user_id] = [...(map[r.user_id] || []), r.staff_role];
  });
  return map;
}
