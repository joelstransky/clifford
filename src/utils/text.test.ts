import { describe, it, expect } from 'bun:test';
import { stripEmoji, stripAnsi } from './text';

describe('stripEmoji', () => {
  it('should remove a leading rocket emoji', () => {
    expect(stripEmoji('🚀 My Sprint')).toBe('My Sprint');
  });

  it('should remove multiple emojis', () => {
    expect(stripEmoji('🔥 Hot Sprint 🎉')).toBe('Hot Sprint');
  });

  it('should return plain text unchanged', () => {
    expect(stripEmoji('Plain Sprint Name')).toBe('Plain Sprint Name');
  });

  it('should handle empty string', () => {
    expect(stripEmoji('')).toBe('');
  });

  it('should handle string that is only emojis', () => {
    expect(stripEmoji('🚀🔥🎉')).toBe('');
  });

  it('should preserve numbers and special chars', () => {
    expect(stripEmoji('Sprint #1 (v2.0)')).toBe('Sprint #1 (v2.0)');
  });

  it('should collapse extra whitespace after removal', () => {
    expect(stripEmoji('🚀  Double  Space')).toBe('Double Space');
  });

  it('should handle emoji in the middle of text', () => {
    expect(stripEmoji('Before 🎯 After')).toBe('Before After');
  });

  it('should handle check mark emoji', () => {
    expect(stripEmoji('✅ Done Sprint')).toBe('Done Sprint');
  });

  it('should handle flag emojis', () => {
    expect(stripEmoji('🇺🇸 USA Sprint')).toBe('USA Sprint');
  });
});

describe('stripAnsi', () => {
  it('should pass plain text through unchanged', () => {
    expect(stripAnsi('hello world')).toBe('hello world');
  });

  it('should strip SGR color codes', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red');
  });

  it('should strip SGR background codes', () => {
    expect(stripAnsi('\x1b[41mhighlighted\x1b[0m')).toBe('highlighted');
  });

  it('should strip multiple SGR sequences in one string', () => {
    expect(stripAnsi('\x1b[1m\x1b[32mBold Green\x1b[0m normal \x1b[4munderline\x1b[0m'))
      .toBe('Bold Green normal underline');
  });

  it('should handle empty string', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('should handle compound SGR params (e.g. 38;5;196)', () => {
    expect(stripAnsi('\x1b[38;5;196mextended color\x1b[0m')).toBe('extended color');
  });
});
