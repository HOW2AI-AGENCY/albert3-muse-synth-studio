import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { UseGeneratorStateReturn } from '@/components/generator/hooks';
import { MusicGeneratorContainer } from '@/components/generator/MusicGeneratorContainer';

const contentMock = vi.hoisted(() => vi.fn(() => null));
const useGeneratorStateMock = vi.hoisted(() => vi.fn());
const useStemReferenceLoaderMock = vi.hoisted(() => vi.fn());
const usePendingGenerationLoaderMock = vi.hoisted(() => vi.fn());
const useAudioUploadHandlerMock = vi.hoisted(() => vi.fn());
const useMurekaLyricsSubscriptionMock = vi.hoisted(() => vi.fn());
const generateMock = vi.hoisted(() => vi.fn());
const savePromptMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const vibrateMock = vi.hoisted(() => vi.fn());
const setProviderMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/generator/MusicGeneratorContent', () => ({
  MusicGeneratorContent: (props: any) => {
    contentMock(props);
    return null;
  },
}));

vi.mock('@/components/generator/hooks', () => ({
  useGeneratorState: (...args: any[]) => useGeneratorStateMock(...args),
  useStemReferenceLoader: (...args: any[]) => useStemReferenceLoaderMock(...args),
  usePendingGenerationLoader: (...args: any[]) => usePendingGenerationLoaderMock(...args),
  useAudioUploadHandler: (...args: any[]) => useAudioUploadHandlerMock(...args),
}));

vi.mock('@/components/generator/hooks/useMurekaLyricsSubscription', () => ({
  useMurekaLyricsSubscription: (options: any) => {
    useMurekaLyricsSubscriptionMock(options);
    return { start: vi.fn(), stop: vi.fn(), isActive: false };
  },
}));

