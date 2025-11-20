export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  result?: T;
  status?: string;
  output_audio_url?: string;
  track_id?: string;
  error_message?: string;
  session?: any;
  persona?: any;
  parsed?: any;
}

// Specific response types for type safety
export interface UpscaleJobResponse {
  success: boolean;
  jobId: string;
  predictionId: string;
  status: string;
  output_audio_url?: string;
  track_id?: string;
  error_message?: string;
}

export interface PersonaResponse {
  success: boolean;
  persona?: any;
  error?: string;
}

export interface TelegramAuthResponse {
  success: boolean;
  session?: any;
}

export interface RefreshUrlResponse {
  success: boolean;
  refreshed?: {
    audio_url: string;
  };
}

export interface WavConversionResponse {
  success: boolean;
  jobId: string;
  sunoTaskId: string;
  error?: string;
}

export interface TitleGenerationResponse {
  success: boolean;
  title: string;
  suggestions: string[];
  error?: string;
}

export interface ProjectTracklistResponse {
  success: boolean;
  count: number;
  tracks: any[];
  error?: string;
}

export interface ReferenceAnalysisResponse {
  success: boolean;
  recognitionId?: string;
  descriptionId?: string;
  uploadedFileId: string;
}

export interface ReplaceSectionResponse {
  success: boolean;
  replacementId?: string;
  error?: string;
}

export interface ResyncTrackResponse {
  success: boolean;
  data?: any;
}
