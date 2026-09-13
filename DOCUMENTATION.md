# Edunova — Management Intelligence System

Complete system documentation. Last updated: 7 September 2026.

---

## 1. What Edunova is

Edunova is a multi-school management platform. One installation serves many schools
("institutions"); every record belongs to a school and users only ever see their own
school's data.

It covers five broad areas:

1. **Admissions** — public application form, application tracking, chat with the
   admission team, tests/interviews, admitting an applicant into a class.
2. **Academics** — classes, students, per-period attendance, notes, announcements,
   assignments and weighted grading, exam terms, results and report cards.
3. **Staff** — teacher accounts, staff roles, daily check-in with lateness rules,
   timetables, substitution/coverage when a teacher is missing, payroll.
4. **Families** — parent login by one-time code, a parent dashboard with the child's
   attendance, results and notifications; a public results portal.
5. **Intelligence** — AI assistants for teachers, students and administrators, AI
   exam-paper checking, analytics and report building.

---

## 2. Who uses it

| Role | How they get an account | What they can do |
|---|---|---|
| Administrator | Registers the school, or is promoted by another admin | Everything for their school: staff, students, classes, timetable, admissions, finances, settings |
| Teacher | Public sign-up (teacher is the only self-serve role) or created by an admin | Their classes, attendance, notes, announcements, grading, results, admissions if given the admission role |
| Student | Created by a teacher or admin, or admitted from an application | Their classes, attendance, notes, announcements, results, learning, study assistant |
| Parent | Signs in with a one-time code sent to the number on file | Read-only view of their child |
| Public visitor | No account | Landing page, apply for admission, check application status, published results |

Staff can additionally hold **staff roles** (for example admission manager or exam
manager) which unlock specific areas without making them administrators.

---

## 3. Public pages

| Path | Purpose |
|---|---|
| `/` | Landing page. Signed-in users are sent to their dashboard automatically |
| `/apply` | Admission application form for a chosen school and class |
| `/admission-history` | Look up a submitted application by its reference |
| `/admission-chat` | Message the admission team about an application |
| `/results` | Published results by school, class and roll number |
| `/auth/login`, `/auth/register`, `/auth/parent-login` | Sign in, register a school, parent one-time-code login |

Short links `/login`, `/signin`, `/register`, `/signup`, `/parent-login` redirect to the
proper pages so no shared URL ever hits a "not found" screen.

---

## 4. Dashboards

**Administrator** — home, teachers, teacher management, students, classes, schedule,
check-in board, admissions, admission form builder, exam terms, financials, AI, settings.

**Teacher** — home, classes and class detail, students and student detail, attendance
analytics, results, exams, check-in, admissions and form builder (with the admission
role), AI assistant.

**Student** — home, classes, attendance, announcements, notes, results, learning,
study assistant.

The sidebar is an independent scrolling area: its scroll position and which groups are
open or closed survive moving between pages, and the current page stays highlighted.

---

## 5. Admissions

- Each school chooses **which class levels are open** for admission; the public form
  only offers those, and an application for a closed class is rejected by the database.
- The **admission process** is configurable per school: whether an entry test is
  required, whether an interview is required, total and passing marks, automatic pass,
  and free-text instructions shown to applicants.
- The **form builder** lets the admission team add their own fields on top of the
  standard ones.
- Applicants can be scheduled for a test or interview; interview date, venue, status,
  score and notes are stored on the application.
- Admitting an applicant creates the student record and login in one step.

---

## 6. Attendance

- Attendance is recorded **per class, per student, per date and per period**, so a
  school running multiple periods a day gets a separate register for each one.
- One record per class/student/date/period is enforced by the database.
- Absences can trigger parent alerts.
- Teachers have their own daily check-in with a lateness cut-off, automatic locking, and
  an impact calculation that flags classes left without a teacher and starts a coverage
  workflow.

---

## 7. Results and examinations

- Exam terms, date sheets and question papers are managed per school.
- Assignments are grouped into weighted categories so a final grade is calculated
  automatically.
- Results can be entered manually, uploaded, or produced from AI paper checking; once
  published they appear in the student portal, the parent dashboard and the public
  results portal.
- All confirmed marks flow into the single results system — there is no parallel
  results ecosystem.

---

## 8. Money

Fee structures, invoices and payments, plus staff payroll. Payments are immutable: a
mistake is voided (with an audit record), never edited or deleted. Financial screens are
administrator-only; teachers have no access at all.

---

## 9. Technical overview

- **Frontend:** React 18, Vite, TypeScript, React Router, Tailwind CSS, shadcn/ui,
  Framer Motion, TanStack Query.
- **Backend:** Lovable Cloud (PostgreSQL, authentication, storage, edge functions).
- **Styling:** dark "cyber" theme driven entirely by design tokens in `src/index.css`
  (`glass-card`, `aurora-hero`, `neon-glow`, `cyber-grid`, `pill-badge`, `btn-pill`).
  No hard-coded colours in components.
- **Desktop:** an Electron wrapper lives in `electron/`. A Tauri edition is planned;
  it needs a Rust build machine and is not produced from the web workspace.

### Source layout

