/**
 * Build a Google Maps directions link from school coordinates.
 * Returns null when coordinates are missing.
 */
export function schoolMapLink(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${la},${ln}&travelmode=driving`;
}

export function schoolPinLink(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${la},${ln}`;
}
