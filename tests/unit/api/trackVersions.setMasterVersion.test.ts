import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '@/features/tracks/api/trackVersions';

// Этот мок будет поднят (hoisted)
vi.mock('@/integrations/supabase/client', async () => {
  const { vi } = await import('vitest');
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockFrom = vi.fn(() => ({
    update: mockUpdate,
    eq: mockEq,
  }));

  return {
    supabase: {
      from: mockFrom,
    },
    // Экспортируем моки, чтобы тесты могли получить к ним доступ
    _mocks: { mockUpdate, mockEq, mockFrom },
  };
});


describe('API: setMasterVersion', () => {
  const parentTrackId = '00000000-0000-0000-0000-000000000001';
  const versionId = '00000000-0000-0000-0000-000000000002';

  let mockUpdate, mockEq, mockFrom;

  beforeEach(async () => {
    // Получаем доступ к мокам перед каждым тестом
    const mocks = await import('@/integrations/supabase/client');
    mockUpdate = mocks._mocks.mockUpdate;
    mockEq = mocks._mocks.mockEq;
    mockFrom = mocks._mocks.mockFrom;

    vi.clearAllMocks();

    // Мок для успешного второго вызова (установка мастер-версии)
    const successfulUpdateResponse = { data: { id: versionId, is_preferred_variant: true }, error: null };
    const singleMock = vi.fn().mockResolvedValue(successfulUpdateResponse);
    const selectMock = vi.fn(() => ({ single: singleMock }));

    // Мок для первого вызова (сброс флагов)
    const resetUpdateEq = vi.fn().mockResolvedValue({ error: null });

    // Мок для второго вызова (установка флага)
    const setUpdateEq = vi.fn(() => ({ select: selectMock }));

    mockUpdate.mockImplementation((updateData) => {
      if (updateData.is_preferred_variant === false) {
        return { eq: resetUpdateEq };
      }
      return { eq: setUpdateEq };
    });
  });

  it('выполняет два update-вызова и возвращает обновлённую версию', async () => {
    const result = await api.setMasterVersion(parentTrackId, versionId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(versionId);
      expect(result.data.is_preferred_variant).toBe(true);
    }

    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom).toHaveBeenCalledWith('track_versions');
    expect(mockUpdate).toHaveBeenCalledWith({ is_preferred_variant: false });
    expect(mockUpdate).toHaveBeenCalledWith({ is_preferred_variant: true });
  });

  it('возвращает ошибку при неудачном первом update-вызове', async () => {
    mockUpdate.mockImplementation((updateData) => {
      if (updateData.is_preferred_variant === false) {
        return { eq: vi.fn().mockResolvedValue({ error: { message: 'DB error on reset' } }) };
      }
      return { eq: vi.fn() };
    });

    const result = await api.setMasterVersion(parentTrackId, versionId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('Failed to set master version');
    }
  });
});