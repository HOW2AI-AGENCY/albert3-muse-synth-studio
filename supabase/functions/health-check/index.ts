/**
 * Health Check Edge Function
 * SPRINT 28: Testing Infrastructure & Bug Fixes
 * 
 * Проверяет состояние всех критических сервисов
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  checks: HealthCheckResult[];
  overall: {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    downChecks: number;
  };
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        service: 'database',
        status: 'down',
        error: 'Missing Supabase credentials',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Simple query to check DB connectivity
    const { error, count } = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        service: 'database',
        status: 'down',
        responseTime,
        error: error.message,
      };
    }

    return {
      service: 'database',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: { recordCount: count },
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkSunoAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const apiKey = Deno.env.get('SUNO_API_KEY');
    
    if (!apiKey) {
      return {
        service: 'suno-api',
        status: 'down',
        error: 'Missing SUNO_API_KEY',
      };
    }

    const response = await fetch('https://api.sunoapi.org/api/v1/balance', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        service: 'suno-api',
        status: response.status === 429 ? 'degraded' : 'down',
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      service: 'suno-api',
      status: responseTime < 2000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        balance: data.data?.balance,
        endpoint: 'balance-check',
      },
    };
  } catch (error) {
    return {
      service: 'suno-api',
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkStorage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        service: 'storage',
        status: 'down',
        error: 'Missing Supabase credentials',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // List buckets to check storage availability
    const { data, error } = await supabase.storage.listBuckets();

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        service: 'storage',
        status: 'down',
        responseTime,
        error: error.message,
      };
    }

    const tracksBuckets = data.filter(b => 
      ['tracks-audio', 'tracks-covers', 'tracks-videos'].includes(b.name)
    );

    return {
      service: 'storage',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        bucketsAvailable: tracksBuckets.length,
        totalBuckets: data.length,
      },
    };
  } catch (error) {
    return {
      service: 'storage',
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('[health-check] Starting health checks...');
    
    // Run all health checks in parallel
    const [dbCheck, sunoCheck, storageCheck] = await Promise.all([
      checkDatabase(),
      checkSunoAPI(),
      checkStorage(),
    ]);

    const checks = [dbCheck, sunoCheck, storageCheck];
    
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    const downCount = checks.filter(c => c.status === 'down').length;

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'down';
    if (downCount > 0) {
      overallStatus = 'down';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      overall: {
        totalChecks: checks.length,
        healthyChecks: healthyCount,
        degradedChecks: degradedCount,
        downChecks: downCount,
      },
    };

    logger.info('[health-check] Health check completed', {
      status: overallStatus,
      healthy: healthyCount,
      degraded: degradedCount,
      down: downCount,
    });

    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;

    return new Response(JSON.stringify(response), {
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('[health-check] Unexpected error:', { error });
    
    return new Response(JSON.stringify({
      status: 'down',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
