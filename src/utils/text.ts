/**
 * Strips emoji and unicode symbol characters from a string.
 * Useful for cleaning display-only text (e.g., sprint titles in lists).
 *
 * Uses Unicode property escapes to match emoji sequences including
 * skin-tone modifiers, ZWJ sequences, and variation selectors.
 */
export function stripEmoji(input: string): string {
  return input
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/\p{Emoji}\uFE0F/gu, '')
    .replace(/[\u200D\uFE0E\uFE0F]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
