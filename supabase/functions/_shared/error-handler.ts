/**
 * Centralized Error Handler for Edge Functions
 * Provides consistent error handling, logging, and response formatting
 */

import { logger } from './logger.ts';
import { createCorsHeaders as createSecureCorsHeaders } from './cors.ts';

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  retryAfter?: number;
  details?: unknown;
}

/**
 * Custom Edge Function Error
 */
export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode: string = 'INTERNAL_ERROR',
    public retryAfter?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

/**
 * Check if error is a quota/payment error
 */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('402') || msg.includes('quota') || msg.includes('insufficient credits');
}

/**
 * Check if error is an authentication error
 */
function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('unauthorized') || msg.includes('401') || msg.includes('invalid token');
}

/**
 * Create CORS headers (wrapper for secure implementation)
 * @deprecated Use createSecureCorsHeaders from cors.ts directly
 */
export function createCorsHeaders(req?: Request): Record<string, string> {
  // ✅ SECURITY FIX: Use whitelist-based CORS instead of wildcard
  return createSecureCorsHeaders(req);
}

/**
 * Handle Edge Function errors with proper logging and response formatting
 * @param error - Error object
 * @param context - Error context (function name, user ID, etc.)
 * @returns Response object with error details
 */
export function handleEdgeFunctionError(
  error: unknown,
  context: {
    functionName: string;
    userId?: string;
    correlationId?: string;
    requestBody?: unknown;
    request?: Request; // Add request for CORS origin validation
  }
): Response {
  const corsHeaders = createCorsHeaders(context.request);
  
  // 1. Authentication errors
  if (isAuthError(error)) {
    logger.warn(`🔒 ${context.functionName} authentication failed`, context);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Authentication required. Please log in.',
        errorCode: 'UNAUTHORIZED',
      } satisfies ErrorResponse),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // 2. Rate limit errors
  if (isRateLimitError(error)) {
    logger.warn(`⏱️ ${context.functionName} rate limit exceeded`, context);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      } satisfies ErrorResponse),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    );
  }
  
  // 3. Quota/Payment errors
  if (isQuotaError(error)) {
    logger.warn(`💳 ${context.functionName} quota exceeded`, context);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Insufficient credits. Please upgrade your plan.',
        errorCode: 'INSUFFICIENT_CREDITS',
      } satisfies ErrorResponse),
      { 
        status: 402, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // 4. Validation errors (client errors)
  if (error instanceof EdgeFunctionError && error.statusCode >= 400 && error.statusCode < 500) {
    logger.warn(`⚠️ ${context.functionName} validation error`, { 
      ...context,
      errorCode: error.errorCode,
      errorMessage: error.message,
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        errorCode: error.errorCode,
        details: error.details,
      } satisfies ErrorResponse),
      { 
        status: error.statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // 5. Server errors
  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  logger.error(`🔴 ${context.functionName} server error`, {
    error: errorMsg,
    stack: errorStack,
    ...context,
  });
  
  // Don't expose internal error details to client
  return new Response(
    JSON.stringify({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTERNAL_ERROR',
    } satisfies ErrorResponse),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleCorsPreflightRequest(req?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(req),
  });
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, req?: Request): Response {
  return new Response(
    JSON.stringify({
      success: true,
      ...data,
    }),
    {
      status: 200,
      headers: {
        ...createCorsHeaders(req),
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: Request) => Promise<T>,
  context: { functionName: string }
) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest(req);
    }

    try {
      const result = await handler(req);
      return createSuccessResponse(result, req);
    } catch (error) {
      return handleEdgeFunctionError(error, {
        ...context,
        correlationId: crypto.randomUUID(),
        request: req, // Pass request for CORS validation
      });
    }
  };
}
