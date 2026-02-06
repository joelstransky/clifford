import { describe, it, expect } from 'bun:test';
import { stripEmoji } from './text';

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
