// School Management System Types

export type ClassTeacherRole = 'class_admin' | 'subject_lead' | 'support_teacher' | 'lab_assistant' | 'observer';

export interface ClassTeacher {
  id: string;
  class_id: string;
  teacher_id: string;
  role: ClassTeacherRole;
  role_description: string | null;
  is_class_admin: boolean;
  invited_by: string | null;
  invitation_status: 'pending' | 'accepted' | 'rejected';
  invitation_token: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  teacher_profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface TeacherCheckin {
  id: string;
  teacher_id: string;
  checkin_time: string;
  checkout_time: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  location_coordinates: { lat: number; lng: number } | null;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface TeacherSchedule {
  id: string;
  teacher_id: string;
  class_id: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  created_at: string;
  class?: {
    class_name: string;
    subject: string;
  };
}

export interface SubstitutionRequest {
  id: string;
  absent_teacher_id: string;
  class_id: string;
  date: string;
  period: number;
  time_slot: string | null;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  urgency: 'normal' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  // Joined
  absent_teacher_profile?: {
    full_name: string;
  };
  class?: {
    class_name: string;
    subject: string;
  };
}

export interface SubstitutionAssignment {
  id: string;
  request_id: string;
  substitute_id: string;
  approved_by: string | null;
  notes: string | null;
  volunteered_at: string;
  approved_at: string | null;
  completed_at: string | null;
  rating_by_substitute: number | null;
  rating_by_regular: number | null;
  created_at: string;
}

export interface AssignmentCategory {
  id: string;
  class_id: string;
  name: string;
  weight: number;
  created_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  category_id: string | null;
  teacher_id: string;
  title: string;
  description: string | null;
  max_score: number;
  due_date: string | null;
  assignment_type: 'test' | 'quiz' | 'homework' | 'project' | 'participation';
  is_published: boolean;
  created_at: string;
  updated_at: string;
  category?: AssignmentCategory;
}

export interface StudentGrade {
  id: string;
  assignment_id: string;
  student_id: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: string | null;
  similarity_score: number | null;
  created_at: string;
  updated_at: string;
  student?: {
    full_name: string;
    roll_number: string;
  };
  assignment?: Assignment;
}

export interface GradePrediction {
  id: string;
  student_id: string;
  class_id: string;
  predicted_grade: string;
  confidence: number;
  factors: Record<string, unknown>;
  predicted_at: string;
}

export interface Parent {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: 'parent' | 'guardian' | 'other';
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
  student?: {
    full_name: string;
    roll_number: string;
    class?: {
      class_name: string;
    };
  };
}

export interface ParentNotification {
  id: string;
  parent_id: string;
  student_id: string;
  notification_type: 'attendance' | 'grade' | 'behavior' | 'achievement' | 'announcement' | 'message';
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  sent_at: string;
  created_at: string;
}

export interface ExamTerm {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  academic_year: string;
  is_active: boolean;
  created_at: string;
}

export interface StudentResult {
  id: string;
  student_id: string;
  class_id: string;
  term_id: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string | null;
  rank: number | null;
  teacher_comments: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    full_name: string;
    roll_number: string;
  };
  term?: ExamTerm;
}

export interface AttendanceStats {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  attendance_percentage: number;
  longest_present_streak: number;
  most_absent_day: string | null;
  most_absent_day_percentage: number;
}

export interface AttendanceHeatmapData {
  date: string;
  status: 'present' | 'absent' | 'late';
  period?: number;
}

export const ROLE_PERMISSIONS: Record<ClassTeacherRole, {
  canEditContent: boolean;
  canManageStudents: boolean;
  canTakeAttendance: boolean;
  canGrade: boolean;
  canViewOnly: boolean;
}> = {
  class_admin: {
    canEditContent: true,
    canManageStudents: true,
    canTakeAttendance: true,
    canGrade: true,
    canViewOnly: false,
  },
  subject_lead: {
    canEditContent: true,
    canManageStudents: false,
    canTakeAttendance: true,
    canGrade: true,
    canViewOnly: false,
  },
  support_teacher: {
    canEditContent: true,
    canManageStudents: false,
    canTakeAttendance: false,
    canGrade: false,
    canViewOnly: false,
  },
  lab_assistant: {
    canEditContent: false,
    canManageStudents: false,
    canTakeAttendance: true,
    canGrade: false,
    canViewOnly: false,
  },
  observer: {
    canEditContent: false,
    canManageStudents: false,
    canTakeAttendance: false,
    canGrade: false,
    canViewOnly: true,
  },
};
