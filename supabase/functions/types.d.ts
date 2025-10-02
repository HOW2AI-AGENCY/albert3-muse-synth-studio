// Type definitions for Deno Edge Functions

// Deno global types
declare global {
  namespace Deno {
    interface Addr {
      transport: "tcp" | "udp";
      hostname: string;
      port: number;
    }

    interface Env {
      get(key: string): string | undefined;
    }
    
    const env: Env;

    interface ListenOptions {
      port?: number;
      hostname?: string;
    }

    interface Listener {
      addr: Addr;
      close(): void;
    }

    interface HttpConn {
      close(): void;
    }

    namespace errors {
      class Http extends Error {
        constructor(message: string);
      }
    }

    function listen(options: ListenOptions): Listener;
  }
}

// ConnInfo interface for HTTP server
export interface ConnInfo {
  readonly localAddr: Deno.Addr;
  readonly remoteAddr: Deno.Addr;
}

// Handler type for HTTP requests
export type Handler = (
  request: Request,
  connInfo: ConnInfo,
) => Response | Promise<Response>;

// Serve function declaration
export declare function serve(handler: Handler, options?: { port?: number; hostname?: string }): Promise<void>;

// Supabase client types
export interface SupabaseClient {
  auth: {
    getUser(): Promise<{ data: { user: any }, error: any }>;
  };
  from(table: string): any;
}

export declare function createClient(
  supabaseUrl: string,
  supabaseKey: string,
  options?: any
): SupabaseClient;