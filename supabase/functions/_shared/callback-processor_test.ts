import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { processSunoCallback } from "./callback-processor.ts";
import type { SunoCallbackPayload } from "./types/callbacks.ts";

// Простая имитация SupabaseClient для unit-теста
type TrackRow = {
  id: string;
  user_id: string;
  status: string;
  audio_url?: string | null;
  cover_url?: string | null;
  metadata?: Record<string, unknown> | null;
  suno_id?: string | null;
};

type TrackVersionRow = {
  track_id: string;
  variant_index: number;
  audio_url?: string | null;
  cover_url?: string | null;
  source_audio_url?: string | null;
  source_cover_url?: string | null;
  source_version_number?: number | null;
};

class MockSupabase {
  tracks: Map<string, TrackRow> = new Map();
  versions: Map<string, TrackVersionRow> = new Map(); // key: `${track_id}:${variant_index}`

  from(table: string) {
    return {
      select(columns: string) {
        const api = {
          eq(column: string, value: string) {
            if (table === 'tracks' && column === 'suno_id') {
              const found = Array.from((api as any).tracks.values()).find(t => t.suno_id === value);
              return {
                maybeSingle() {
                  return Promise.resolve({ data: found || null, error: null });
                }
              };
            }
            if (table === 'track_versions' && column === 'track_id') {
              // Используется только для maybeSingle с variant_index
              return {
                eq(column2: string, value2: number) {
                  const key = `${value}:${value2}`;
                  const row = (self as unknown as MockSupabase).versions.get(key) || null;
                  return {
                    maybeSingle() {
                      return Promise.resolve({ data: row, error: null });
                    }
                  };
                }
              };
            }
            return { maybeSingle() { return Promise.resolve({ data: null, error: null }); } };
          }
        };
        return api;
      },
      update(updateData: Partial<TrackRow>) {
        return {
          eq(column: string, value: string) {
            if (table === 'tracks' && column === 'id') {
              const row = this.tracks.get(value);
              if (row) {
                this.tracks.set(value, { ...row, ...updateData });
              }
            }
            return Promise.resolve({ error: null });
          }
        };
      },
      upsert(row: TrackVersionRow, options?: { onConflict?: string }) {
        if (table === 'track_versions') {
          const key = `${row.track_id}:${row.variant_index}`;
          this.versions.set(key, row);
        }
        return Promise.resolve({ error: null });
      }
    };
    return {
      select(columns: string) {
        const api = {
          eq(column: string, value: string) {
            if (table === 'tracks' && column === 'suno_id') {
              const found = Array.from(self.tracks.values()).find(t => t.suno_id === value);
              return {
                maybeSingle() {
                  return Promise.resolve({ data: found || null, error: null });
                }
              };
            }
            if (table === 'track_versions' && column === 'track_id') {
              // Используется только для maybeSingle с variant_index
              return {
                eq(column2: string, value2: number) {
                  const key = `${value}:${value2}`;
                  const row = self.versions.get(key) || null;
                  return {
                    maybeSingle() {
                      return Promise.resolve({ data: row, error: null });
                    }
                  };
                }
              };
            }
            return { maybeSingle() { return Promise.resolve({ data: null, error: null }); } };
          }
        };
        return api;
      },
      update(updateData: Partial<TrackRow>) {
        return {
          eq(column: string, value: string) {
            if (table === 'tracks' && column === 'id') {
              const row = self.tracks.get(value);
              if (row) {
                self.tracks.set(value, { ...row, ...updateData });
              }
            }
            return Promise.resolve({ error: null });
          }
        };
      },
      upsert(row: TrackVersionRow, options?: { onConflict?: string }) {
        if (table === 'track_versions') {
          const key = `${row.track_id}:${row.variant_index}`;
          self.versions.set(key, row);
        }
        return Promise.resolve({ error: null });
      }
    };
  }
}

Deno.test('processSunoCallback: FIRST stage prepares immediate playback and caches versions', async () => {
  const db = new MockSupabase();
  const trackId = 'track-1';
  const userId = 'user-1';
  const taskId = 'task-123';
  db.tracks.set(trackId, { id: trackId, user_id: userId, status: 'processing', suno_id: taskId });

  const payload: SunoCallbackPayload = {
    code: 200,
    msg: 'OK',
    data: {
      callbackType: 'first',
      task_id: taskId,
      data: [
        {
          id: 'suno-clip-0',
          audio_url: 'https://cdn.suno.ai/a0.mp3',
          stream_audio_url: 'https://cdn.suno.ai/s0.mp3',
          image_url: 'https://cdn.suno.ai/i0.jpg',
          duration: 180,
          status: 'SUCCESS' as any,
        },
        {
          id: 'suno-clip-1',
          audio_url: 'https://cdn.suno.ai/a1.mp3',
          image_url: 'https://cdn.suno.ai/i1.jpg',
          duration: 182,
          status: 'SUCCESS' as any,
        },
      ]
    }
  };

  const res = await processSunoCallback(db as any, payload);
  assert(res.ok);
  assertEquals(res.stage, 'first');
  const updated = db.tracks.get(trackId)!;
  assert(updated.metadata && (updated.metadata as any).immediate_play_ready);
  assert(updated.audio_url && updated.audio_url.includes('https://'));
});

Deno.test('processSunoCallback: COMPLETE finalizes track status', async () => {
  const db = new MockSupabase();
  const trackId = 'track-2';
  const userId = 'user-2';
  const taskId = 'task-456';
  db.tracks.set(trackId, { id: trackId, user_id: userId, status: 'processing', suno_id: taskId });

  const payload: SunoCallbackPayload = {
    code: 200,
    msg: 'OK',
    data: {
      callbackType: 'complete',
      task_id: taskId,
      data: [
        {
          id: 'suno-clip-0',
          audio_url: 'https://cdn.suno.ai/a0.mp3',
          image_url: 'https://cdn.suno.ai/i0.jpg',
          duration: 180,
          status: 'SUCCESS' as any,
        }
      ]
    }
  };

  const res = await processSunoCallback(db as any, payload);
  assert(res.ok);
  assertEquals(res.stage, 'complete');
  const updated = db.tracks.get(trackId)!;
  assertEquals(updated.status, 'completed');
});

Deno.test('processSunoCallback: ERROR stage marks track failed', async () => {
  const db = new MockSupabase();
  const trackId = 'track-3';
  const userId = 'user-3';
  const taskId = 'task-789';
  db.tracks.set(trackId, { id: trackId, user_id: userId, status: 'processing', suno_id: taskId });

  const payload: SunoCallbackPayload = {
    code: 500,
    msg: 'Internal error',
    data: {
      callbackType: 'error',
      task_id: taskId,
      data: []
    }
  };

  const res = await processSunoCallback(db as any, payload);
  assert(res.ok);
  assertEquals(res.stage, 'error');
  const updated = db.tracks.get(trackId)!;
  assertEquals(updated.status, 'failed');
});