```
src/
  pages/            route components, grouped by admin | teacher | student | auth | parent | exams | staff
  components/       admin, admissions, ai, brand, layout, learning, notifications, seo, shared, student, students, teacher, ui
  hooks/            data hooks (useResults, useGrading, useTeacherCheckin, useParentPortal, useSchoolSettings, …)
  contexts/         AuthContext
  integrations/     generated backend client and types (never edited by hand)
  lib/              errors, pdf, map links, admission storage helpers
  types/            database and school domain types
supabase/
  functions/        edge functions
  migrations/       ordered SQL migrations
electron/           desktop shell
```

### Security model

- Roles live in a dedicated `user_roles` table (never on the profile) with an
  `app_role` enum; `has_role()` is a security-definer function used by every policy.
- Row-level security is on for every table; policies scope rows through
  `get_user_school(auth.uid())` so no institution can read another's data.
- Staff-role helpers (`is_admission_manager`, `is_exam_manager`, `is_class_admin`,
  `is_class_member`) gate the specialised areas.
- Public surfaces (apply, application lookup, results portal) go through explicit
  read-only database functions that expose approved fields only.
- Service keys and database passwords are never exposed to the client.

### Data model (public schema, 66 tables)

Identity and structure: `schools`, `school_settings`, `profiles`, `user_roles`,
`staff_role_assignments`, `classes`, `class_teachers`, `students`, `student_class_roles`,
`teacher_invitations`, `promotion_runs`.

Admissions: `admission_applicants`, `admission_form_fields`, `admission_messages`,
`admission_test_schedules`.

Attendance and staff time: `attendance`, `attendance_patterns`, `teacher_checkins`,
`teacher_schedules`, `class_impacts`, `alert_logs`, `substitution_requests`,
`substitution_assignments`.

Teaching and assessment: `class_notes`, `announcements`, `assignments`,
`assignment_categories`, `student_grades`, `grade_predictions`, `exam_terms`,
`exam_datesheets`, `exam_datesheet_entries`, `exam_question_papers`, `exam_paper_checks`,
`student_exam_results`, `student_results`, `result_uploads`, `report_templates`.

Students and engagement: `student_activity`, `student_sessions`, `student_xp`,
`achievements`, `student_achievements`, `courses`, `course_categories`, `course_lessons`,
`student_course_progress`, `student_lesson_progress`, `wall_of_fame` (deprecated —
retained for history, removed from the interface).

Families: `parents`, `parent_students`, `parent_notifications`, `parent_otp_codes`.

Money: `fee_structures`, `fee_invoices`, `fee_payments`, `payroll_records`,
`voided_records`.

AI and system: `ai_conversations`, `ai_messages`, `nexus_concepts`,
`nexus_interactions`, `nexus_mood_logs`, `nexus_teacher_feedback`,
`system_notifications`.

### Edge functions

| Function | Purpose |
|---|---|
| `create-teacher-account`, `delete-teacher-account` | Staff account lifecycle |
| `create-student-account` | Student provisioning with generated ID, email and password |
| `admit-applicant` | Turn an accepted application into an enrolled student |
| `checkin-impact-engine` | Work out which classes a missing teacher affects and raise alerts |
| `ai-assistant`, `edu-ai-assistant` | Student and teacher assistants |
| `admin-ai-orchestrator`, `admin-ai-execute` | Administrator AI that can plan and run actions |
| `check-exam-paper` | AI checking of an uploaded answer sheet |
| `result-ocr` | Read marks from an uploaded result sheet |
| `parent-otp-send`, `parent-otp-verify`, `parent-direct-login` | Parent sign-in |

### Key database functions

Access: `has_role`, `has_staff_role`, `get_user_role`, `get_user_school`,
`is_admission_manager`, `is_exam_manager`, `is_class_admin`, `is_class_member`.

Admissions: `submit_admission_application`, `lookup_admission_history`,
`list_admission_class_levels`, `set_admission_class_levels`, `get_admission_process`,
`set_admission_process`, `list_admission_form_fields`, `list_admission_messages`,
`post_admission_message`, `applicant_chat_context`, `get_admission_contacts`,
`admit_applicant`, `enforce_open_admission_class`.

Results and public surfaces: `search_published_results`, `lookup_student_results`,
`list_result_portal_schools`, `list_public_schools`, `handle_final_term_close`.

Operations: `bulk_insert_students`, `run_promotion`, `promote_teacher_to_admin`,
`set_staff_roles`, `set_teacher_staff_role`, `recalc_invoice_status`, `handle_new_user`,
`prevent_profile_privilege_escalation`, `enforce_teacher_checkin_security`.

---

## 10. Conventions

- No placeholder or invented data anywhere — empty states instead.
- Errors are surfaced through `src/lib/errors.ts` (`resolveErrorMessage`, `toastError`,
  `invokeFn`) so users see plain language, never a raw technical error.
- Generated files (`src/integrations/supabase/*`, `.env`, `supabase/config.toml`) are
  never edited by hand.
- Every new table ships with grants, row-level security and policies in the same
  migration.

---

## 11. Known gaps / planned

- Examination checking modes (manual, automatic, hybrid) with the side-by-side checking
  workspace and full audit trail — designed, not yet built.
- Country → board → program → institution admission engine, versioned admission forms,
  public institution discovery, comparison and ranking — planned.
- Tauri desktop edition replacing Electron — requires a Rust build machine.
