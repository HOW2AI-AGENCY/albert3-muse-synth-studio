import {
  createExtendTrack,
  createGenerateCoverImage,
  createBoostStyle,
  createGetTimestampedLyrics,
} from "./suno-extended.ts";
import type { CreateSunoClientOptions } from "./suno.types.ts";
import { generateTrack, queryTask } from "./suno.generation.ts";
import { generateLyrics, queryLyricsTask } from "./suno.lyrics.ts";
import { requestStemSeparation, queryStemTask } from "./suno.stems.ts";
import { convertToWav, queryWavTask } from "./suno.wav.ts";
import { SunoApiError } from "./suno.error.ts";

export { SunoApiError };

export const createSunoClient = (options: CreateSunoClientOptions) => {
  const {
    apiKey,
    fetchImpl = fetch,
    generateEndpoints,
    queryEndpoints,
    stemEndpoints,
    stemQueryEndpoints,
    lyricsGenerateEndpoints,
    lyricsQueryEndpoints,
    wavGenerateEndpoints,
    wavQueryEndpoints,
  } = options;

  if (!apiKey) {
    throw new Error("SUNO_API_KEY is required to create a Suno client");
  }

  return {
    generateTrack: (payload: any) =>
      generateTrack(payload, apiKey, fetchImpl, generateEndpoints),
    queryTask: (taskId: string) =>
      queryTask(taskId, apiKey, fetchImpl, queryEndpoints),
    generateLyrics: (payload: any) =>
      generateLyrics(payload, apiKey, fetchImpl, lyricsGenerateEndpoints),
    queryLyricsTask: (taskId: string) =>
      queryLyricsTask(taskId, apiKey, fetchImpl, lyricsQueryEndpoints),
    requestStemSeparation: (input: any) =>
      requestStemSeparation(input, apiKey, fetchImpl, stemEndpoints),
    queryStemTask: (taskId: string) =>
      queryStemTask(taskId, apiKey, fetchImpl, stemQueryEndpoints),
    convertToWav: (request: any) =>
      convertToWav(request, apiKey, fetchImpl, wavGenerateEndpoints),
    queryWavTask: (taskId: string) =>
      queryWavTask(taskId, apiKey, fetchImpl, wavQueryEndpoints),
    extendTrack: createExtendTrack(apiKey, fetchImpl),
    generateCoverImage: createGenerateCoverImage(apiKey, fetchImpl),
    boostStyle: createBoostStyle(apiKey, fetchImpl),
    getTimestampedLyrics: createGetTimestampedLyrics(apiKey, fetchImpl),
  };
};

export type SunoClient = ReturnType<typeof createSunoClient>;
