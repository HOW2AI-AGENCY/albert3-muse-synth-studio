import { logger } from './logger.ts';

export interface MurekaStemRequest {
  audio_file: string;
}

export interface MurekaStemAsset {
  stemType: string;
  audioUrl: string;
}

export interface MurekaStemResult {
  taskId: string;
  rawResponse: unknown;
  endpoint: string;
}

export interface MurekaStemQueryResult {
  taskId: string;
  assets: MurekaStemAsset[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  rawResponse: unknown;
  endpoint: string;
  errorMessage?: string;
}

export interface CreateMurekaStemClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class MurekaApiError extends Error {
  constructor(
    message: string,
    readonly details: {
      endpoint: string;
      status?: number;
      body?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "MurekaApiError";
  }
}

const buildMurekaHeaders = (apiKey: string): Record<string, string> => ({
  "Authorization": `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "albert3-muse-synth-studio/edge",
});

export const createMurekaStemClient = (options: CreateMurekaStemClientOptions) => {
  const { apiKey, fetchImpl = fetch } = options;

  if (!apiKey) {
    throw new Error("MUREKA_API_KEY is required to create a Mureka stem client");
  }

  const requestStemSeparation = async (payload: MurekaStemRequest): Promise<MurekaStemResult> => {
    const endpoint = 'https://api.mureka.ai/v1/song/stem';
    
    try {
      logger.info('🎵 [MUREKA-STEM] Requesting stem separation', { 
        audio_file: payload.audio_file.substring(0, 100) + '...' 
      });

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: buildMurekaHeaders(apiKey),
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let json: any;
      
      try {
        json = JSON.parse(rawText);
      } catch (parseError) {
        throw new MurekaApiError("Unable to parse Mureka stem response", {
          endpoint,
          status: response.status,
          body: rawText,
          cause: parseError,
        });
      }

      if (!response.ok) {
        throw new MurekaApiError(`Mureka stem separation failed with status ${response.status}`, {
          endpoint,
          status: response.status,
          body: rawText,
        });
      }

      // Mureka response: { task_id: "xxx" }
      const taskId = json.task_id || json.taskId;
      
      if (!taskId) {
        throw new MurekaApiError("No task_id in Mureka stem response", {
          endpoint,
          status: response.status,
          body: rawText,
        });
      }

      logger.info('✅ [MUREKA-STEM] Stem separation task created', { taskId });

      return {
        taskId,
        rawResponse: json,
        endpoint,
      };
    } catch (error) {
      if (error instanceof MurekaApiError) throw error;
      
      throw new MurekaApiError(
        error instanceof Error ? error.message : "Unknown error during Mureka stem request",
        {
          endpoint,
          cause: error,
        }
      );
    }
  };

  const queryStemTask = async (taskId: string): Promise<MurekaStemQueryResult> => {
    const endpoint = `https://api.mureka.ai/v1/song/stem/${taskId}`;
    
    try {
      logger.debug('🔍 [MUREKA-STEM] Querying task status', { taskId });

      const response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: buildMurekaHeaders(apiKey),
      });

      const rawText = await response.text();
      let json: any;
      
      try {
        json = JSON.parse(rawText);
      } catch (parseError) {
        throw new MurekaApiError("Unable to parse Mureka stem query response", {
          endpoint,
          status: response.status,
          body: rawText,
          cause: parseError,
        });
      }

      if (!response.ok) {
        throw new MurekaApiError(`Mureka stem query failed with status ${response.status}`, {
          endpoint,
          status: response.status,
          body: rawText,
        });
      }

      // Normalize Mureka response to standard format
      const status = normalizeMurekaStatus(json.status);
      const assets = parseMurekaStemAssets(json);

      logger.debug('✅ [MUREKA-STEM] Task status retrieved', { 
        taskId, 
        status, 
        assetsCount: assets.length 
      });

      return {
        taskId,
        assets,
        status,
        rawResponse: json,
        endpoint,
        errorMessage: json.error_message || json.errorMessage,
      };
    } catch (error) {
      if (error instanceof MurekaApiError) throw error;
      
      throw new MurekaApiError(
        error instanceof Error ? error.message : "Unknown error during Mureka stem query",
        {
          endpoint,
          cause: error,
        }
      );
    }
  };

  return {
    requestStemSeparation,
    queryStemTask,
  };
};

// Helper: Normalize Mureka status to standard format
function normalizeMurekaStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
  const statusLower = (status || '').toLowerCase();
  
  if (statusLower === 'completed' || statusLower === 'success') return 'completed';
  if (statusLower === 'failed' || statusLower === 'error') return 'failed';
  if (statusLower === 'processing' || statusLower === 'running') return 'processing';
  
  return 'pending';
}

// Helper: Parse Mureka stem assets to standard format
function parseMurekaStemAssets(response: any): MurekaStemAsset[] {
  const assets: MurekaStemAsset[] = [];

  // Mureka может возвращать stems в разных форматах
  const stemData = response.stems || response.data || response;

  if (!stemData || typeof stemData !== 'object') {
    logger.warn('⚠️ [MUREKA-STEM] No stem data in response');
    return assets;
  }

  // Format 1: Object with stem types as keys
  const stemTypes = [
    'vocals', 'instrumental', 'drums', 'bass', 'guitar', 
    'piano', 'keyboard', 'strings', 'brass', 'woodwinds',
    'percussion', 'synth', 'fx', 'backing_vocals'
  ];

  for (const stemType of stemTypes) {
    const url = stemData[stemType] || stemData[`${stemType}_url`];
    if (url && typeof url === 'string') {
      assets.push({
        stemType,
        audioUrl: url,
      });
    }
  }

  // Format 2: Array of stem objects
  if (Array.isArray(stemData)) {
    for (const item of stemData) {
      if (item && typeof item === 'object') {
        const stemType = item.type || item.stem_type || item.name;
        const audioUrl = item.url || item.audio_url || item.file_url;
        
        if (stemType && audioUrl) {
          assets.push({
            stemType: String(stemType),
            audioUrl: String(audioUrl),
          });
        }
      }
    }
  }

  logger.info('📦 [MUREKA-STEM] Parsed stem assets', { 
    count: assets.length, 
    types: assets.map(a => a.stemType) 
  });

  return assets;
}
