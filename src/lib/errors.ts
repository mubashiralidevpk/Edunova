import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

/**
 * Human-readable error handling for Edunova.
 * Turns raw backend / edge-function / Postgres errors into clear guidance.
 */

const PG_MESSAGES: Record<string, string> = {
  '23505': 'This record already exists. Please use a different value.',
  '23503': 'This item is linked to other records, so it can’t be changed or removed yet.',
  '23502': 'A required field is missing. Please fill in all required fields.',
  '22P02': 'One of the values has the wrong format. Please check your input.',
  '42501': 'You don’t have permission to do this.',
  '42P01': 'That data isn’t available yet. Please refresh and try again.',
  'PGRST116': 'No matching record was found.',
  'PGRST301': 'Your session expired. Please sign in again.',
};

const AUTH_PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Incorrect email or password. Please try again.'],
  [/email not confirmed/i, 'Please confirm your email address before signing in.'],
  [/user already registered|already been registered/i, 'An account with this email already exists. Try signing in instead.'],
  [/password should be at least/i, 'Your password is too short — use at least 6 characters.'],
  [/pwned|compromised|data breach/i, 'This password has appeared in a data breach. Please choose a stronger one.'],
  [/rate limit|too many requests|429/i, 'Too many attempts. Please wait a moment and try again.'],
  [/jwt expired|invalid token|session/i, 'Your session expired. Please sign in again.'],
  [/failed to fetch|networkerror|network request failed/i, 'Can’t reach the server. Check your internet connection and try again.'],
  [/row-level security|violates row-level/i, 'You don’t have permission to perform this action.'],
  [/timeout|timed out/i, 'The request took too long. Please try again.'],
];

function fromMessage(msg: string): string | null {
  for (const [re, friendly] of AUTH_PATTERNS) if (re.test(msg)) return friendly;
  return null;
}

function extractFromBody(body: string): string | null {
  try {
    const json = JSON.parse(body);
    const raw = json.error?.message || json.error || json.message || json.msg || json.details || json.hint;
    if (typeof raw === 'string' && raw.trim()) return fromMessage(raw) || raw.trim();
  } catch {
    if (body && body.length < 400 && !body.startsWith('<')) return body.trim();
  }
  return null;
}

/** Resolve any thrown value into a clear, user-facing sentence. */
export async function resolveErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): Promise<string> {
  if (!error) return fallback;

  // Edge function returned a non-2xx status — read the real reason from the body
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.text();
      const parsed = extractFromBody(body);
      if (parsed) return parsed;
      const status = error.context.status;
      if (status === 401 || status === 403) return 'You don’t have permission to perform this action.';
      if (status === 404) return 'That service isn’t available right now.';
      if (status === 429) return 'Too many requests. Please wait a moment and try again.';
      if (status >= 500) return 'The server had a problem completing this. Please try again shortly.';
    } catch {
      /* fall through */
    }
    return fallback;
  }
  if (error instanceof FunctionsRelayError) return 'The server could not be reached. Please try again.';
  if (error instanceof FunctionsFetchError) return 'Can’t reach the server. Check your internet connection and try again.';

  if (typeof error === 'string') return fromMessage(error) || error;

  const e = error as { code?: string; message?: string; details?: string; hint?: string; error_description?: string; status?: number };

  if (e.code && PG_MESSAGES[e.code]) return PG_MESSAGES[e.code];

  const msg = e.message || e.error_description || e.details || '';
  if (msg) {
    const friendly = fromMessage(msg);
    if (friendly) return friendly;
    if (/edge function returned a non-2xx status code/i.test(msg)) {
      return 'The server rejected this request. Please check your input and try again.';
    }
    if (e.hint) return `${msg} — ${e.hint}`;
    return msg;
  }

  if (e.status === 401 || e.status === 403) return 'You don’t have permission to perform this action.';
  return fallback;
}

/** Synchronous variant for non-async contexts (no edge-function body read). */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return fromMessage(error) || error;
  const e = error as { code?: string; message?: string; hint?: string };
  if (e.code && PG_MESSAGES[e.code]) return PG_MESSAGES[e.code];
  if (e.message) return fromMessage(e.message) || e.message;
  return fallback;
}

/** Show a clear destructive toast for any error. */
export async function toastError(error: unknown, title = 'Action failed', fallback?: string) {
  const description = await resolveErrorMessage(error, fallback);
  console.error(`[${title}]`, error);
  toast({ variant: 'destructive', title, description });
  return description;
}

export function toastSuccess(title: string, description?: string) {
  toast({ title, description });
}

/**
 * Safe wrapper around supabase.functions.invoke.
 * Converts opaque "Edge Function returned a non-2xx status code" failures into
 * the real, human-readable reason before it ever reaches the UI.
 */
export async function invokeFn<T = any>(
  name: string,
  options?: { body?: unknown; headers?: Record<string, string> },
): Promise<{ data: T | null; error: Error | null }> {
  const { supabase } = await import('@/integrations/supabase/client');
  try {
    const { data, error } = await supabase.functions.invoke(name, options as any);
    if (error) {
      return { data: null, error: new Error(await resolveErrorMessage(error, `The "${name}" service could not complete this request.`)) };
    }
    const payload = data as any;
    if (payload && typeof payload === 'object' && payload.error) {
      const message = typeof payload.error === 'string' ? payload.error : payload.error.message || 'Request failed.';
      return { data: null, error: new Error(getErrorMessage(message)) };
    }
    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: new Error(await resolveErrorMessage(err, 'Can’t reach the server. Please check your connection and try again.')) };
  }
}
