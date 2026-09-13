import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentClassRole, StudentRole } from '@/types/learning';
import { Student } from '@/types/database';

interface StudentWithRoles extends Student {
  roles?: StudentClassRole[];
}

export function useStudentRoles(classId?: string) {
  const { user } = useAuth();
  const [studentsWithRoles, setStudentsWithRoles] = useState<StudentWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudentsWithRoles = useCallback(async () => {
    if (!classId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch students in the class
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId);

      if (!students) {
        setStudentsWithRoles([]);
        return;
      }

      // Fetch roles for all students in this class
      const studentIds = students.map(s => s.id);
      const { data: roles } = await supabase
        .from('student_class_roles')
        .select('*')
        .eq('class_id', classId)
        .in('student_id', studentIds);

      // Combine students with their roles
      const combined = students.map(student => ({
        ...student,
        roles: (roles?.filter(r => r.student_id === student.id) || []) as StudentClassRole[]
      }));

      setStudentsWithRoles(combined);
    } catch (error) {
      console.error('Error fetching students with roles:', error);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchStudentsWithRoles();
  }, [fetchStudentsWithRoles]);

  const assignRole = async (studentId: string, role: StudentRole): Promise<{ error: string | null }> => {
    if (!classId || !user) return { error: 'Missing class or user' };

    const { error } = await supabase
      .from('student_class_roles')
      .insert({
        student_id: studentId,
        class_id: classId,
        role: role,
        assigned_by: user.id
      });

    if (!error) {
      await fetchStudentsWithRoles();
    }

    return { error: error?.message || null };
  };

  const removeRole = async (studentId: string, role: StudentRole): Promise<{ error: string | null }> => {
    if (!classId) return { error: 'Missing class' };

    const { error } = await supabase
      .from('student_class_roles')
      .delete()
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .eq('role', role);

    if (!error) {
      await fetchStudentsWithRoles();
    }

    return { error: error?.message || null };
  };

  const getStudentRoles = (studentId: string): StudentRole[] => {
    const student = studentsWithRoles.find(s => s.id === studentId);
    return student?.roles?.map(r => r.role) || [];
  };

  const getStudentsWithRole = (role: StudentRole): StudentWithRoles[] => {
    return studentsWithRoles.filter(s => s.roles?.some(r => r.role === role));
  };

  return {
    studentsWithRoles,
    loading,
    assignRole,
    removeRole,
    getStudentRoles,
    getStudentsWithRole,
    refreshRoles: fetchStudentsWithRoles
  };
}
