import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AssignmentCategory, Assignment, StudentGrade, GradePrediction } from '@/types/school';
import { useToast } from '@/hooks/use-toast';

export function useGrading(classId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<AssignmentCategory[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [predictions, setPredictions] = useState<GradePrediction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!classId) return;

    const { data } = await supabase
      .from('assignment_categories')
      .select('*')
      .eq('class_id', classId)
      .order('created_at');

    setCategories((data || []) as AssignmentCategory[]);
  }, [classId]);

  const fetchAssignments = useCallback(async () => {
    if (!classId) return;

    const { data } = await supabase
      .from('assignments')
      .select(`
        *,
        category:assignment_categories(*)
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    const typedData = (data || []).map(a => ({
      ...a,
      assignment_type: a.assignment_type as Assignment['assignment_type'],
    })) as Assignment[];

    setAssignments(typedData);
  }, [classId]);

  const fetchGrades = useCallback(async () => {
    if (!classId) return;

    // Fetch grades with student info, then filter by class
    const { data } = await supabase
      .from('student_grades')
      .select(`
        *,
        student:students(full_name, roll_number, class_id),
        assignment:assignments(*)
      `);

    const filtered = (data || []).filter(g => 
      (g.assignment as any)?.class_id === classId
    );

    const typedData = filtered.map(g => ({
      ...g,
      assignment: g.assignment ? {
        ...g.assignment,
        assignment_type: (g.assignment as any).assignment_type as Assignment['assignment_type'],
      } : undefined,
    })) as StudentGrade[];

    setGrades(typedData);
  }, [classId]);

  const fetchPredictions = useCallback(async () => {
    if (!classId) return;

    const { data } = await supabase
      .from('grade_predictions')
      .select('*')
      .eq('class_id', classId);

    const typedData = (data || []).map(p => ({
      ...p,
      factors: (p.factors || {}) as Record<string, unknown>,
    })) as GradePrediction[];

    setPredictions(typedData);
  }, [classId]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchCategories(),
        fetchAssignments(),
        fetchGrades(),
        fetchPredictions(),
      ]);
      setLoading(false);
    };

    fetchAll();
  }, [fetchCategories, fetchAssignments, fetchGrades, fetchPredictions]);

  // Category management
  const createCategory = async (name: string, weight: number): Promise<boolean> => {
    if (!classId || !user) return false;

    try {
      const { error } = await supabase
        .from('assignment_categories')
        .insert({ class_id: classId, name, weight });

      if (error) throw error;
      
      toast({ title: "Category created" });
      await fetchCategories();
      return true;
    } catch (error) {
      console.error('Create category error:', error);
      toast({ title: "Failed to create category", variant: "destructive" });
      return false;
    }
  };

  const updateCategoryWeight = async (categoryId: string, weight: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('assignment_categories')
        .update({ weight })
        .eq('id', categoryId);

      if (error) throw error;
      
      await fetchCategories();
      return true;
    } catch (error) {
      console.error('Update weight error:', error);
      return false;
    }
  };

  // Assignment management
  const createAssignment = async (assignment: {
    title: string;
    description?: string;
    category_id?: string;
    max_score?: number;
    due_date?: string;
    assignment_type?: 'test' | 'quiz' | 'homework' | 'project' | 'participation';
    is_published?: boolean;
  }): Promise<boolean> => {
    if (!classId || !user) return false;

    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          class_id: classId,
          teacher_id: user.id,
          title: assignment.title,
          description: assignment.description,
          category_id: assignment.category_id,
          max_score: assignment.max_score || 100,
          due_date: assignment.due_date,
          assignment_type: assignment.assignment_type || 'homework',
          is_published: assignment.is_published || false,
        });

      if (error) throw error;
      
      toast({ title: "Assignment created" });
      await fetchAssignments();
      return true;
    } catch (error) {
      console.error('Create assignment error:', error);
      toast({ title: "Failed to create assignment", variant: "destructive" });
      return false;
    }
  };

  const publishAssignment = async (assignmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ is_published: true })
        .eq('id', assignmentId);

      if (error) throw error;
      
      toast({ title: "Assignment published" });
      await fetchAssignments();
      return true;
    } catch (error) {
      console.error('Publish error:', error);
      return false;
    }
  };

  // Grade management
  const submitGrade = async (
    assignmentId: string,
    studentId: string,
    score: number,
    feedback?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('student_grades')
        .upsert({
          assignment_id: assignmentId,
          student_id: studentId,
          score,
          feedback,
          graded_at: new Date().toISOString(),
          graded_by: user.id,
        }, {
          onConflict: 'assignment_id,student_id',
        });

      if (error) throw error;
      
      await fetchGrades();
      return true;
    } catch (error) {
      console.error('Submit grade error:', error);
      toast({ title: "Failed to save grade", variant: "destructive" });
      return false;
    }
  };

  // Calculate weighted grade for a student
  const calculateWeightedGrade = (studentId: string): number | null => {
    const studentGrades = grades.filter(g => g.student_id === studentId && g.score !== null);
    if (studentGrades.length === 0) return null;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    categories.forEach(category => {
      const categoryAssignments = assignments.filter(a => a.category_id === category.id);
      const categoryGrades = studentGrades.filter(g => 
        categoryAssignments.some(a => a.id === g.assignment_id)
      );

      if (categoryGrades.length > 0) {
        const categoryAvg = categoryGrades.reduce((sum, g) => {
          const assignment = categoryAssignments.find(a => a.id === g.assignment_id);
          const maxScore = assignment?.max_score || 100;
          return sum + ((g.score || 0) / maxScore) * 100;
        }, 0) / categoryGrades.length;

        totalWeightedScore += categoryAvg * (category.weight / 100);
        totalWeight += category.weight;
      }
    });

    // Handle assignments without category
    const uncategorizedAssignments = assignments.filter(a => !a.category_id);
    const uncategorizedGrades = studentGrades.filter(g =>
      uncategorizedAssignments.some(a => a.id === g.assignment_id)
    );

    if (uncategorizedGrades.length > 0) {
      const uncategorizedWeight = 100 - categories.reduce((sum, c) => sum + c.weight, 0);
      const uncategorizedAvg = uncategorizedGrades.reduce((sum, g) => {
        const assignment = uncategorizedAssignments.find(a => a.id === g.assignment_id);
        const maxScore = assignment?.max_score || 100;
        return sum + ((g.score || 0) / maxScore) * 100;
      }, 0) / uncategorizedGrades.length;

      totalWeightedScore += uncategorizedAvg * (uncategorizedWeight / 100);
      totalWeight += uncategorizedWeight;
    }

    return totalWeight > 0 ? Math.round(totalWeightedScore) : null;
  };

  // Convert percentage to letter grade
  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    if (percentage >= 45) return 'D';
    return 'F';
  };

  return {
    categories,
    assignments,
    grades,
    predictions,
    loading,
    createCategory,
    updateCategoryWeight,
    createAssignment,
    publishAssignment,
    submitGrade,
    calculateWeightedGrade,
    getLetterGrade,
    totalCategoryWeight: categories.reduce((sum, c) => sum + c.weight, 0),
    refetch: () => {
      fetchCategories();
      fetchAssignments();
      fetchGrades();
      fetchPredictions();
    },
  };
}
