// Edunova Database Types

export type AppRole = 'admin' | 'teacher' | 'student';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  school_id: string | null;
  staff_role: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  level: number;
  section: string;
  subject: string;
  class_name: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string | null;
  full_name: string;
  roll_number: string;
  student_id: string;
  class_id: string | null;
  created_by: string | null;
  password_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentActivity {
  id: string;
  student_id: string;
  activity_type: 'note_viewed' | 'announcement_read' | 'message_sent' | 'login';
  class_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface StudentSession {
  id: string;
  student_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface Attendance {
  id: string;
  class_id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassMessage {
  id: string;
  class_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
}

export interface ClassNote {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface ClassWithStats extends Class {
  student_count: number;
  attendance_percentage: number;
}

export interface StudentWithClass extends Student {
  class?: Class;
}

export interface AttendanceWithStudent extends Attendance {
  student?: Student;
}

export interface AnnouncementWithTeacher extends Announcement {
  teacher?: Profile;
}

export interface MessageWithSender extends ClassMessage {
  sender?: Profile;
}
