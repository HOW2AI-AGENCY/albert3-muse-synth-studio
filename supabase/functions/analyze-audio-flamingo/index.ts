import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logger } from "../_shared/logger.ts";
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

async function mainHandler(req: Request): Promise<Response> {
  const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');

  if (!REPLICATE_API_KEY) {
    logger.error('[analyze-audio-flamingo] REPLICATE_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'REPLICATE_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { audioUrl, analysisType = 'full' } = await req.json();
  
  logger.info('[analyze-audio-flamingo] Request received', {
    audioUrlPreview: audioUrl?.substring(0, 50),
    analysisType
  });

  if (!audioUrl) {
    return new Response(
      JSON.stringify({ error: 'audioUrl is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Определяем промпты в зависимости от типа анализа
    const prompts = {
      full: `Analyze this audio in detail and provide:
1. Genre classification (be specific: e.g., "Electronic Dance Music - Progressive House")
2. Mood/emotional characteristics (e.g., "energetic", "melancholic", "uplifting")
3. Tempo in BPM (estimate if unclear)
4. Key signature (if identifiable)
5. Main instruments detected
6. Vocal characteristics (if present: gender, style, language)
7. Production quality (professional/amateur, mixing notes)
8. Song structure (intro, verse, chorus, etc.)
9. Lyrics transcription (if vocals are present)

Format the response as structured JSON.`,
      
      quick: `Briefly identify: genre, mood, tempo (BPM), and main instruments in this audio.`,
      
      lyrics: `Transcribe all lyrics from this audio. If no vocals, return "instrumental". 
Include [Verse], [Chorus], [Bridge] tags to mark song structure.`,
      
      instruments: `List all instruments you can identify in this audio track. 
Be specific (e.g., "electric guitar", "synthesizer pad", "808 bass", "acoustic drums").`,
    };

    const prompt = prompts[analysisType as keyof typeof prompts] || prompts.full;

    logger.info('[analyze-audio-flamingo] Starting Replicate analysis', {
      model: 'zsxkib/audio-flamingo-3',
      promptLength: prompt.length
    });

    // Запускаем анализ через Replicate API напрямую
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'zsxkib/audio-flamingo-3',
        input: {
          audio: audioUrl,
          prompt: prompt,
          enable_thinking: true,
          temperature: 0.1,
          max_length: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    
    // Ожидаем завершения предсказания
    let output = '';
    const predictionUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
    
    for (let i = 0; i < 60; i++) { // Максимум 60 попыток (5 минут)
      await new Promise(resolve => setTimeout(resolve, 5000)); // Ждём 5 секунд
      
      const statusResponse = await fetch(predictionUrl, {
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_KEY}`,
        }
      });
      
      const status = await statusResponse.json();
      
      if (status.status === 'succeeded') {
        output = status.output;
        break;
      } else if (status.status === 'failed') {
        throw new Error(`Replicate prediction failed: ${status.error}`);
      }
    }

    logger.info('[analyze-audio-flamingo] Analysis complete', {
      outputLength: output?.length || 0,
      outputPreview: output?.substring(0, 200)
    });

    // Парсим ответ и извлекаем структурированные данные
    const parsedResult = parseFlamingoResponse(output, analysisType);

    return new Response(
      JSON.stringify({
        success: true,
        analysisType,
        rawOutput: output,
        parsed: parsedResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[analyze-audio-flamingo] Fatal error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Парсит ответ от Audio Flamingo в структурированный формат
 */
function parseFlamingoResponse(output: string, analysisType: string) {
  const result: Record<string, any> = {
    rawText: output,
  };

  if (!output) return result;

  const lowerOutput = output.toLowerCase();

  // 1. Извлечение жанра
  const genreMatch = output.match(/genre[:\s]+([^\n.]+)/i);
  if (genreMatch) {
    result.genre = genreMatch[1].trim();
  }

  // 2. Извлечение настроения
  const moodMatch = output.match(/mood[:\s]+([^\n.]+)/i);
  if (moodMatch) {
    result.mood = moodMatch[1].trim();
  }

  // 3. Извлечение BPM
  const bpmMatch = output.match(/(\d+)\s*bpm/i);
  if (bpmMatch) {
    result.tempo_bpm = parseInt(bpmMatch[1], 10);
  }

  // 4. Извлечение тональности
  const keyMatch = output.match(/key[:\s]+([A-G][#b]?\s*(?:major|minor)?)/i);
  if (keyMatch) {
    result.key = keyMatch[1].trim();
  }

  // 5. Извлечение инструментов
  const instrumentsMatch = output.match(/instruments?[:\s]+([^\n]+)/i);
  if (instrumentsMatch) {
    result.instruments = instrumentsMatch[1]
      .split(/,|and/)
      .map(i => i.trim())
      .filter(Boolean);
  }

  // 6. Извлечение вокала
  if (lowerOutput.includes('vocal') || lowerOutput.includes('singing')) {
    const vocalMatch = output.match(/vocal[s]?[:\s]+([^\n.]+)/i);
    if (vocalMatch) {
      result.vocals = vocalMatch[1].trim();
    }
  }

  // 7. Извлечение текстов песни (для analysisType: 'lyrics')
  if (analysisType === 'lyrics') {
    // Ищем блоки с [Verse], [Chorus], [Bridge]
    const lyricsBlocks = output.match(/\[(?:Verse|Chorus|Bridge|Intro|Outro)[^\]]*\][\s\S]+?(?=\[|$)/gi);
    if (lyricsBlocks) {
      result.lyrics = lyricsBlocks.join('\n\n').trim();
    } else if (!lowerOutput.includes('instrumental')) {
      // Если нет структурированных блоков, берём весь текст
      result.lyrics = output;
    }
  }

  // 8. Дополнительная информация
  const structureMatch = output.match(/structure[:\s]+([^\n]+)/i);
  if (structureMatch) {
    result.structure = structureMatch[1].trim();
  }

  const qualityMatch = output.match(/quality[:\s]+([^\n.]+)/i);
  if (qualityMatch) {
    result.quality = qualityMatch[1].trim();
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return mainHandler(req);
});
