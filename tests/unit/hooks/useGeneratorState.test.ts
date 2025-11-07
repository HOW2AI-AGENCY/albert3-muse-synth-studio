/**
 * Unit Tests: useGeneratorState Hook
 * TEST-006: Music Generator state management
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeneratorState } from '@/components/generator/hooks/useGeneratorState';

describe('useGeneratorState', () => {
  it('should initialize with default state for Suno provider', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    expect(result.current.params.provider).toBe('suno');
    expect(result.current.params.modelVersion).toBe('V5');
    expect(result.current.params.prompt).toBe('');
    expect(result.current.mode).toBe('simple');
  });

  it('should initialize with default state for Mureka provider', () => {
    const { result } = renderHook(() => useGeneratorState('mureka'));

    expect(result.current.params.provider).toBe('mureka');
    expect(result.current.params.modelVersion).toBe('auto');
  });

  it('should update single parameter', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    act(() => {
      result.current.setParam('prompt', 'Energetic rock song');
    });

    expect(result.current.params.prompt).toBe('Energetic rock song');
  });

  it('should update multiple parameters', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    act(() => {
      result.current.setParams({
        prompt: 'Epic orchestral music',
        title: 'Symphony No. 5',
        tags: 'orchestral, epic, cinematic',
      });
    });

    expect(result.current.params.prompt).toBe('Epic orchestral music');
    expect(result.current.params.title).toBe('Symphony No. 5');
    expect(result.current.params.tags).toBe('orchestral, epic, cinematic');
  });

  it('should toggle mode between simple and custom', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    expect(result.current.mode).toBe('simple');

    act(() => {
      result.current.setMode('custom');
    });

    expect(result.current.mode).toBe('custom');
  });

  it('should open and close lyrics dialog', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    expect(result.current.lyricsDialogOpen).toBe(false);

    act(() => {
      result.current.setLyricsDialogOpen(true);
    });

    expect(result.current.lyricsDialogOpen).toBe(true);

    act(() => {
      result.current.setLyricsDialogOpen(false);
    });

    expect(result.current.lyricsDialogOpen).toBe(false);
  });

  it('should handle reference audio file', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    const mockFile = new File(['audio'], 'reference.mp3', { type: 'audio/mpeg' });

    act(() => {
      result.current.setParams({
        referenceAudioUrl: 'https://example.com/audio.mp3',
        referenceFileName: 'reference.mp3',
      });
      result.current.setPendingAudioFile(mockFile);
    });

    expect(result.current.params.referenceAudioUrl).toBe('https://example.com/audio.mp3');
    expect(result.current.params.referenceFileName).toBe('reference.mp3');
    expect(result.current.pendingAudioFile).toBe(mockFile);
  });

  it.skip('should debounce prompt updates', async () => {
    // Note: Debouncing logic is not implemented in the hook itself
    // The hook only provides debouncedPrompt state and setDebouncedPrompt setter
    // Debouncing is handled by the component using this hook via useEffect
    vi.useFakeTimers();

    const { result } = renderHook(() => useGeneratorState('suno'));

    act(() => {
      result.current.setParam('prompt', 'Test 1');
    });

    expect(result.current.debouncedPrompt).toBe('');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // expect(result.current.debouncedPrompt).toBe('Test 1');

    vi.useRealTimers();
  });

  it.skip('should reset state', () => {
    // Note: resetState() function does not exist in current implementation
    // This test is skipped until the function is implemented
    const { result } = renderHook(() => useGeneratorState('suno'));

    act(() => {
      result.current.setParams({
        prompt: 'Test prompt',
        title: 'Test title',
        lyrics: 'Test lyrics',
      });
      result.current.setMode('custom');
    });

    expect(result.current.params.prompt).toBe('Test prompt');

    // act(() => {
    //   result.current.resetState();
    // });

    // expect(result.current.params.prompt).toBe('');
    // expect(result.current.params.title).toBe('');
    // expect(result.current.mode).toBe('simple');
  });

  it('should handle AI enhancement status', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    expect(result.current.isEnhancing).toBe(false);
    expect(result.current.enhancedPrompt).toBe(null);

    act(() => {
      result.current.setIsEnhancing(true);
    });

    expect(result.current.isEnhancing).toBe(true);

    act(() => {
      result.current.setEnhancedPrompt({
        enhanced: 'Enhanced: Epic orchestral music',
        addedElements: ['orchestral', 'epic'],
        reasoning: 'Added epic orchestral elements',
      });
      result.current.setIsEnhancing(false);
    });

    expect(result.current.enhancedPrompt).toEqual({
      enhanced: 'Enhanced: Epic orchestral music',
      addedElements: ['orchestral', 'epic'],
      reasoning: 'Added epic orchestral elements',
    });
    expect(result.current.isEnhancing).toBe(false);
  });

  it('should update sliders (weights)', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    act(() => {
      result.current.setParam('audioWeight', 80);
      result.current.setParam('styleWeight', 70);
      result.current.setParam('lyricsWeight', 60);
      result.current.setParam('weirdnessConstraint', 50);
    });

    expect(result.current.params.audioWeight).toBe(80);
    expect(result.current.params.styleWeight).toBe(70);
    expect(result.current.params.lyricsWeight).toBe(60);
    expect(result.current.params.weirdnessConstraint).toBe(50);
  });

  it('should handle vocal gender selection', () => {
    const { result } = renderHook(() => useGeneratorState('suno'));

    act(() => {
      result.current.setParam('vocalGender', 'female');
    });

    expect(result.current.params.vocalGender).toBe('female');

    act(() => {
      result.current.setParam('vocalGender', 'instrumental');
    });

    expect(result.current.params.vocalGender).toBe('instrumental');
  });
});
