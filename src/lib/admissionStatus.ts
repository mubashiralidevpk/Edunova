// Shared admission application statuses used by staff, parents and the public tracker.

export interface AdmissionStatusMeta {
  value: string;
  label: string;
  description: string;
  /** Progress step for the public tracker (1 = start). */
  step: number;
  tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
}

export const ADMISSION_STATUSES: AdmissionStatusMeta[] = [
  { value: 'submitted', label: 'Submitted', description: 'Application received, waiting to be opened.', step: 1, tone: 'neutral' },
  { value: 'pending', label: 'Submitted', description: 'Application received, waiting to be opened.', step: 1, tone: 'neutral' },
  { value: 'under_review', label: 'Under review', description: 'The admission team is reading the application.', step: 2, tone: 'info' },
  { value: 'documents_required', label: 'Documents required', description: 'Some documents are still missing.', step: 2, tone: 'warning' },
  { value: 'resubmission_required', label: 'Resubmission required', description: 'Something must be corrected and sent again.', step: 2, tone: 'warning' },
  { value: 'verified', label: 'Verified', description: 'Details and documents were checked and accepted.', step: 3, tone: 'success' },
  { value: 'test_required', label: 'Test required', description: 'An entry test is needed — date to be announced.', step: 4, tone: 'info' },
  { value: 'test_assigned', label: 'Test assigned', description: 'Entry test date, time and venue are fixed.', step: 4, tone: 'info' },
  { value: 'test_scheduled', label: 'Test assigned', description: 'Entry test date, time and venue are fixed.', step: 4, tone: 'info' },
  { value: 'test_completed', label: 'Test completed', description: 'The test was taken and is being marked.', step: 5, tone: 'info' },
  { value: 'passed', label: 'Test passed', description: 'The entry test was cleared.', step: 5, tone: 'success' },
  { value: 'failed', label: 'Test not cleared', description: 'The entry test was not cleared.', step: 5, tone: 'danger' },
  { value: 'interview_required', label: 'Interview required', description: 'An interview is needed — date to be announced.', step: 6, tone: 'info' },
  { value: 'interview_assigned', label: 'Interview assigned', description: 'Interview date, time and venue are fixed.', step: 6, tone: 'info' },
  { value: 'interview_completed', label: 'Interview completed', description: 'The interview was held; decision pending.', step: 6, tone: 'info' },
  { value: 'merit_list', label: 'On merit list', description: 'Placed on the merit list for available seats.', step: 7, tone: 'info' },
  { value: 'waitlisted', label: 'Waitlisted', description: 'Kept on the waiting list until a seat opens.', step: 7, tone: 'warning' },
  { value: 'offer_issued', label: 'Offer issued', description: 'A seat is offered — fee and confirmation next.', step: 8, tone: 'success' },
  { value: 'fee_pending', label: 'Fee pending', description: 'Admission fee has to be paid to confirm the seat.', step: 8, tone: 'warning' },
  { value: 'admitted', label: 'Admitted', description: 'Admission confirmed and class allocated.', step: 9, tone: 'success' },
  { value: 'rejected', label: 'Not accepted', description: 'The application was not accepted.', step: 9, tone: 'danger' },
  { value: 'withdrawn', label: 'Withdrawn', description: 'The family withdrew this application.', step: 9, tone: 'neutral' },
];

/** Statuses staff can pick, without legacy duplicates. */
export const SELECTABLE_STATUSES = ADMISSION_STATUSES.filter(
  (s) => !['pending', 'test_scheduled'].includes(s.value)
);

export const TOTAL_STEPS = 9;

export function statusMeta(status: string): AdmissionStatusMeta {
  return (
    ADMISSION_STATUSES.find((s) => s.value === status) || {
      value: status,
      label: status.replace(/_/g, ' '),
      description: '',
      step: 1,
      tone: 'neutral',
    }
  );
}

export const toneClass: Record<AdmissionStatusMeta['tone'], string> = {
  neutral: 'bg-muted text-foreground border border-border',
  info: 'bg-primary/15 text-primary border border-primary/30',
  warning: 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30',
  success: 'bg-accent/15 text-accent border border-accent/30',
  danger: 'bg-destructive/15 text-destructive border border-destructive/30',
};

/** Statuses that need a test date, and those that need an interview date. */
export const NEEDS_TEST_DATE = ['test_assigned'];
export const NEEDS_INTERVIEW_DATE = ['interview_assigned'];

/** Terminal states — no further action expected. */
export const CLOSED_STATUSES = ['admitted', 'rejected', 'withdrawn'];

export const MAX_CLASS_LEVEL = 16;
export const ALL_CLASS_LEVELS = Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => i + 1);

export function classLevelLabel(level: number): string {
  if (level === 13) return 'Class 13 (1st year college)';
  if (level === 14) return 'Class 14 (2nd year college)';
  if (level > 14) return `Class ${level} (degree year ${level - 12})`;
  return `Class ${level}`;
}
