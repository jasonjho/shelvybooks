/**
 * Normalizes third-party cover URLs for more reliable rendering.
 *
 * Today we primarily store Google Books cover URLs. In some cases, the same
 * volume ID will return an "image not available" placeholder unless certain
 * query params are present. We normalize to a more reliable variant.
 */
export function normalizeCoverUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);

    // Force https
    url.protocol = 'https:';

    // Google Books covers
    if (url.hostname === 'books.google.com' && url.pathname.startsWith('/books/content')) {
      // Prefer curl edge rendering for better cover availability.
      if (!url.searchParams.get('edge')) url.searchParams.set('edge', 'curl');

      // Prefer higher zoom when present.
      const zoom = url.searchParams.get('zoom');
      if (!zoom || zoom === '1') url.searchParams.set('zoom', '2');
    }

    return url.toString();
  } catch {
    // If it's not a valid URL, just return as-is.
    return rawUrl;
  }
}
