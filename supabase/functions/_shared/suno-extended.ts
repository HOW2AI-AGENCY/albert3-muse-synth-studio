/**
 * Extended Suno API methods (Phase 1 Implementation)
 * Adds missing functionality according to official Suno API documentation
 */

import { SunoApiError } from "./suno.ts";

// ============= EXTEND TRACK =============

export interface SunoExtendRequest {
  audioId: string;
  defaultParamFlag: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  instrumental?: boolean;
  personaId?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  model?: string;
  callBackUrl?: string;
}

export interface SunoExtendResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

// ============= COVER IMAGE =============

export interface SunoCoverImageRequest {
  taskId: string;
  callBackUrl: string;
}

export interface SunoCoverImageResult {
  taskId: string;
  images?: string[];
  rawResponse: unknown;
  endpoint: string;
}

// ============= BOOST STYLE =============

export interface SunoBoostStyleRequest {
  content: string;
}

export interface SunoBoostStyleResult {
  taskId: string;
  result: string;
  creditsConsumed: number;
  creditsRemaining: number;
  rawResponse: unknown;
  endpoint: string;
}

// ============= TIMESTAMPED LYRICS =============

export interface SunoTimestampedLyricsRequest {
  taskId: string;
  audioId: string;
}

export interface SunoTimestampedLyricsResult {
  alignedWords: Array<{
    word: string;
    startS: number;
    endS: number;
    success: boolean;
    palign: number;
  }>;
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
  rawResponse: unknown;
  endpoint: string;
}

// ============= HELPER FUNCTIONS =============

const buildSunoHeaders = (apiKey: string): Record<string, string> => ({
  "Authorization": `Bearer ${apiKey}`,
  "Content-Type": "application/json",
});

const safeParseJson = (rawText: string): { json: unknown; parseError: Error | null } => {
  try {
    return { json: JSON.parse(rawText), parseError: null };
  } catch (error) {
    return { json: null, parseError: error as Error };
  }
};

// ============= EXTEND TRACK METHOD =============

export const createExtendTrack = (apiKey: string, fetchImpl: typeof fetch = fetch) => {
  return async (request: SunoExtendRequest): Promise<SunoExtendResult> => {
    const extendEndpoints = [
      "https://api.sunoapi.org/api/v1/generate/extend"
    ];

    const errors: Error[] = [];

    for (const endpoint of extendEndpoints) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: buildSunoHeaders(apiKey),
          body: JSON.stringify(request),
        });

        const rawText = await response.text();
        const { json, parseError } = safeParseJson(rawText);

        if (!response.ok) {
          throw new SunoApiError(`Suno extend failed with status ${response.status}`, {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno extend response", {
            endpoint,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }

        const data = json as any;
        const taskId = data?.data?.taskId || data?.taskId;

        if (!taskId) {
          throw new SunoApiError("Suno extend response did not include taskId", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return {
          taskId,
          rawResponse: json,
          endpoint,
        };
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    throw new SunoApiError("All Suno extend endpoints failed", {
      endpoint: extendEndpoints.join(", "),
      cause: errors[errors.length - 1],
    });
  };
};

// ============= COVER IMAGE METHOD =============

export const createGenerateCoverImage = (apiKey: string, fetchImpl: typeof fetch = fetch) => {
  return async (request: SunoCoverImageRequest): Promise<SunoCoverImageResult> => {
    const coverEndpoints = [
      "https://api.sunoapi.org/api/v1/suno/cover/generate"
    ];

    const errors: Error[] = [];

    for (const endpoint of coverEndpoints) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: buildSunoHeaders(apiKey),
          body: JSON.stringify({
            taskId: request.taskId,
            callBackUrl: request.callBackUrl,
          }),
        });

        const rawText = await response.text();
        const { json, parseError } = safeParseJson(rawText);

        if (!response.ok) {
          throw new SunoApiError(`Suno cover image failed with status ${response.status}`, {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno cover image response", {
            endpoint,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }

        const data = json as any;
        const taskId = data?.data?.taskId || data?.taskId;

        if (!taskId) {
          throw new SunoApiError("Suno cover image response did not include taskId", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return {
          taskId,
          images: data?.data?.images,
          rawResponse: json,
          endpoint,
        };
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    throw new SunoApiError("All cover image endpoints failed", {
      endpoint: coverEndpoints.join(", "),
      cause: errors[errors.length - 1],
    });
  };
};

// ============= BOOST STYLE METHOD =============

export const createBoostStyle = (apiKey: string, fetchImpl: typeof fetch = fetch) => {
  return async (request: SunoBoostStyleRequest): Promise<SunoBoostStyleResult> => {
    const boostEndpoints = [
      "https://api.sunoapi.org/api/v1/style/generate"
    ];

    const errors: Error[] = [];

    for (const endpoint of boostEndpoints) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: buildSunoHeaders(apiKey),
          body: JSON.stringify({ content: request.content }),
        });

        const rawText = await response.text();
        const { json, parseError } = safeParseJson(rawText);

        if (!response.ok) {
          throw new SunoApiError(`Suno boost style failed with status ${response.status}`, {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno boost style response", {
            endpoint,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }

        const data = json as any;
        if (!data?.data?.result) {
          throw new SunoApiError("Suno boost style response did not include result", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return {
          taskId: data.data.taskId || "",
          result: data.data.result,
          creditsConsumed: data.data.creditsConsumed || 0,
          creditsRemaining: data.data.creditsRemaining || 0,
          rawResponse: json,
          endpoint,
        };
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    throw new SunoApiError("All boost style endpoints failed", {
      endpoint: boostEndpoints.join(", "),
      cause: errors[errors.length - 1],
    });
  };
};

// ============= TIMESTAMPED LYRICS METHOD =============

export const createGetTimestampedLyrics = (apiKey: string, fetchImpl: typeof fetch = fetch) => {
  return async (request: SunoTimestampedLyricsRequest): Promise<SunoTimestampedLyricsResult> => {
    const timestampEndpoints = [
      "https://api.sunoapi.org/api/v1/generate/get-timestamped-lyrics"
    ];

    const errors: Error[] = [];

    for (const endpoint of timestampEndpoints) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: buildSunoHeaders(apiKey),
          body: JSON.stringify({
            taskId: request.taskId,
            audioId: request.audioId,
          }),
        });

        const rawText = await response.text();
        const { json, parseError } = safeParseJson(rawText);

        if (!response.ok) {
          throw new SunoApiError(`Suno timestamped lyrics failed with status ${response.status}`, {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        if (parseError) {
          throw new SunoApiError("Unable to parse Suno timestamped lyrics response", {
            endpoint,
            status: response.status,
            body: rawText,
            cause: parseError,
          });
        }

        const data = json as any;
        if (!data?.data) {
          throw new SunoApiError("Suno timestamped lyrics response invalid", {
            endpoint,
            status: response.status,
            body: rawText,
          });
        }

        return {
          alignedWords: data.data.alignedWords || [],
          waveformData: data.data.waveformData || [],
          hootCer: data.data.hootCer || 0,
          isStreamed: data.data.isStreamed || false,
          rawResponse: json,
          endpoint,
        };
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }

    throw new SunoApiError("All timestamped lyrics endpoints failed", {
      endpoint: timestampEndpoints.join(", "),
      cause: errors[errors.length - 1],
    });
  };
};
