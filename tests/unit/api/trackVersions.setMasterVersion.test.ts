import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '@/features/tracks/api/trackVersions';

// Мокаем Supabase клиент для эмуляции .from().update()...
const mockUpdate = vi.fn();
const mockEq = vi.fn(() => ({
  update: mockUpdate,
}));
const mockFrom = vi.fn(() => ({
  eq: mockEq,
  update: mockUpdate,
}));

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

describe('API: setMasterVersion', () => {
  const parentTrackId = '00000000-0000-0000-0000-000000000001';
  const versionId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    vi.clearAllMocks();
    // Сбрасываем цепочку моков перед каждым тестом
    mockUpdate.mockReset();
    mockEq.mockClear();
    mockFrom.mockClear();

    // Настраиваем, чтобы eq возвращал объект с update по умолчанию
    mockFrom.mockReturnValue({
      eq: mockEq,
      update: mockUpdate
    });
    mockEq.mockReturnValue({
      update: mockUpdate,
      select: vi.fn().mockReturnThis(),
      single: vi.fn()
    });
    mockUpdate.mockReturnValue({
        eq: mockEq,
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
    });
  });

  it('выполняет два апдейта и возвращает обновлённую версию', async () => {
    const updatedRow = {
      id: versionId,
      parent_track_id: parentTrackId,
      is_preferred_variant: true,
      variant_index: 1,
      audio_url: 'https://example.com/audio.mp3',
      metadata: null,
      created_at: new Date().toISOString(),
    };

    // Мокаем первый вызов (сброс флагов)
    mockUpdate.mockResolvedValueOnce({ error: null });
    // Мокаем второй вызов (установка нового мастера)
    const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    mockUpdate.mockReturnValue({
        eq: mockEq,
        select: mockSelect,
    });


    const result = await api.setMasterVersion(parentTrackId, versionId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(versionId);
      expect(result.data.is_preferred_variant).toBe(true);
    }

    expect(mockFrom).toHaveBeenCalledWith('track_versions');
    expect(mockUpdate).toHaveBeenCalledTimes(2);

    // Проверяем первый вызов
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { is_preferred_variant: false });
    expect(mockEq).toHaveBeenCalledWith('parent_track_id', parentTrackId);

    // Проверяем второй вызов
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { is_preferred_variant: true });
    expect(mockEq).toHaveBeenCalledWith('id', versionId);
  });

  it('возвращает ошибку при неудачном первом апдейте', async () => {
    const dbError = { message: 'db error on reset' };
    mockUpdate.mockResolvedValueOnce({ error: dbError });

    const result = await api.setMasterVersion(parentTrackId, versionId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(api.TrackVersionError);
      expect(result.error.message).toContain('Failed to set master version');
    }
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('возвращает ошибку при неудачном втором апдейте', async () => {
    const dbError = { message: 'db error on set' };
    mockUpdate.mockResolvedValueOnce({ error: null }); // Первый вызов успешен

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: dbError });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    mockUpdate.mockReturnValue({
        eq: mockEq,
        select: mockSelect,
    });

    const result = await api.setMasterVersion(parentTrackId, versionId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(api.TrackVersionError);
      expect(result.error.message).toContain('Failed to set master version');
    }
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});
