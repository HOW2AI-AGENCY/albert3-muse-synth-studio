import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock("@/utils/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

const { ApiService } = await vi.importActual<typeof import("../api.service")>("../api.service");

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
    expect(payload.lyrics).toBe(request.lyrics);
    expect(payload.hasVocals).toBe(true);
    expect(payload.customMode).toBe(true);
  });
});
