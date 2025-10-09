// Extended Supabase types
declare module '@supabase/supabase-js' {
  export interface Database {
    public: {
      Tables: Record<string, unknown>;
      Views: Record<string, unknown>;
      Functions: Record<string, unknown>;
      Enums: Record<string, unknown>;
    };
  }
}

export {};
