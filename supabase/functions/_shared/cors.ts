/**
 * Simplified CORS configuration for Edge Functions
 */

const parseAllowedOrigins = (): string[] => {
  const raw = Deno.env.get('CORS_ALLOWED_ORIGINS');

  if (!raw) {
    return ['*'];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const ALLOWED_ORIGINS = parseAllowedOrigins();

const resolveAllowedOrigin = (requestOrOrigin?: Request | string | null): string => {
  const requestedOrigin = typeof requestOrOrigin === 'string'
    ? requestOrOrigin
    : requestOrOrigin?.headers?.get?.('Origin') ?? '';

  if (requestedOrigin && requestedOrigin !== 'null') {
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(requestedOrigin)) {
      return requestedOrigin;
    }
  }

  if (ALLOWED_ORIGINS.includes('*')) {
    return '*';
  }

  return ALLOWED_ORIGINS[0] ?? '*';
};

/**
 * Creates CORS headers.
 * When the environment variable `CORS_ALLOWED_ORIGINS` is provided, it must
 * contain a comma separated list of origins that are allowed to call the
 * function (for example: `https://lovable.dev,https://lovable.app`).
 * Otherwise all origins are permitted.
 */
export const createCorsHeaders = (requestOrOrigin?: Request | string | null) => {
  const allowOrigin = resolveAllowedOrigin(requestOrOrigin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-environment',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (allowOrigin !== '*') {
    headers['Vary'] = 'Origin';
  }

  return headers;
};

/**
 * Handles CORS preflight requests
 */
export const handleCorsPreflightRequest = (req: Request): Response => {
  const corsHeaders = createCorsHeaders(req);

  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
};

/**
 * Creates a response with CORS headers
 */
export const createCorsResponse = (
  body: string | null,
  options: {
    status?: number;
    headers?: Record<string, string>;
    request?: Request | string | null;
  } = {}
): Response => {
  const { status = 200, headers = {}, request } = options;
  const corsHeaders = createCorsHeaders(request);

  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};