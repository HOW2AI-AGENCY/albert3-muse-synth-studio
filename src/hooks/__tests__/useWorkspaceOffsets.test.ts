import { renderHook, act } from '@testing-library/react';
import { useWorkspaceOffsets } from '../useWorkspaceOffsets';

describe('useWorkspaceOffsets', () => {
  let miniPlayer: HTMLDivElement;
  let bottomNav: HTMLDivElement;

  beforeEach(() => {
    // Reset styles
    document.documentElement.style.cssText = '';

    // Create mock elements
    miniPlayer = document.createElement('div');
    miniPlayer.setAttribute('data-testid', 'mini-player');
    Object.defineProperty(miniPlayer, 'offsetHeight', { value: 60, configurable: true });

    bottomNav = document.createElement('div');
    bottomNav.setAttribute('data-bottom-tab-bar', 'true');
    Object.defineProperty(bottomNav, 'offsetHeight', { value: 80, configurable: true });

    document.body.appendChild(miniPlayer);
    document.body.appendChild(bottomNav);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should set initial CSS variables correctly', () => {
    renderHook(() => useWorkspaceOffsets());
    const styles = window.getComputedStyle(document.documentElement);

    expect(styles.getPropertyValue('--mini-player-height')).toBe('60px');
    expect(styles.getPropertyValue('--bottom-tab-bar-height')).toBe('80px');
    expect(styles.getPropertyValue('--workspace-bottom-offset')).toBe('140px');
  });

  it('should not set variables if elements are not found', () => {
    document.body.innerHTML = ''; // Clear the body

    renderHook(() => useWorkspaceOffsets());
    const styles = window.getComputedStyle(document.documentElement);

    // When elements are not found, heights are 0
    expect(styles.getPropertyValue('--mini-player-height')).toBe('0px');
    expect(styles.getPropertyValue('--bottom-tab-bar-height')).toBe('0px');
    expect(styles.getPropertyValue('--workspace-bottom-offset')).toBe('0px');
  });

  it('should update CSS variables on resize', () => {
    renderHook(() => useWorkspaceOffsets());

    // Simulate a resize event that changes the height
    Object.defineProperty(miniPlayer, 'offsetHeight', { value: 70 });
    Object.defineProperty(bottomNav, 'offsetHeight', { value: 90 });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const styles = window.getComputedStyle(document.documentElement);

    expect(styles.getPropertyValue('--mini-player-height')).toBe('70px');
    expect(styles.getPropertyValue('--bottom-tab-bar-height')).toBe('90px');
    expect(styles.getPropertyValue('--workspace-bottom-offset')).toBe('160px');
  });
});
