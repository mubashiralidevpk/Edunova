/**
 * Homework Intelligence
 *
 * Decides what a student's homework status actually is, instead of blindly
 * marking everybody who did not submit as "missing". Context considered:
 * was the homework targeted at the student, was the homework withdrawn,
 * was the deadline extended, was the student excused, was the student absent
 * on the day the work was assigned, was the class held at all (teacher absent
 * / class cancelled / school closed), and only then the submission itself.
 */

export type HomeworkStatus =
  | 'pending'
  | 'submitted'
  | 'submitted_late'
  | 'checked'
  | 'returned'
  | 'resubmission_required'
  | 'overdue'
  | 'excused'
  | 'not_required'
  | 'withdrawn'
  | 'not_expected';

export interface HomeworkRecord {
  id: string;
  title: string;
  subject: string;
  class_id: string;
  assigned_date: string;
  due_date: string;
  due_time: string | null;
  max_marks: number | null;
  status: string;
  allow_resubmission: boolean;
  target_student_ids: string[] | null;
}

export interface SubmissionRecord {
  id: string;
  homework_id: string;
  student_id: string;
  version: number;
  submitted_at: string;
  is_late: boolean;
  status: string;
  marks: number | null;
  teacher_remark: string | null;
  checked_at: string | null;
}

export interface ExceptionRecord {
  homework_id: string;
  student_id: string;
  kind: string; // excused | absent | extension | not_required
  reason: string | null;
  note: string | null;
  extended_due_date: string | null;
  extended_due_time: string | null;
}

export interface ContextFlags {
  studentAbsentOnAssignedDate?: boolean;
  classNotHeld?: boolean; // teacher absent, class cancelled or school closed
  contextNote?: string;
}

export interface HomeworkVerdict {
  status: HomeworkStatus;
  label: string;
  tone: 'default' | 'success' | 'warning' | 'danger' | 'muted';
  /** true only when the student is genuinely expected to submit */
  expected: boolean;
  /** plain-language explanation shown to teachers */
  reason: string;
  effectiveDue: Date;
}

export function homeworkDeadline(hw: HomeworkRecord, exception?: ExceptionRecord | null): Date {
  const date = exception?.extended_due_date || hw.due_date;
  const time = (exception?.extended_due_date ? exception.extended_due_time : hw.due_time) || '23:59:00';
  return new Date(`${date}T${time}`);
}

export function isTargeted(hw: HomeworkRecord, studentId: string): boolean {
  return !hw.target_student_ids || hw.target_student_ids.length === 0 || hw.target_student_ids.includes(studentId);
}

export function computeHomeworkVerdict(params: {
  homework: HomeworkRecord;
  studentId: string;
  submission?: SubmissionRecord | null;
  exception?: ExceptionRecord | null;
  context?: ContextFlags;
  now?: Date;
}): HomeworkVerdict {
  const { homework: hw, studentId, submission, exception, context = {} } = params;
  const now = params.now || new Date();
  const effectiveDue = homeworkDeadline(hw, exception);

  const base = { effectiveDue };

  if (hw.status === 'withdrawn') {
    return { ...base, status: 'withdrawn', label: 'Withdrawn', tone: 'muted', expected: false, reason: 'The homework was withdrawn by the teacher.' };
  }

  if (!isTargeted(hw, studentId)) {
    return { ...base, status: 'not_required', label: 'Not required', tone: 'muted', expected: false, reason: 'This homework was not assigned to this student.' };
  }

  if (submission) {
    if (submission.status === 'resubmission_required') {
      return { ...base, status: 'resubmission_required', label: 'Resubmission required', tone: 'warning', expected: true, reason: 'The teacher asked for the work to be done again.' };
    }
    if (submission.status === 'returned') {
      return { ...base, status: 'returned', label: 'Returned', tone: 'warning', expected: false, reason: 'Returned to the student with feedback.' };
    }
    if (submission.checked_at) {
      return { ...base, status: 'checked', label: 'Checked', tone: 'success', expected: false, reason: 'Checked by the teacher.' };
    }
    if (submission.is_late) {
      return { ...base, status: 'submitted_late', label: 'Submitted late', tone: 'warning', expected: false, reason: 'Submitted after the deadline.' };
    }
    return { ...base, status: 'submitted', label: 'Submitted', tone: 'default', expected: false, reason: 'Waiting to be checked.' };
  }

  if (exception?.kind === 'excused') {
    return { ...base, status: 'excused', label: 'Excused', tone: 'muted', expected: false, reason: exception.reason || 'Excused by the teacher.' };
  }
  if (exception?.kind === 'not_required') {
    return { ...base, status: 'not_required', label: 'Not required', tone: 'muted', expected: false, reason: exception.reason || 'Marked as not required.' };
  }

  const overdue = now > effectiveDue;

  if (!overdue) {
    return { ...base, status: 'pending', label: 'Pending', tone: 'default', expected: true, reason: 'Deadline has not passed yet.' };
  }

  if (context.classNotHeld) {
    return { ...base, status: 'not_expected', label: 'No action required', tone: 'muted', expected: false, reason: context.contextNote || 'The class was not held, so no submission is expected.' };
  }

  if (context.studentAbsentOnAssignedDate) {
    return { ...base, status: 'excused', label: 'Excused (absent)', tone: 'muted', expected: false, reason: 'The student was absent on the day this homework was assigned.' };
  }

  return { ...base, status: 'overdue', label: 'Not submitted', tone: 'danger', expected: true, reason: 'The deadline has passed and nothing was submitted.' };
}

export const statusBadgeClass: Record<HomeworkVerdict['tone'], string> = {
  default: 'bg-primary/10 text-primary border-primary/30',
  success: 'bg-accent/10 text-accent border-accent/30',
  warning: 'bg-[hsl(45,100%,55%)]/10 text-[hsl(45,100%,60%)] border-[hsl(45,100%,55%)]/30',
  danger: 'bg-destructive/10 text-destructive-foreground border-destructive/30',
  muted: 'bg-muted/40 text-muted-foreground border-border',
};

export const NON_SUBMISSION_REASONS = [
  'Student absent',
  'Medical / approved leave',
  'Technical problem',
  'Family reason',
  'Homework not understood',
  'Forgot',
  'Incomplete work',
  'Teacher granted extension',
  'Assignment cancelled',
  'Other',
];
