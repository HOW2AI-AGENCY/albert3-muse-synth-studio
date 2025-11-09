import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackVariantSelector } from '@/features/tracks/components/TrackVariantSelector';

// Гибкий мок useTrackVersions с поддержкой сценариев
let scenario: 'twoVariants' | 'mainPlusVariant' = 'twoVariants';
let setMasterSpy = vi.fn(async () => {});

vi.mock('@/features/tracks/hooks', async () => {
  const actual = await vi.importActual<any>('@/features/tracks/hooks');
  return {
    ...actual,
    useTrackVersions: vi.fn((trackId: string) => {
      if (scenario === 'mainPlusVariant') {
        return {
          isLoading: false,
          versionCount: 1, // всего: 2 (оригинал + 1 вариант)
          allVersions: [
            { id: `${trackId}-main`, audio_url: 'main.mp3', versionNumber: 0, sourceVersionNumber: 0, isMasterVersion: false },
            { id: `${trackId}-v1`, audio_url: 'audio1.mp3', versionNumber: 1, sourceVersionNumber: 1, isMasterVersion: false },
          ],
          setMasterVersion: setMasterSpy,
        };
      }
      // По умолчанию: 2 варианта, V1 — MASTER
      return {
        isLoading: false,
        versionCount: 1, // всего: 2
        allVersions: [
          { id: `${trackId}-v1`, audio_url: 'audio1.mp3', versionNumber: 1, isMasterVersion: true },
          { id: `${trackId}-v2`, audio_url: 'audio2.mp3', versionNumber: 2, isMasterVersion: false },
        ],
        setMasterVersion: setMasterSpy,
      };
    }),
  };
});

describe('TrackVariantSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scenario = 'twoVariants';
    setMasterSpy = vi.fn(async () => {});
  });

  it('в закрытом состоянии показывает активную версию и метку MASTER; по клику раскрывает V1/V2', () => {
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={0}
        onVersionChange={onVersionChange}
      />
    );

    // В свернутом состоянии показывается активная версия и метка MASTER
    const activeBadge = screen.getByLabelText('Активная версия: V1 (MASTER)');
    expect(activeBadge).toBeInTheDocument();

    // Кнопок V1/V2 пока нет
    expect(screen.queryByRole('button', { name: /версия 1/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /версия 2/i })).toBeNull();

    // Клик по бейджу раскрывает переключатель
    fireEvent.click(activeBadge);
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
    const activeBadge = screen.getByLabelText('Активная версия: V1 (MASTER)');
    fireEvent.click(activeBadge);

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

    const activeBadge = screen.getByLabelText('Активная версия: V1 (MASTER)');
    // Открыть клавиатурой
    fireEvent.keyDown(activeBadge, { key: 'Enter' });
    expect(screen.getByRole('button', { name: /версия 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /версия 2/i })).toBeInTheDocument();

    // Закрыть Escape
    fireEvent.keyDown(activeBadge, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /версия 1/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /версия 2/i })).toBeNull();
  });

  it('не позволяет назначать основную версию как мастер: кнопка со звёздой отключена и имеет метку "Основная версия"', () => {
    scenario = 'mainPlusVariant';
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={0}
        onVersionChange={onVersionChange}
      />
    );

    // Кнопка установки мастер-версии должна быть отключена для основной версии
    const starBtn = screen.getByRole('button', { name: 'Основная версия' });
    expect(starBtn).toBeDisabled();
  });

  it('позволяет назначить вариант как мастер: кнопка активна и вызывает API', async () => {
    scenario = 'mainPlusVariant';
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={1}
        onVersionChange={onVersionChange}
      />
    );

    // Для варианта должна быть активная кнопка "Установить как мастер"
    const starBtn = screen.getByRole('button', { name: 'Установить как мастер' });
    expect(starBtn).not.toBeDisabled();

    // Клик инициирует вызов setMasterVersion
    fireEvent.click(starBtn);
    expect(setMasterSpy).toHaveBeenCalledTimes(1);
    // Аргумент — id текущей версии
    expect(setMasterSpy.mock.calls[0][0]).toBe('track-123-v1');
  });
});