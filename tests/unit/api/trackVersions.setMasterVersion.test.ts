import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '@/features/tracks/api/trackVersions';

// Мокаем Supabase клиент
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      rpc: vi.fn(),
    },
  };
});

describe('API: setMasterVersion', () => {
  const parentTrackId = '00000000-0000-0000-0000-000000000001';
  const versionId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('выполняет RPC set_master_version и возвращает обновлённую версию', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    const updatedRow = {
      id: versionId,
      parent_track_id: parentTrackId,
      is_preferred_variant: true,
      variant_index: 1,
      audio_url: 'https://example.com/audio.mp3',
      metadata: null,
      created_at: new Date().toISOString(),
    } as any;

    (supabase.rpc as any).mockResolvedValue({ data: [updatedRow], error: null });

    const result = await api.setMasterVersion(parentTrackId, versionId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(versionId);
      expect(result.data.is_preferred_variant).toBe(true);
    }

    expect(supabase.rpc).toHaveBeenCalledWith('set_master_version', {
      parent_track_id: parentTrackId,
      version_id: versionId,
    });
  });

  it('возвращает ошибку при неудачном RPC вызове', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'db error' } });

    const result = await api.setMasterVersion(parentTrackId, versionId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Failed to set master version');
    }
  });
});