// Implementation file for Deno Edge Functions

// Re-export serve function from Deno std
export { serve } from "https://deno.land/std@0.168.0/http/server.ts";
export type { ConnInfo, Handler } from "https://deno.land/std@0.168.0/http/server.ts";

// Re-export createClient from Supabase
export { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deno global types for reference
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

// Export empty object to make this a module
export {};