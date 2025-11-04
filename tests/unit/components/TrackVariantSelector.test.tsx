import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackVariantSelector } from '@/features/tracks/components/TrackVariantSelector';

// Мокаем хук useTrackVersions, чтобы контролировать количество версий
vi.mock('@/features/tracks/hooks', async () => {
  const actual = await vi.importActual<any>('@/features/tracks/hooks');
  return {
    ...actual,
    useTrackVersions: vi.fn((trackId: string) => ({
      isLoading: false,
      // Компонент использует versionCount и allVersions
      versionCount: 1, // Итого версий: versionCount + 1 = 2
      allVersions: [
        { id: `${trackId}-v1`, audio_url: 'audio1.mp3', versionNumber: 1, isMasterVersion: true },
        { id: `${trackId}-v2`, audio_url: 'audio2.mp3', versionNumber: 2, isMasterVersion: false },
      ],
      setMasterVersion: vi.fn(async () => {}),
    })),
  };
});

describe('TrackVariantSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('по умолчанию показывает только бейдж количества; по клику раскрывает V1/V2', () => {
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={0}
        onVersionChange={onVersionChange}
      />
    );

    // В свернутом состоянии есть только «бейдж» количества
    const totalBadge = screen.getByLabelText('Всего версий: 2');
    expect(totalBadge).toBeInTheDocument();

    // Кнопок V1/V2 пока нет
    expect(screen.queryByRole('button', { name: /версия 1/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /версия 2/i })).toBeNull();

    // Клик по бейджу раскрывает переключатель
    fireEvent.click(totalBadge);
    expect(screen.getByRole('button', { name: /версия 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /версия 2/i })).toBeInTheDocument();
  });

  it('корректно вызывает onVersionChange при клике по V1/V2', () => {
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={0}
        onVersionChange={onVersionChange}
      />
    );

    // Раскрыть переключатель
    const totalBadge = screen.getByLabelText('Всего версий: 2');
    fireEvent.click(totalBadge);

    const versionBtn1 = screen.getByRole('button', { name: /версия 1/i });
    const versionBtn2 = screen.getByRole('button', { name: /версия 2/i });

    fireEvent.click(versionBtn1);
    expect(onVersionChange).toHaveBeenCalledWith(0);

    fireEvent.click(versionBtn2);
    expect(onVersionChange).toHaveBeenCalledWith(1);
  });

  it('поддерживает раскрытие клавишей Enter и закрытие Escape', () => {
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={0}
        onVersionChange={onVersionChange}
      />
    );

    const totalBadge = screen.getByLabelText('Всего версий: 2');
    // Открыть клавиатурой
    fireEvent.keyDown(totalBadge, { key: 'Enter' });
    expect(screen.getByRole('button', { name: /версия 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /версия 2/i })).toBeInTheDocument();

    // Закрыть Escape
    fireEvent.keyDown(totalBadge, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /версия 1/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /версия 2/i })).toBeNull();
  });
});