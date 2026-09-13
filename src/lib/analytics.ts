/**
 * Google Analytics 4 initialization for Edunova.
 * Measurement ID is injected by the Lovable Google Analytics connector as
 * VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY.
 *
 * Usage:
 *   import { gtag, initAnalytics } from "@/lib/analytics";
 *   initAnalytics();                 // once at app startup
 *   gtag("event", "sign_up", {...}); // custom events
 */

export const GA_MEASUREMENT_ID = import.meta.env
  .VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined;

type GtagArg = string | number | boolean | Date | Record<string, unknown>;

function getGtag(): (...args: GtagArg[]) => void | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as Record<string, unknown>).gtag as
    | ((...args: GtagArg[]) => void)
    | undefined;
}

export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID) {
    console.warn(
      "Google Analytics measurement ID is not configured. " +
        "Connect the Google Analytics connector to enable tracking."
    );
    return;
  }

  // Avoid double-injecting if the tag already exists.
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  const w = window as unknown as Record<string, unknown>;
  w.dataLayer = w.dataLayer || [];
  function gtag(...args: GtagArg[]): void {
    // eslint-disable-next-line prefer-rest-params
    (w.dataLayer as GtagArg[][]).push(args);
  }
  w.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false, // we send page_view manually for SPA route changes
  });
}

/**
 * Fire a gtag event. Safe to call anywhere; silently no-ops if GA is not ready.
 */
export function gtag(...args: GtagArg[]): void {
  const fn = getGtag();
  if (!fn) return;
  fn(...args);
}

/**
 * Track a SPA page view. Call this when the route changes.
 */
export function trackPageView(path: string, title?: string): void {
  gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}
