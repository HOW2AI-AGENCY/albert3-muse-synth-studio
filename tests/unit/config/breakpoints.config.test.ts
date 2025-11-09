import { describe, it, expect } from 'vitest';
import {
  BREAKPOINTS,
  isBreakpoint,
  mediaQuery,
  getScreenCategory,
  breakpointCSSVars,
} from '../../../src/config/breakpoints.config';

describe('breakpoints.config contract', () => {
  it('exposes Tailwind-aligned BREAKPOINTS including 2xl/3xl/4k', () => {
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
    expect(BREAKPOINTS.xl).toBe(1280);
    expect(BREAKPOINTS['2xl']).toBe(1536);
    expect(BREAKPOINTS['3xl']).toBe(1920);
    expect(BREAKPOINTS['4k']).toBe(2560);
  });

  it('mediaQuery builds correct min-width and max-width queries', () => {
    expect(mediaQuery('md', 'min')).toBe('(min-width: 768px)');
    expect(mediaQuery('md', 'max')).toBe('(max-width: 767px)');
    expect(mediaQuery('2xl', 'min')).toBe('(min-width: 1536px)');
    expect(mediaQuery('2xl', 'max')).toBe('(max-width: 1535px)');
  });

  it('isBreakpoint returns true when width >= breakpoint', () => {
    expect(isBreakpoint(1024, 'lg')).toBe(true);
    expect(isBreakpoint(1023, 'lg')).toBe(false);
  });

  it('getScreenCategory maps widths to expected categories', () => {
    expect(getScreenCategory(500)).toBe('mobile');
    expect(getScreenCategory(700)).toBe('tablet');
    expect(getScreenCategory(1100)).toBe('desktop');
    expect(getScreenCategory(1500)).toBe('wide');
    expect(getScreenCategory(2000)).toBe('ultrawide');
  });

  it('breakpointCSSVars exposes CSS custom properties matching BREAKPOINTS', () => {
    expect(breakpointCSSVars['--bp-sm']).toBe(`${BREAKPOINTS.sm}px`);
    expect(breakpointCSSVars['--bp-md']).toBe(`${BREAKPOINTS.md}px`);
    expect(breakpointCSSVars['--bp-lg']).toBe(`${BREAKPOINTS.lg}px`);
    expect(breakpointCSSVars['--bp-xl']).toBe(`${BREAKPOINTS.xl}px`);
    expect(breakpointCSSVars['--bp-2xl']).toBe(`${BREAKPOINTS['2xl']}px`);
    expect(breakpointCSSVars['--bp-3xl']).toBe(`${BREAKPOINTS['3xl']}px`);
    expect(breakpointCSSVars['--bp-4k']).toBe(`${BREAKPOINTS['4k']}px`);
  });
});