import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ExamResult {
  id: string;
  student_id: string;
  class_id: string;
  term_name: string;
  subject: string;
  total_marks: number;
  obtained_marks: number;
  grade: string | null;
  teacher_id: string;
  remarks: string | null;
  is_published: boolean;
  created_at: string;
  student?: {
    full_name: string;
    roll_number: string;
    student_id: string;
  };
  class?: {
    class_name: string;
    section: string;
    level: number;
  };
}

export function useResults() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeacherResults = useCallback(async (classId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('student_exam_results')
        .select(`
          *,
          student:students(full_name, roll_number, student_id),
          class:classes(class_name, section, level)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setResults((data as ExamResult[]) || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const searchStudentResults = useCallback(async (
    level: number,
    section: string,
    rollNumber: string
  ): Promise<ExamResult[]> => {
    try {
      // First find the student by class and roll number
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          roll_number,
          student_id,
          class:classes(id, class_name, section, level)
        `)
        .eq('roll_number', rollNumber);

      if (studentError) throw studentError;

      // Filter by level and section
      const matchingStudent = studentData?.find((s: any) => 
        s.class?.level === level && 
        s.class?.section?.toLowerCase() === section.toLowerCase()
      );

      if (!matchingStudent) {
        return [];
      }

      // Fetch published results for this student
      const { data: resultsData, error: resultsError } = await supabase
        .from('student_exam_results')
        .select(`
          *,
          class:classes(class_name, section, level)
        `)
        .eq('student_id', matchingStudent.id)
        .eq('is_published', true)
        .order('term_name', { ascending: false });

      if (resultsError) throw resultsError;

      return (resultsData || []).map(r => ({
        ...r,
        student: {
          full_name: matchingStudent.full_name,
          roll_number: matchingStudent.roll_number,
          student_id: matchingStudent.student_id,
        },
      })) as ExamResult[];
    } catch (error) {
      console.error('Error searching results:', error);
      return [];
    }
  }, []);

  const uploadResult = async (result: {
    student_id: string;
    class_id: string;
    term_name: string;
    subject: string;
    total_marks: number;
    obtained_marks: number;
    grade?: string;
    remarks?: string;
    is_published?: boolean;
  }) => {
    if (!user) return null;

    try {
      // Calculate grade if not provided
      const percentage = (result.obtained_marks / result.total_marks) * 100;
      const grade = result.grade || calculateGrade(percentage);

      const { data, error } = await supabase
        .from('student_exam_results')
        .insert({
          ...result,
          grade,
          teacher_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Result uploaded successfully" });
      return data as ExamResult;
    } catch (error) {
      console.error('Error uploading result:', error);
      toast({ 
        title: "Failed to upload result", 
        variant: "destructive" 
      });
      return null;
    }
  };

  const updateResult = async (id: string, updates: Partial<ExamResult>) => {
    try {
      const { error } = await supabase
        .from('student_exam_results')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      toast({ title: "Result updated successfully" });
      return true;
    } catch (error) {
      console.error('Error updating result:', error);
      toast({ 
        title: "Failed to update result", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const publishResults = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('student_exam_results')
        .update({ is_published: true })
        .in('id', ids);

      if (error) throw error;

      setResults(prev => prev.map(r => 
        ids.includes(r.id) ? { ...r, is_published: true } : r
      ));
      toast({ title: `${ids.length} results published` });
      return true;
    } catch (error) {
      console.error('Error publishing results:', error);
      toast({ 
        title: "Failed to publish results", 
        variant: "destructive" 
      });
      return false;
    }
  };

  return {
    results,
    loading,
    fetchTeacherResults,
    searchStudentResults,
    uploadResult,
    updateResult,
    publishResults,
  };
}

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}
