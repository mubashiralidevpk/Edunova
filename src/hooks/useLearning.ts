import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  CourseCategory, 
  Course, 
  CourseLesson, 
  StudentCourseProgress,
  StudentLessonProgress,
  StudentXP,
  Achievement,
  StudentAchievement
} from '@/types/learning';

export function useLearning() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentXP, setStudentXP] = useState<StudentXP | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<StudentAchievement[]>([]);
  const [courseProgress, setCourseProgress] = useState<StudentCourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Get the student record for the current user
  useEffect(() => {
    const fetchStudentId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setStudentId(data.id);
      }
    };

    fetchStudentId();
  }, [user]);

  // Fetch all learning data
  const fetchLearningData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('course_categories')
        .select('*')
        .order('name');
      
      if (categoriesData) {
        setCategories(categoriesData as CourseCategory[]);
      }

      // Fetch published courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('difficulty_level');
      
      if (coursesData) {
        setCourses(coursesData as Course[]);
      }

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .order('requirement_value');
      
      if (achievementsData) {
        setAchievements(achievementsData as Achievement[]);
      }

      // Fetch student-specific data if we have a student ID
      if (studentId) {
        // Fetch student XP
        const { data: xpData } = await supabase
          .from('student_xp')
          .select('*')
          .eq('student_id', studentId)
          .single();
        
        if (xpData) {
          setStudentXP(xpData as StudentXP);
        }

        // Fetch course progress
        const { data: progressData } = await supabase
          .from('student_course_progress')
          .select('*')
          .eq('student_id', studentId);
        
        if (progressData) {
          setCourseProgress(progressData as StudentCourseProgress[]);
        }

        // Fetch earned achievements
        const { data: earnedData } = await supabase
          .from('student_achievements')
          .select('*, achievements(*)')
          .eq('student_id', studentId);
        
        if (earnedData) {
          setEarnedAchievements(earnedData.map(e => ({
            ...e,
            achievement: e.achievements as unknown as Achievement
          })) as StudentAchievement[]);
        }
      }
    } catch (error) {
      console.error('Error fetching learning data:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchLearningData();
  }, [fetchLearningData]);

  // Fetch lessons for a course
  const fetchCourseLessons = async (courseId: string): Promise<CourseLesson[]> => {
    const { data } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('lesson_order');
    
    return (data as CourseLesson[]) || [];
  };

  // Fetch lesson progress for a course
  const fetchLessonProgress = async (courseId: string): Promise<StudentLessonProgress[]> => {
    if (!studentId) return [];

    const { data: lessons } = await supabase
      .from('course_lessons')
      .select('id')
      .eq('course_id', courseId);

    if (!lessons || lessons.length === 0) return [];

    const lessonIds = lessons.map(l => l.id);
    const { data } = await supabase
      .from('student_lesson_progress')
      .select('*')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);
    
    return (data as StudentLessonProgress[]) || [];
  };

  // Start a course
  const startCourse = async (courseId: string) => {
    if (!studentId) return;

    const { data: firstLesson } = await supabase
      .from('course_lessons')
      .select('id')
      .eq('course_id', courseId)
      .order('lesson_order')
      .limit(1)
      .single();

    await supabase
      .from('student_course_progress')
      .upsert({
        student_id: studentId,
        course_id: courseId,
        current_lesson_id: firstLesson?.id,
        progress_percentage: 0
      });

    await initializeXP();
    await fetchLearningData();
  };

  // Complete a lesson
  const completeLesson = async (lessonId: string, courseId: string, xpReward: number) => {
    if (!studentId) return;

    // Mark lesson as completed
    await supabase
      .from('student_lesson_progress')
      .upsert({
        student_id: studentId,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: new Date().toISOString()
      });

    // Update XP
    await addXP(xpReward);

    // Update course progress
    const lessons = await fetchCourseLessons(courseId);
    const lessonProgress = await fetchLessonProgress(courseId);
    const completedCount = lessonProgress.filter(p => p.is_completed).length + 1;
    const progressPercentage = Math.round((completedCount / lessons.length) * 100);

    const nextLesson = lessons.find(l => 
      l.lesson_order > lessons.find(le => le.id === lessonId)!.lesson_order
    );

    await supabase
      .from('student_course_progress')
      .update({
        progress_percentage: progressPercentage,
        current_lesson_id: nextLesson?.id || null,
        completed_at: progressPercentage === 100 ? new Date().toISOString() : null
      })
      .eq('student_id', studentId)
      .eq('course_id', courseId);

    // If course completed, add bonus XP
    if (progressPercentage === 100) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        await addXP(course.xp_reward);
      }
    }

    await fetchLearningData();
  };

  // Initialize XP record for student
  const initializeXP = async () => {
    if (!studentId) return;

    const { data: existing } = await supabase
      .from('student_xp')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (!existing) {
      await supabase
        .from('student_xp')
        .insert({
          student_id: studentId,
          total_xp: 0,
          current_level: 1,
          xp_to_next_level: 100
        });
    }
  };

  // Add XP to student
  const addXP = async (xpAmount: number) => {
    if (!studentId || !studentXP) {
      await initializeXP();
      return;
    }

    let newTotalXP = studentXP.total_xp + xpAmount;
    let newLevel = studentXP.current_level;
    let xpToNext = studentXP.xp_to_next_level;

    // Check for level up
    while (newTotalXP >= xpToNext) {
      newLevel += 1;
      xpToNext = newLevel * 100; // Each level requires 100 more XP
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = studentXP.last_activity_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let newStreak = studentXP.streak_days;
    if (lastActivity !== today) {
      if (lastActivity === yesterday) {
        newStreak += 1;
      } else if (!lastActivity) {
        newStreak = 1;
      } else {
        newStreak = 1; // Reset streak if not consecutive
      }
    }

    await supabase
      .from('student_xp')
      .update({
        total_xp: newTotalXP,
        current_level: newLevel,
        xp_to_next_level: xpToNext,
        streak_days: newStreak,
        last_activity_date: today
      })
      .eq('student_id', studentId);
  };

  // Get course progress for a specific course
  const getCourseProgress = (courseId: string): StudentCourseProgress | undefined => {
    return courseProgress.find(p => p.course_id === courseId);
  };

  return {
    categories,
    courses,
    studentXP,
    achievements,
    earnedAchievements,
    courseProgress,
    loading,
    studentId,
    fetchCourseLessons,
    fetchLessonProgress,
    startCourse,
    completeLesson,
    getCourseProgress,
    refreshData: fetchLearningData
  };
}
