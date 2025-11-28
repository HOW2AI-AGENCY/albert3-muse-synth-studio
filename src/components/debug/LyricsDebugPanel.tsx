/**
 * ============================================================================
 * LYRICS DEBUG PANEL
 * ============================================================================
 *
 * @file LyricsDebugPanel.tsx
 * @description Компонент для отладки проблем с отображением lyrics
 *
 * @features
 * - Показывает сырые данные lyrics из track
 * - Проверяет все источники lyrics (main track, variants, versions)
 * - Выводит детальную информацию для отладки
 * - Предупреждения о проблемах с данными
 *
 * @usage
 * Добавьте этот компонент в DetailPanelMobileV2 для отладки:
 * <LyricsDebugPanel track={track} />
 *
 * После отладки - удалите или скройте этот компонент
 *
 * @version 1.0.0
 * @created 2025-11-28
 * ============================================================================
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bug, AlertCircle, CheckCircle } from 'lucide-react';
import type { Track } from '@/types/track.types';

interface LyricsDebugPanelProps {
  track: Track;
}

/**
 * LyricsDebugPanel - компонент для debugging lyrics display issues
 *
 * Проверяет:
 * 1. Наличие lyrics в основном треке
 * 2. Формат lyrics (пустая строка, whitespace, null, undefined)
 * 3. Наличие lyrics в версиях
 * 4. Parsing секций [Verse], [Chorus] и т.д.
 */
