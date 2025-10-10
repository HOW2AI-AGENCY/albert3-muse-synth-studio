import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
    from: fromMock,
  },
}));

vi.mock("@/utils/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

vi.stubGlobal("localStorage", localStorageMock as unknown as Storage);

const { ApiService } = await vi.importActual<typeof import("../api.service")>("../api.service");
const { trackCache } = await vi.importActual<typeof import("@/features/tracks/api/trackCache")>("@/features/tracks/api/trackCache");

describe("ApiService.generateMusic", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("sends lyrics and related flags in the payload", async () => {
    invokeMock.mockResolvedValue({ data: { success: true, trackId: "track-123" }, error: null });

    const request = {
      trackId: "track-123",
      prompt: "Synthwave anthem",
      title: "My Track",
      provider: "suno" as const,
      lyrics: "Line one\nLine two",
      hasVocals: true,
      customMode: true,
      styleTags: ["synth"],
      modelVersion: "chirp-v3-5",
    };

    await ApiService.generateMusic(request);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [functionName, options] = invokeMock.mock.calls[0];
    expect(functionName).toBe("generate-suno");

    const payload = (options?.body ?? {}) as Record<string, unknown>;
    expect(payload.trackId).toBe(request.trackId);
    // In custom mode, the lyrics are now sent in the 'prompt' field.
    expect(payload.prompt).toBe(request.lyrics);
    // The 'hasVocals' field is replaced by 'instrumental'.
    expect(payload.instrumental).toBe(false);
    expect(payload.customMode).toBe(true);
    // The 'tags' array is converted to a comma-separated 'style' string.
    expect(payload.style).toBe(request.styleTags.join(', '));
  });
});

describe("ApiService.getUserTracks", () => {
  const createErroredQuery = () => {
    const response = Promise.resolve({
      data: null,
      error: {
        message: "Supabase unavailable",
        details: "network error",
        hint: null,
        code: "500",
      },
    });

    const chain: Record<string, unknown> = {};

    Object.assign(chain, {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => response),
    });

    return chain;
  };

  beforeEach(() => {
    invokeMock.mockReset();
    fromMock.mockReset();
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    trackCache.clearCache();
  });

  it("falls back to cached tracks when Supabase fails", async () => {
    const userId = "user-123";
    const cachedTrack = {
      id: "track-1",
      title: "Cached Track",
      artist: "Offline Artist",
      audio_url: "https://example.com/audio.mp3",
      image_url: "https://example.com/cover.jpg",
      duration: 180,
      genre: "synthwave",
      created_at: new Date().toISOString(),
    } as const;

    trackCache.setTrack(cachedTrack);

    fromMock.mockReturnValue(createErroredQuery());

    const result = await ApiService.getUserTracks(userId);

    expect(fromMock).toHaveBeenCalledWith("tracks");
    expect(result).toHaveLength(1);
    const [track] = result;
    expect(track.id).toBe(cachedTrack.id);
    expect(track.audio_url).toBe(cachedTrack.audio_url);
    expect(track.status).toBe("completed");
    expect(track.user_id).toBe(userId);
  });
});
