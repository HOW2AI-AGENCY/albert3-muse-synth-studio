import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('px-4 py-2', 'bg-blue-500');
    expect(result).toBe('px-4 py-2 bg-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('removes falsy values', () => {
    const result = cn('px-4', false, null, undefined, 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('handles tailwind merge conflicts', () => {
    const result = cn('px-2 px-4');
    expect(result).toBe('px-4');
  });

  it('merges conflicting responsive classes', () => {
    const result = cn('p-2 md:p-4', 'p-3');
    expect(result).toBe('md:p-4 p-3');
  });

  it('handles arrays of classes', () => {
    const result = cn(['px-4', 'py-2'], ['bg-blue-500']);
    expect(result).toBe('px-4 py-2 bg-blue-500');
  });

  it('handles objects with boolean values', () => {
    const result = cn({
      'px-4': true,
      'py-2': false,
      'bg-blue-500': true,
    });
    expect(result).toBe('px-4 bg-blue-500');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(undefined)).toBe('');
  });

  it('handles complex nested structures', () => {
    const shouldInclude = false;
    const result = cn(
      'base',
      ['array-class-1', { 'conditional': true }],
      { 'object-class': true },
      shouldInclude && 'never-included'
    );
    expect(result).toBe('base array-class-1 conditional object-class');
  });

  it('deduplicates identical classes', () => {
    const result = cn('px-4', 'px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });
});
