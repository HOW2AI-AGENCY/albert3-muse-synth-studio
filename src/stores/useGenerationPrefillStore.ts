import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PendingGeneration {
  prompt: string;
  lyrics: string;
  title: string;
  tags: string;
  genre?: string;
  mood?: string;
  sourceTrackId?: string;
  sourceType: 'enhanced' | 'stem_reference' | 'manual';
  timestamp: number;
}

interface GenerationPrefillState {
  pendingGeneration: PendingGeneration | null;
  setPendingGeneration: (data: Omit<PendingGeneration, 'timestamp'>) => void;
  consumePendingGeneration: () => PendingGeneration | null;
  clearPendingGeneration: () => void;
}

/**
 * Store for cross-page generation data transfer
 * Replaces localStorage antipattern with proper state management
 */
export const useGenerationPrefillStore = create<GenerationPrefillState>()(
  persist(
    (set, get) => ({
      pendingGeneration: null,
      
      setPendingGeneration: (data) => {
        set({ 
          pendingGeneration: {
            ...data,
            timestamp: Date.now(),
          }
        });
      },
      
      consumePendingGeneration: () => {
        const pending = get().pendingGeneration;
        
        // Auto-expire after 5 minutes to prevent stale data
        if (pending && Date.now() - pending.timestamp > 5 * 60 * 1000) {
          set({ pendingGeneration: null });
          return null;
        }
        
        // Clear after consuming (one-time use)
        set({ pendingGeneration: null });
        return pending;
      },
      
      clearPendingGeneration: () => {
        set({ pendingGeneration: null });
      },
    }),
    {
      name: 'generation-prefill-storage',
      // Only persist for 5 minutes
      partialize: (state) => ({
        pendingGeneration: state.pendingGeneration,
      }),
    }
  )
);
