/**
 * Simplified CORS configuration for Edge Functions
 */

/**
 * Creates CORS headers - simplified to allow all origins
 */
export const createCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
};

/**
 * Handles CORS preflight requests
 */
export const handleCorsPreflightRequest = (req: Request): Response => {
  const corsHeaders = createCorsHeaders();
  
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
  } = {}
): Response => {
  const { status = 200, headers = {} } = options;
  const corsHeaders = createCorsHeaders();
  
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};