// Local persistence for admission applications submitted from this device.
// Lets parents see their applications without re-entering B-Form + DOB every time.

export interface SavedApplication {
  reference: string;        // short ref shown after submit
  school_id: string;
  school_name: string;
  full_name: string;
  desired_class_level: number;
  b_form_number: string;
  date_of_birth: string;    // yyyy-mm-dd
  submitted_at: string;     // ISO
}

const KEY = 'aksms.admissionApplications.v1';

export function loadSavedApplications(): SavedApplication[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveApplication(app: SavedApplication): void {
  try {
    const list = loadSavedApplications();
    // Dedupe on reference
    const next = [app, ...list.filter((a) => a.reference !== app.reference)].slice(0, 25);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage unavailable — silently ignore */
  }
}

export function removeApplication(reference: string): void {
  try {
    const list = loadSavedApplications().filter((a) => a.reference !== reference);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function clearApplications(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
