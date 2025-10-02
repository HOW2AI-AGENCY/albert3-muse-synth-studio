/**
 * Безопасная конфигурация CORS для Edge Functions
 * Ограничивает доступ только к разрешенным доменам
 */

// Получаем разрешенные домены из переменных окружения
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = (globalThis as any).Deno?.env?.get('ALLOWED_ORIGINS');
  if (allowedOrigins) {
    return allowedOrigins.split(',').map(origin => origin.trim());
  }
  
  // Дефолтные разрешенные домены для разработки и продакшена
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://albert3-muse-synth-studio.vercel.app',
    // Добавьте ваш продакшн домен здесь
  ];
};

/**
 * Проверяет, разрешен ли домен для CORS запросов
 */
export const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};

/**
 * Создает безопасные CORS заголовки
 */
export const createCorsHeaders = (origin: string | null = null) => {
  const allowedOrigin = origin && isOriginAllowed(origin) ? origin : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400', // 24 часа
    'Vary': 'Origin',
  };
};

/**
 * Обрабатывает CORS preflight запросы
 */
export const handleCorsPreflightRequest = (req: Request): Response => {
  const origin = req.headers.get('Origin');
  const corsHeaders = createCorsHeaders(origin);
  
  return new Response(null, { 
    status: 200,
    headers: corsHeaders 
  });
};

/**
 * Создает ответ с CORS заголовками
 */
export const createCorsResponse = (
  body: string | null,
  options: {
    status?: number;
    headers?: Record<string, string>;
    origin?: string | null;
  } = {}
): Response => {
  const { status = 200, headers = {}, origin } = options;
  const corsHeaders = createCorsHeaders(origin);
  
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};