vi.mock('@/stores/useMusicGenerationStore', () => ({
  useMusicGenerationStore: (selector?: any) => {
    const state = { selectedProvider: selectedProviderRef.value, setProvider: setProviderMock }; 
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/hooks/useGenerateMusic', () => ({
  useGenerateMusic: () => ({ generate: generateMock, isGenerating: isGeneratingRef.value }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ vibrate: vibrateMock }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/usePromptHistory', () => ({
  usePromptHistory: () => ({ savePrompt: savePromptMock }),
}));

vi.mock('@/hooks/useBreakpoints', () => ({
  useBreakpoints: () => ({ isMobile: false }),
}));

vi.mock('@/config/provider-models', () => ({
  getProviderModels: () => [{ value: 'model-1', label: 'Model 1', description: 'desc' }],
  getDefaultModel: () => ({ value: 'model-1', label: 'Model 1', description: 'desc' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const selectedProviderRef = { value: 'suno' } as { value: 'suno' | 'mureka' };
const isGeneratingRef = { value: false } as { value: boolean };

type PartialState = Partial<UseGeneratorStateReturn> & {
  params: UseGeneratorStateReturn['params'];
};

const createStateMock = (overrides?: PartialState): UseGeneratorStateReturn => {
  const base: UseGeneratorStateReturn = {
    params: {
      prompt: 'Test prompt',
      lyrics: 'Test lyrics',
      tags: 'rock, pop',
      negativeTags: 'slow',
      weirdnessConstraint: 50,
      styleWeight: 80,
      lyricsWeight: 70,
      audioWeight: 60,
      modelVersion: 'model-1',
      referenceAudioUrl: null,
      referenceFileName: null,
      referenceTrackId: null,
      personaId: null,
      activeProjectId: null,
      inspoProjectId: null,
      provider: 'suno',
      title: 'Title',
      trackId: 'track-123',
      vocalGender: 'any',
    },
    mode: 'custom',
    showPresets: true,
    setMode: vi.fn(),
    setShowPresets: vi.fn(),
    setParam: vi.fn(),
    setParams: vi.fn(),
    setDebouncedPrompt: vi.fn(),
    setDebouncedLyrics: vi.fn(),
    debouncedPrompt: 'Test prompt',
    debouncedLyrics: 'Test lyrics',
    setIsEnhancing: vi.fn(),
    isEnhancing: false,
    enhancedPrompt: null,
    setEnhancedPrompt: vi.fn(),
    audioPreviewOpen: false,
    setAudioPreviewOpen: vi.fn(),
    setPendingAudioFile: vi.fn(),
    pendingAudioFile: null,
    setLyricsDialogOpen: vi.fn(),
    lyricsDialogOpen: false,
    setHistoryDialogOpen: vi.fn(),
    historyDialogOpen: false,
    setMurekaLyricsDialog: vi.fn(),
    murekaLyricsDialog: { open: false, trackId: '', jobId: '' },
    audioPreviewUrl: '',
    audioPreviewFileName: '',
  } as unknown as UseGeneratorStateReturn;

  return {
    ...base,
    ...overrides,
    params: { ...base.params, ...(overrides?.params ?? {}) },
  };
};

let stateMock: UseGeneratorStateReturn;

beforeEach(() => {
  stateMock = createStateMock();
  contentMock.mockClear();
  useGeneratorStateMock.mockReset();
  useGeneratorStateMock.mockReturnValue(stateMock);
  useStemReferenceLoaderMock.mockReset();
  usePendingGenerationLoaderMock.mockReset();
  useAudioUploadHandlerMock.mockReset();
  useAudioUploadHandlerMock.mockReturnValue({
    handleAudioConfirm: vi.fn(),
    handleRemoveAudio: vi.fn(),
  });
  useMurekaLyricsSubscriptionMock.mockReset();
  generateMock.mockReset();
  generateMock.mockResolvedValue(true);
  savePromptMock.mockReset();
  savePromptMock.mockResolvedValue(undefined);
  toastMock.mockReset();
  vibrateMock.mockReset();
  setProviderMock.mockReset();
  selectedProviderRef.value = 'suno';
  isGeneratingRef.value = false;
});

describe('MusicGeneratorContainer', () => {
  it('triggers generation and clears fields on success', async () => {
    render(<MusicGeneratorContainer />);

    const props = contentMock.mock.calls.at(-1)?.[0];
    expect(props).toBeDefined();

    await props.onGenerate();

    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Test prompt',
        lyrics: 'Test lyrics',
        styleTags: ['rock', 'pop'],
        provider: 'suno',
      })
    );
    expect(savePromptMock).toHaveBeenCalled();
    expect(stateMock.setParams).toHaveBeenCalled();

    const resetFn = stateMock.setParams.mock.calls.at(-1)?.[0];
    const result = resetFn(stateMock.params);
    expect(result.prompt).toBe('');
    expect(result.lyrics).toBe('');
    expect(result.tags).toBe('');
    expect(stateMock.setDebouncedPrompt).toHaveBeenCalledWith('');
    expect(stateMock.setDebouncedLyrics).toHaveBeenCalledWith('');
  });

  it('clears reference audio when switching to mureka provider', async () => {
    selectedProviderRef.value = 'mureka';
    stateMock.params.referenceAudioUrl = 'https://example.com/ref.mp3';
    stateMock.params.referenceFileName = 'ref.mp3';

    render(<MusicGeneratorContainer />);

    await waitFor(() => {
      expect(stateMock.setParams).toHaveBeenCalled();
    });

    const updater = stateMock.setParams.mock.calls.at(-1)?.[0];
    const next = updater(stateMock.params);
    expect(next.referenceAudioUrl).toBeNull();
    expect(next.referenceFileName).toBeNull();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Референс удалён'),
      })
    );
  });

  it('passes trackId to Mureka lyrics subscription', () => {
    stateMock.params.trackId = 'track-999';
    render(<MusicGeneratorContainer />);

    expect(useMurekaLyricsSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 'track-999', enabled: true })
    );
  });
});
