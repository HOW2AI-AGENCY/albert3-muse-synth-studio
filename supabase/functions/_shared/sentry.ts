/**
 * Sentry integration for Supabase Edge Functions
 * Provides error tracking and performance monitoring
 */

interface SentryEvent {
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  timestamp: number;
  exception?: {
    type: string;
    value: string;
    stacktrace?: {
      frames: Array<{
        filename: string;
        function: string;
        lineno: number;
        colno: number;
      }>;
    };
  };
  transaction?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  environment?: string;
  release?: string;
}

interface SentryOptions {
  transaction?: string;
  tags?: Record<string, string>;
}

class SentryClient {
  private dsn: string | null;
  private environment: string;
  private release: string;
  private sampleRate: number;
  private debug: boolean;

  constructor() {
    this.dsn = Deno.env.get('SENTRY_EDGE_DSN') || Deno.env.get('SENTRY_DSN') || null;
    this.environment = Deno.env.get('SENTRY_ENVIRONMENT') || 'production';
    this.release = Deno.env.get('SENTRY_RELEASE') || 'unknown';
    this.sampleRate = parseFloat(Deno.env.get('SENTRY_TRACES_SAMPLE_RATE') || '0.0');
    this.debug = Deno.env.get('SENTRY_DEBUG') === 'true';
  }

  /**
   * Check if Sentry is enabled
   */
  isEnabled(): boolean {
    return this.dsn !== null;
  }

  /**
   * Capture an exception
   */
  async captureException(error: Error, options?: SentryOptions): Promise<void> {
    if (!this.isEnabled()) {
      if (this.debug) {
        console.log('[Sentry] Not enabled, skipping exception capture');
      }
      return;
    }

    const event: SentryEvent = {
      level: 'error',
      message: error.message,
      timestamp: Date.now() / 1000,
      exception: {
        type: error.name,
        value: error.message,
        stacktrace: this.parseStackTrace(error.stack),
      },
      transaction: options?.transaction,
      tags: {
        ...options?.tags,
        environment: this.environment,
      },
      environment: this.environment,
      release: this.release,
    };

    await this.sendEvent(event);
  }

  /**
   * Capture a message
   */
  async captureMessage(message: string, level: 'error' | 'warning' | 'info' = 'info', options?: SentryOptions): Promise<void> {
    if (!this.isEnabled()) {
      if (this.debug) {
        console.log('[Sentry] Not enabled, skipping message capture');
      }
      return;
    }

    const event: SentryEvent = {
      level,
      message,
      timestamp: Date.now() / 1000,
      transaction: options?.transaction,
      tags: {
        ...options?.tags,
        environment: this.environment,
      },
      environment: this.environment,
      release: this.release,
    };

    await this.sendEvent(event);
  }

  /**
   * Parse error stack trace
   */
  private parseStackTrace(stack?: string): { frames: Array<{ filename: string; function: string; lineno: number; colno: number; }> } | undefined {
    if (!stack) return undefined;

    const frames = stack.split('\n').slice(1).map(line => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3]),
          colno: parseInt(match[4]),
        };
      }
      return null;
    }).filter(Boolean) as Array<{
      filename: string;
      function: string;
      lineno: number;
      colno: number;
    }>;

    return frames.length > 0 ? { frames } : undefined;
  }

  /**
   * Send event to Sentry
   */
  private async sendEvent(event: SentryEvent): Promise<void> {
    if (!this.dsn) return;

    try {
      // Parse DSN to get project ID and key
      const dsnUrl = new URL(this.dsn);
      const projectId = dsnUrl.pathname.slice(1);
      const publicKey = dsnUrl.username;
      const sentryUrl = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/store/`;

      const headers = {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_timestamp=${event.timestamp}`,
      };

      const response = await fetch(sentryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok && this.debug) {
        console.error('[Sentry] Failed to send event:', await response.text());
      }
    } catch (error) {
      if (this.debug) {
        console.error('[Sentry] Error sending event:', error);
      }
    }
  }

  /**
   * Start a transaction (for performance monitoring)
   */
  startTransaction(name: string): {
    finish: () => void;
    setStatus: (status: string) => void;
  } {
    const startTime = Date.now();
    let status = 'ok';

    return {
      setStatus: (newStatus: string) => {
        status = newStatus;
      },
      finish: () => {
        const duration = Date.now() - startTime;
        
        // Sample based on sample rate
        if (Math.random() > this.sampleRate) {
          return;
        }

        if (this.debug) {
          console.log(`[Sentry] Transaction "${name}" finished in ${duration}ms with status: ${status}`);
        }

        // In a real implementation, send transaction to Sentry
        // For now, just log for debugging
      },
    };
  }
}

// Singleton instance - EXPORTED
export const sentryClient = new SentryClient();

/**
 * Wrapper function to add Sentry error tracking to Edge Functions
 */
export const withSentry = (
  handler: (req: Request) => Promise<Response>,
  options?: SentryOptions
): ((req: Request) => Promise<Response>) => {
  return async (req: Request): Promise<Response> => {
    const transaction = sentryClient.startTransaction(options?.transaction || 'edge-function');
    
    try {
      const response = await handler(req);
      
      // Set transaction status based on response
      if (response.status >= 500) {
        transaction.setStatus('internal_error');
      } else if (response.status >= 400) {
        transaction.setStatus('invalid_argument');
      } else {
        transaction.setStatus('ok');
      }
      
      transaction.finish();
      return response;
    } catch (error) {
      transaction.setStatus('unknown_error');
      transaction.finish();
      
      // Capture exception
      await sentryClient.captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          transaction: options?.transaction,
          tags: options?.tags,
        }
      );
      
      // Re-throw to allow error handling by caller
      throw error;
    }
  };
};

/**
 * Export Sentry client for direct usage
 */
export const sentry = sentryClient;
