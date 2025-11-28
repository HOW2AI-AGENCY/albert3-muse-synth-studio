import type {
  SunoExtendRequest,
  SunoExtendResult,
  SunoCoverImageRequest,
  SunoCoverImageResult,
  SunoBoostStyleRequest,
  SunoBoostStyleResult,
  SunoTimestampedLyricsRequest,
  SunoTimestampedLyricsResult,
} from "./suno-extended.ts";

export interface SunoGenerationPayload {
  prompt: string;
  tags?: string[];
  title?: string;
  customMode?: boolean;
  make_instrumental?: boolean;
  model?: "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5";
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  callBackUrl?: string;
  referenceAudioUrl?: string;
  personaId?: string;
}

export interface SunoLyricsPayload {
  prompt: string;
  callBackUrl: string;
}

export interface SunoTrack {
  id: string;
  audioUrl: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  prompt?: string;
  modelName: string;
  title: string;
  tags?: string;
  createTime: string;
  duration: number;
}

export interface SunoTaskStatus {
  taskId: string;
  parentMusicId?: string;
  param: string;
  response: {
    taskId: string;
    sunoData: SunoTrack[];
  };
  status: "PENDING" | "TEXT_SUCCESS" | "FIRST_SUCCESS" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "CALLBACK_EXCEPTION" | "SENSITIVE_WORD_ERROR";
  type: "GENERATE";
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SunoGenerationResult {
  taskId: string;
  jobId?: string | null;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoLyricsGenerationResult {
  taskId: string;
  jobId?: string | null;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoQueryResult {
  status: SunoTaskStatus["status"];
  tasks: SunoTrack[];
  rawResponse: unknown;
  endpoint: string;
  code?: number;
}

export interface SunoLyricsVariantStatus {
  text?: string;
  title?: string;
  status?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

export interface SunoLyricsResult {
  taskId: string;
  status: string;
  data: SunoLyricsVariantStatus[];
}

export interface SunoLyricsQueryResult {
  taskId: string;
  status: string,
  data: SunoLyricsVariantStatus[];
  rawResponse: unknown;
  endpoint: string;
  code?: number;
}

export interface SunoStemRequest {
  taskId: string;
  audioId: string;
  type: "separate_vocal" | "split_stem";
  callBackUrl?: string;
}

export interface SunoStemResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoStemAsset {
  instrument: string;
  url: string;
}

export interface SunoStemQueryResult {
  taskId: string;
  assets: SunoStemAsset[];
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "CALLBACK_EXCEPTION";
  rawResponse: unknown;
  endpoint: string;
  code?: number;
  message?: string | null;
}

export interface SunoWavRequest {
  taskId: string;
  audioId: string;
  callBackUrl: string;
}

export interface SunoWavResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

export interface SunoWavQueryResult {
  taskId: string;
  musicId: string;
  status: "PENDING" | "SUCCESS" | "CREATE_TASK_FAILED" | "GENERATE_WAV_FAILED" | "CALLBACK_EXCEPTION";
  wavUrl?: string;
  rawResponse: unknown;
  endpoint: string;
  code?: number;
  message?: string | null;
}

export type {
  SunoExtendRequest,
  SunoExtendResult,
  SunoCoverImageRequest,
  SunoCoverImageResult,
  SunoBoostStyleRequest,
  SunoBoostStyleResult,
  SunoTimestampedLyricsRequest,
  SunoTimestampedLyricsResult,
};

export interface CreateSunoClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  generateEndpoints?: string[];
  queryEndpoints?: string[];
  stemEndpoints?: string[];
  stemQueryEndpoints?: string[];
  lyricsGenerateEndpoints?: string[];
  lyricsQueryEndpoints?: string[];
  wavGenerateEndpoints?: string[];
  wavQueryEndpoints?: string[];
}