export const LyricsDebugPanel = ({ track }: LyricsDebugPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  /* ====================================================================
   * ПРОВЕРКИ LYRICS
   * ==================================================================== */

  /**
   * Проверка наличия lyrics в main track
   */
  const mainLyrics = track.lyrics;
  const hasMainLyrics = !!mainLyrics && mainLyrics.trim().length > 0;

  /**
   * Проверка lyrics в versions
   */
  const versionsWithLyrics = track.versions?.filter(v => v.lyrics && v.lyrics.trim().length > 0) || [];
  const hasVersionLyrics = versionsWithLyrics.length > 0;

  /**
   * Общая проверка - есть ли lyrics где-либо
   */
  const hasAnyLyrics = hasMainLyrics || hasVersionLyrics;

  /**
   * Проверка формата lyrics
   */
  const lyricsType = typeof mainLyrics;
  const lyricsLength = mainLyrics?.length || 0;
  const lyricsIsEmpty = mainLyrics === '' || mainLyrics === null || mainLyrics === undefined;
  const lyricsIsWhitespace = mainLyrics && mainLyrics.trim().length === 0;

  /**
   * Parsing секций [Verse], [Chorus] и т.д.
   */
  const hasSections = mainLyrics?.includes('[') && mainLyrics?.includes(']');
  const sectionMatches = mainLyrics?.match(/\[[^\]]+\]/g) || [];

  /* ====================================================================
   * RENDER
   * ==================================================================== */

  return (
    <Card className="border-2 border-orange-500/50 bg-orange-50/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-sm">Lyrics Debug Panel</CardTitle>
            {hasAnyLyrics ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Lyrics OK
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                No Lyrics
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 text-xs">
          {/* ============================================================
           * MAIN TRACK LYRICS
           * ============================================================ */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Main Track Lyrics:</h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Has Lyrics:</span>
                <Badge variant={hasMainLyrics ? "default" : "secondary"}>
                  {hasMainLyrics ? '✅ Yes' : '❌ No'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="secondary">{lyricsType}</Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Length:</span>
                <Badge variant="secondary">{lyricsLength} chars</Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Is Empty:</span>
                <Badge variant={lyricsIsEmpty ? "destructive" : "default"}>
                  {lyricsIsEmpty ? '⚠️ Yes' : '✅ No'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Is Whitespace:</span>
                <Badge variant={lyricsIsWhitespace ? "destructive" : "default"}>
                  {lyricsIsWhitespace ? '⚠️ Yes' : '✅ No'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Has Sections:</span>
                <Badge variant={hasSections ? "default" : "secondary"}>
                  {hasSections ? '✅ Yes' : 'No'}
                </Badge>
              </div>
            </div>

            {hasSections && sectionMatches.length > 0 && (
              <div>
                <span className="text-muted-foreground">Found Sections:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sectionMatches.map((section, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px]">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Первые 200 символов для preview */}
            {mainLyrics && mainLyrics.length > 0 && (
              <div className="mt-2">
                <span className="text-muted-foreground">Preview:</span>
                <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto max-h-20 overflow-y-auto">
                  {mainLyrics.substring(0, 200)}
                  {mainLyrics.length > 200 && '...'}
                </pre>
              </div>
            )}
          </div>

          {/* ============================================================
           * VERSIONS LYRICS
           * ============================================================ */}
          <div className="space-y-2 border-t pt-2">
            <h4 className="font-semibold text-sm">Versions Lyrics:</h4>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Versions:</span>
              <Badge variant="secondary">{track.versions?.length || 0}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Versions with Lyrics:</span>
              <Badge variant={hasVersionLyrics ? "default" : "secondary"}>
                {versionsWithLyrics.length}
              </Badge>
            </div>

            {versionsWithLyrics.length > 0 && (
              <div className="space-y-1">
                {versionsWithLyrics.map((version, idx) => (
                  <div key={version.id || idx} className="text-[10px] p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px]">
                        V{version.variant_index ?? 0}
                      </Badge>
                      {version.is_preferred_variant && (
                        <Badge variant="default" className="text-[9px]">Preferred</Badge>
                      )}
                      <span className="text-muted-foreground">
                        {version.lyrics?.length || 0} chars
                      </span>
                    </div>
                    <pre className="overflow-x-auto">
                      {version.lyrics?.substring(0, 100)}...
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================
           * WARNINGS & RECOMMENDATIONS
           * ============================================================ */}
          <div className="space-y-2 border-t pt-2">
            <h4 className="font-semibold text-sm text-orange-600">⚠️ Warnings:</h4>

            {!hasAnyLyrics && (
              <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                <p className="text-destructive font-medium">No lyrics found</p>
                <p className="text-muted-foreground mt-1">
                  Lyrics отсутствуют и в main track, и во всех versions.
                  Проверьте:
                </p>
                <ul className="list-disc list-inside mt-1 text-muted-foreground">
                  <li>Были ли lyrics при генерации трека?</li>
                  <li>Проверьте БД: SELECT id, title, lyrics FROM tracks WHERE id = '{track.id}'</li>
                  <li>Проверьте network tab - приходят ли lyrics с API?</li>
                </ul>
              </div>
            )}

            {lyricsIsWhitespace && (
              <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
                <p className="text-orange-600 font-medium">Lyrics is whitespace only</p>
                <p className="text-muted-foreground mt-1">
                  Поле lyrics содержит только пробелы/переносы строк.
                  Это будет считаться "пустым" после .trim()
                </p>
              </div>
            )}

            {hasMainLyrics && !hasSections && (
              <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                <p className="text-blue-600 font-medium">No structured sections found</p>
                <p className="text-muted-foreground mt-1">
                  Lyrics не содержат секций [Verse], [Chorus] и т.д.
                  StructuredLyricsViewer покажет весь текст как одну секцию.
                </p>
              </div>
            )}
          </div>

          {/* ============================================================
           * RAW DATA
           * ============================================================ */}
          <details className="border-t pt-2">
            <summary className="cursor-pointer font-semibold text-sm mb-2">
              Raw Track Data (JSON)
            </summary>
            <pre className="p-2 bg-muted rounded text-[9px] overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify({
                id: track.id,
                title: track.title,
                lyrics: track.lyrics,
                versions: track.versions?.map(v => ({
                  id: v.id,
                  variant_index: v.variant_index,
                  lyrics: v.lyrics,
                  is_preferred: v.is_preferred_variant,
                })),
              }, null, 2)}
            </pre>
          </details>
        </CardContent>
      )}
    </Card>
  );
};
