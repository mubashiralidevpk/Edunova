import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClassTeacher, ClassTeacherRole, ROLE_PERMISSIONS } from '@/types/school';
import { useToast } from '@/hooks/use-toast';

export function useClassTeachers(classId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<ClassTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassAdmin, setIsClassAdmin] = useState(false);
  const [myRole, setMyRole] = useState<ClassTeacherRole | null>(null);

  const fetchTeachers = useCallback(async () => {
    if (!classId || !user) return;
    
    try {
      // Fetch all teachers for this class with their profiles
      const { data, error } = await supabase
        .from('class_teachers')
        .select('*')
        .eq('class_id', classId);

      if (error) {
        // If no class_teachers table yet or no data, check if user is class creator
        const { data: classData } = await supabase
          .from('classes')
          .select('teacher_id')
          .eq('id', classId)
          .single();

        if (classData?.teacher_id === user.id) {
          setIsClassAdmin(true);
          setMyRole('class_admin');
        }
        setTeachers([]);
      } else {
        // Cast the data to our type
        const teachersData = (data || []).map(t => ({
          ...t,
          invitation_status: t.invitation_status as 'pending' | 'accepted' | 'rejected',
        })) as ClassTeacher[];
        setTeachers(teachersData);
        
        // Check if current user is class admin
        const myAssignment = teachersData.find(t => t.teacher_id === user.id);
        if (myAssignment) {
          setIsClassAdmin(myAssignment.is_class_admin);
          setMyRole(myAssignment.role as ClassTeacherRole);
        } else {
          // Check if user is the original class creator
          const { data: classData } = await supabase
            .from('classes')
            .select('teacher_id')
            .eq('id', classId)
            .single();

          if (classData?.teacher_id === user.id) {
            setIsClassAdmin(true);
            setMyRole('class_admin');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching class teachers:', error);
    } finally {
      setLoading(false);
    }
  }, [classId, user]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const inviteTeacher = async (
    email: string,
    role: ClassTeacherRole,
    roleDescription: string
  ): Promise<boolean> => {
    if (!classId || !user || !isClassAdmin) {
      toast({
        title: "Permission denied",
        description: "Only class admins can invite teachers",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Find teacher by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Teacher not found",
          description: "No teacher account found with this email",
          variant: "destructive",
        });
        return false;
      }

      // Check if teacher is already in this class
      const existingTeacher = teachers.find(t => t.teacher_id === profile.user_id);
      if (existingTeacher) {
        toast({
          title: "Already invited",
          description: "This teacher is already part of this class",
          variant: "destructive",
        });
        return false;
      }

      // Insert invitation
      const { error } = await supabase
        .from('class_teachers')
        .insert({
          class_id: classId,
          teacher_id: profile.user_id,
          role,
          role_description: roleDescription,
          is_class_admin: false,
          invited_by: user.id,
          invitation_status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email}`,
      });

      await fetchTeachers();
      return true;
    } catch (error) {
      console.error('Error inviting teacher:', error);
      toast({
        title: "Error",
        description: "Failed to invite teacher",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateTeacherRole = async (
    teacherId: string,
    newRole: ClassTeacherRole,
    newDescription?: string
  ): Promise<boolean> => {
    if (!classId || !isClassAdmin) return false;

    try {
      const updateData: Record<string, unknown> = { role: newRole };
      if (newDescription !== undefined) {
        updateData.role_description = newDescription;
      }

      const { error } = await supabase
        .from('class_teachers')
        .update(updateData)
        .eq('class_id', classId)
        .eq('teacher_id', teacherId);

      if (error) throw error;

      toast({ title: "Role updated" });
      await fetchTeachers();
      return true;
    } catch (error) {
      console.error('Error updating teacher role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeTeacher = async (teacherId: string): Promise<boolean> => {
    if (!classId || !isClassAdmin) return false;

    try {
      const { error } = await supabase
        .from('class_teachers')
        .delete()
        .eq('class_id', classId)
        .eq('teacher_id', teacherId);

      if (error) throw error;

      toast({ title: "Teacher removed" });
      await fetchTeachers();
      return true;
    } catch (error) {
      console.error('Error removing teacher:', error);
      toast({
        title: "Error",
        description: "Failed to remove teacher",
        variant: "destructive",
      });
      return false;
    }
  };

  const respondToInvitation = async (
    accept: boolean
  ): Promise<boolean> => {
    if (!classId || !user) return false;

    try {
      const { error } = await supabase
        .from('class_teachers')
        .update({
          invitation_status: accept ? 'accepted' : 'rejected',
        })
        .eq('class_id', classId)
        .eq('teacher_id', user.id);

      if (error) throw error;

      toast({
        title: accept ? "Invitation accepted" : "Invitation declined",
      });
      await fetchTeachers();
      return true;
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return false;
    }
  };

  const getPermissions = () => {
    if (!myRole) return ROLE_PERMISSIONS.observer;
    return ROLE_PERMISSIONS[myRole];
  };

  return {
    teachers,
    loading,
    isClassAdmin,
    myRole,
    permissions: getPermissions(),
    inviteTeacher,
    updateTeacherRole,
    removeTeacher,
    respondToInvitation,
    refetch: fetchTeachers,
  };
}
