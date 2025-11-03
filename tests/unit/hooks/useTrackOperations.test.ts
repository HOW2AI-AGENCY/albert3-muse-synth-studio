import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTrackOperations } from "@/hooks/tracks/useTrackOperations";
import { createMockTrack } from "@/test/utils/test-helpers";
import type { Track } from "@/services/api.service";

const mockUseAuth = vi.fn();
const toastMock = vi.fn();
const generateMock = vi.fn();
const logInfoMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/services/generation", () => ({
  GenerationService: {
    generate: (...args: unknown[]) => generateMock(...args),
  },
}));

vi.mock("@/utils/logger", () => ({
  logInfo: (...args: unknown[]) => logInfoMock(...args),
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

const createAuthValue = (user: { id: string; email?: string } | null) => ({
  user,
  userId: user?.id ?? null,
  session: null,
  isLoading: false,
  refresh: vi.fn(),
});

describe("useTrackOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReset();
    toastMock.mockReset();
    generateMock.mockReset();
    logInfoMock.mockReset();
    logErrorMock.mockReset();
  });

  it("blocks retry when user is not authenticated", async () => {
    const track = createMockTrack({ status: "failed" });
    mockUseAuth.mockReturnValue(createAuthValue(null));

    const { result } = renderHook(() => useTrackOperations());

    await act(async () => {
      const outcome = await result.current.retryTrackGeneration({
        track: track as unknown as Track,
      });

      expect(outcome.success).toBe(false);
      expect(outcome.reason).toBe("unauthorized");
    });

    expect(generateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ошибка",
        variant: "destructive",
      })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      "Track retry blocked: no user",
      "useTrackOperations",
      expect.objectContaining({ trackId: track.id })
    );
  });

  it("restarts generation successfully", async () => {
    const track = createMockTrack({
      status: "failed",
      provider: "suno",
      lyrics: "Test lyrics",
      style_tags: ["pop", "electro"],
      has_vocals: true,
    });
    const onSuccess = vi.fn();

    mockUseAuth.mockReturnValue(
      createAuthValue({ id: "user-123", email: "user@example.com" })
    );
    generateMock.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTrackOperations());

    await act(async () => {
      const outcome = await result.current.retryTrackGeneration({
        track: track as unknown as Track,
        onSuccess,
      });

      expect(outcome.success).toBe(true);
    });

    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: track.title,
        prompt: track.prompt,
        provider: "suno",
        hasVocals: true,
        lyrics: track.lyrics,
        styleTags: track.style_tags,
      })
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(toastMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: "Повторная генерация" })
    );
    expect(toastMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: "Успешно" })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      "Track retry initiated",
      "useTrackOperations",
      expect.objectContaining({
        trackId: track.id,
        provider: "suno",
        userId: "user-123",
      })
    );
  });

  it("handles generation errors and surfaces feedback", async () => {
    const track = createMockTrack({ status: "failed", provider: "mureka" });
    const error = new Error("Generation failed");

    mockUseAuth.mockReturnValue(
      createAuthValue({ id: "user-999", email: "tester@example.com" })
    );
    generateMock.mockRejectedValue(error);

    const { result } = renderHook(() => useTrackOperations());

    await act(async () => {
      const outcome = await result.current.retryTrackGeneration({
        track: track as unknown as Track,
      });

      expect(outcome.success).toBe(false);
      expect(outcome.reason).toBe("error");
      expect(outcome.error).toBe(error);
    });

    expect(generateMock).toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalledWith(
      "Track retry failed",
      error,
      "useTrackOperations",
      expect.objectContaining({ trackId: track.id, provider: "mureka" })
    );
    expect(toastMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Ошибка",
        variant: "destructive",
        description: error.message,
      })
    );
  });
});
