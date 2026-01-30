/**
 * Amazon Associates link generation utilities
 * Uses ISBN-10 as ASIN when available (for most books, ISBN-10 = ASIN)
 */

const AMAZON_ASSOCIATE_TAG = 'shelvybooks-20';

/**
 * Convert ISBN-13 to ISBN-10 (only works for 978 prefix)
 * ISBN-13 with 979 prefix cannot be converted to ISBN-10
 */
function isbn13ToIsbn10(isbn13: string): string | null {
  // Remove hyphens and spaces
  const cleaned = isbn13.replace(/[-\s]/g, '');
  
  // Must be 13 digits starting with 978
  if (cleaned.length !== 13 || !cleaned.startsWith('978')) {
    return null;
  }
  
  // Take digits 4-12 (9 digits after 978, excluding check digit)
  const isbn10Base = cleaned.slice(3, 12);
  
  // Calculate ISBN-10 check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn10Base[i], 10) * (10 - i);
  }
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? '0' : remainder === 1 ? 'X' : String(11 - remainder);
  
  return isbn10Base + checkDigit;
}

/**
 * Extract ISBN-10 from any ISBN string
 * Returns ISBN-10 if valid, or converts from ISBN-13 if possible
 */
function getIsbn10(isbn: string): string | null {
  const cleaned = isbn.replace(/[-\s]/g, '');
  
  // Already ISBN-10
  if (cleaned.length === 10) {
    return cleaned;
  }
  
  // Try to convert from ISBN-13
  if (cleaned.length === 13) {
    return isbn13ToIsbn10(cleaned);
  }
  
  return null;
}

/**
 * Generate Amazon book URL with affiliate tag
 * Uses direct product link when ISBN is available, falls back to search
 */
export function getAmazonBookUrl(
  title: string,
  author: string,
  isbn?: string | null
): string {
  // Try to use ISBN-10 as ASIN for direct product link
  if (isbn) {
    const isbn10 = getIsbn10(isbn);
    if (isbn10) {
      return `https://www.amazon.com/dp/${isbn10}/?tag=${AMAZON_ASSOCIATE_TAG}`;
    }
  }
  
  // Fallback to search URL with tag
  const query = encodeURIComponent(`${title} ${author}`);
  return `https://www.amazon.com/s?k=${query}&i=stripbooks&tag=${AMAZON_ASSOCIATE_TAG}`;
}
