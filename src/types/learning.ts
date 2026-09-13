// Learning Platform Types

export type StudentRole = 'topper' | 'monitor' | 'proctor' | 'class_representative';

export interface CourseCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  difficulty_level: number;
  xp_reward: number;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseWithCategory extends Course {
  category?: CourseCategory;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  lesson_order: number;
  lesson_type: 'text' | 'video' | 'quiz' | 'challenge';
  xp_reward: number;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentCourseProgress {
  id: string;
  student_id: string;
  course_id: string;
  current_lesson_id: string | null;
  started_at: string;
  completed_at: string | null;
  progress_percentage: number;
}

export interface StudentLessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  score: number | null;
}

export interface StudentXP {
  id: string;
  student_id: string;
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  streak_days: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  requirement_type: 'courses_completed' | 'xp_earned' | 'streak_days' | 'lessons_completed';
  requirement_value: number;
  created_at: string;
}

export interface StudentAchievement {
  id: string;
  student_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface StudentClassRole {
  id: string;
  student_id: string;
  class_id: string;
  role: StudentRole;
  assigned_by: string | null;
  assigned_at: string;
}
