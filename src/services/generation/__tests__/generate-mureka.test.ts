import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationService, type GenerationRequest } from '../GenerationService';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GenerationService.generate (Mureka)', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({
      data: { trackId: 'mock-track', message: 'generation started' },
      error: null,
    });
  });

  it('passes styleTags and modelVersion to the Mureka edge function', async () => {
    const request: GenerationRequest = {
      provider: 'mureka',
      prompt: 'Ambient focus music',
      title: 'Focus Flow',
      styleTags: ['ambient', 'focus'],
      modelVersion: 'o1-beta',
      hasVocals: false,
      isBGM: true,
      idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = await GenerationService.generate(request);

    expect(result.success).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(1);

    const [functionName, options] = invokeMock.mock.calls[0];
    expect(functionName).toBe('generate-mureka');

    const payload = (options?.body ?? {}) as Record<string, unknown>;
    expect(payload.styleTags).toEqual(request.styleTags);
    expect(payload.modelVersion).toBe(request.modelVersion);
    expect(payload.hasVocals).toBe(false);
    expect(payload.isBGM).toBe(true);
    expect(payload.idempotencyKey).toBe(request.idempotencyKey);
  });

  it('passes styleTags when provided', async () => {
    const request: GenerationRequest = {
      provider: 'mureka',
      prompt: 'Lo-fi beats',
      styleTags: ['lofi', 'calm'],
      modelVersion: 'o1',
    };

    await GenerationService.generate(request);

    const [, options] = invokeMock.mock.calls[0];
    const payload = (options?.body ?? {}) as Record<string, unknown>;

    expect(payload.styleTags).toEqual(request.styleTags);
    expect(payload.modelVersion).toBe(request.modelVersion);
  });
});
