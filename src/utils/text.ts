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

/**
 * Strip ANSI SGR (Select Graphic Rendition) sequences from a string.
 * These control text color, background, bold, etc. and cause rendering
 * issues when piped into OpenTUI's text renderables.
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}
