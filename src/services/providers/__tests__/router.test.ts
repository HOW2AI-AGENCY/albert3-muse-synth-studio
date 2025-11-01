import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: loggerMock,
}));

import { generateMusic, isProviderAvailable } from "../router";

const createInvokeResponse = () => ({
  data: { success: true, taskId: "task-1", trackId: "track-1" },
  error: null,
});

describe("Provider router - generateMusic", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.error.mockReset();
  });

  it("defaults to including vocals when hasVocals is not provided", async () => {
    invokeMock.mockResolvedValue(createInvokeResponse());

    const result = await generateMusic({
      provider: "suno",
      prompt: "Test prompt",
    });

    expect(result).toEqual({ success: true, taskId: "task-1", trackId: "track-1" });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith(
      "Routing music generation",
      "ProviderRouter",
      { provider: "suno" },
    );

    const [functionName, options] = invokeMock.mock.calls[0];
    expect(functionName).toBe("generate-suno");

    const payload = (options?.body ?? {}) as Record<string, unknown>;
    expect(payload.make_instrumental).toBe(false);
    expect(payload.hasVocals).toBeUndefined();
  });

  it("requests an instrumental when hasVocals is explicitly false", async () => {
    invokeMock.mockResolvedValue(createInvokeResponse());

    await generateMusic({
      provider: "suno",
      prompt: "Instrumental please",
      hasVocals: false,
    });

    expect(loggerMock.info).toHaveBeenCalledWith(
      "Routing music generation",
      "ProviderRouter",
      { provider: "suno" },
    );

    const [, options] = invokeMock.mock.calls[0];
    const payload = (options?.body ?? {}) as Record<string, unknown>;
    expect(payload.make_instrumental).toBe(true);
    expect(payload.hasVocals).toBe(false);
  });

  it("includes track identifiers in log metadata when provided", async () => {
    invokeMock.mockResolvedValue(createInvokeResponse());

    await generateMusic({
      provider: "suno",
      prompt: "Track logging",
      trackId: "track-99",
    });

    expect(loggerMock.info).toHaveBeenCalledWith(
      "Routing music generation",
      "ProviderRouter",
      { provider: "suno", trackId: "track-99" },
    );
  });
});

describe("Provider router - isProviderAvailable", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    loggerMock.warn.mockReset();
  });

  it("logs a warning with context when balance retrieval fails", async () => {
    invokeMock.mockRejectedValue(new Error("network down"));

    const available = await isProviderAvailable("suno");

    expect(available).toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      "Provider availability check failed",
      "ProviderRouter",
      { provider: "suno", error: "network down" },
    );
  });
});
