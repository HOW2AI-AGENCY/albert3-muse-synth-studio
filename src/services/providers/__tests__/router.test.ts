import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { generateMusic } from "../router";

const createInvokeResponse = () => ({
  data: { success: true, taskId: "task-1", trackId: "track-1" },
  error: null,
});

describe("Provider router - generateMusic", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("defaults to including vocals when hasVocals is not provided", async () => {
    invokeMock.mockResolvedValue(createInvokeResponse());

    const result = await generateMusic({
      provider: "suno",
      prompt: "Test prompt",
    });

    expect(result).toEqual({ success: true, taskId: "task-1", trackId: "track-1" });
    expect(invokeMock).toHaveBeenCalledTimes(1);

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

    const [, options] = invokeMock.mock.calls[0];
    const payload = (options?.body ?? {}) as Record<string, unknown>;
    expect(payload.make_instrumental).toBe(true);
    expect(payload.hasVocals).toBe(false);
  });
});
