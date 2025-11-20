/**
 * Canonicalizes text for TTS caching by normalizing content variations
 * that should produce the same audio output.
 */

/**
 * Canonicalize text according to TTS caching rules
 * @param text - Input text to canonicalize
 * @returns Object with canonical text and SHA-256 hash
 */
export async function canonicalizeText(text: string): Promise<{ canonical: string; hash: string }> {
  let canonical = text;

  // 1. Trim whitespace at start/end
  canonical = canonical.trim();

  // 2. Normalize quotes and apostrophes
  canonical = canonical
    .replace(/['']/g, "'")  // Normalize apostrophes
    .replace(/[""]/g, '"'); // Normalize quotes

  // 3. Replace dates with {{DATE}}
  // Format: YYYY-MM-DD or YYYY/MM/DD
  canonical = canonical.replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, '{{DATE}}');
  
  // Format: DD/MM/YYYY or DD-MM-YYYY
  canonical = canonical.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g, '{{DATE}}');
  
  // Format: "Nov 20" or "20 Nov" or "November 20" or "20 November"
  const monthNames = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December';
  canonical = canonical.replace(
    new RegExp(`\\b(${monthNames})\\s+\\d{1,2}\\b`, 'gi'),
    '{{DATE}}'
  );
  canonical = canonical.replace(
    new RegExp(`\\b\\d{1,2}\\s+(${monthNames})\\b`, 'gi'),
    '{{DATE}}'
  );

  // 4. Replace times with {{TIME}}
  // Format: HH:MM or H:MM
  canonical = canonical.replace(/\b\d{1,2}:\d{2}\b/g, '{{TIME}}');
  
  // Format: "6pm", "6 pm", "6:30pm", "6:30 pm"
  canonical = canonical.replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi, '{{TIME}}');

  // 5. Collapse multiple spaces into one
  canonical = canonical.replace(/\s+/g, ' ');

  // 6. Remove trailing punctuation duplicates (!!, ??, ...)
  canonical = canonical.replace(/([!?.])\1+/g, '$1');

  // 7. Lowercase everything except placeholders
  const placeholders: string[] = [];
  canonical = canonical.replace(/\{\{[A-Z]+\}\}/g, (match) => {
    const index = placeholders.length;
    placeholders.push(match);
    return `__PLACEHOLDER_${index}__`;
  });
  
  canonical = canonical.toLowerCase();
  
  placeholders.forEach((placeholder, index) => {
    canonical = canonical.replace(`__placeholder_${index}__`, placeholder);
  });

  // 8. Final trim
  canonical = canonical.trim();

  // Compute SHA-256 hash
  const hash = await computeSHA256(canonical);

  return { canonical, hash };
}

/**
 * Compute SHA-256 hash of a string
 * @param text - Text to hash
 * @returns Hex string of the hash
 */
async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
