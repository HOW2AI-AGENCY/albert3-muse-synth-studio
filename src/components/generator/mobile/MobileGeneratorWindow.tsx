import { useEffect, useMemo, useState, useCallback } from 'react'
import { ArrowLeft, MoreHorizontal, Wand2, FolderOpen, User, AudioLines } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PromptSection } from '@/components/generator/sections/PromptSection'
import { StyleSection } from '@/components/generator/sections/StyleSection'
import { LyricsSection } from '@/components/generator/sections/LyricsSection'
import { AdvancedSection } from '@/components/generator/sections/AdvancedSection'
import { ProjectSelectorDialog } from '@/components/generator/ProjectSelectorDialog'
import { AudioSourceDialog } from '@/components/generator/audio/AudioSourceDialog'
import { PersonaPickerDialog } from '@/components/generator/PersonaPickerDialog'
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore'
import { getDefaultModel } from '@/config/provider-models'
import type { MusicProvider } from '@/config/provider-models'
import { useGeneratorState } from '@/components/generator/hooks'
import { useGenerateMusic } from '@/hooks/useGenerateMusic'
import { useToast } from '@/hooks/use-toast'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog'
import { sanitize } from '@/utils/sanitization'
import { cn } from '@/lib/utils'

type MobileGeneratorWindowProps = {
  onClose: () => void
  onTrackGenerated?: () => void
}

const MobileGeneratorWindow: React.FC<MobileGeneratorWindowProps> = ({ onClose, onTrackGenerated }) => {
  const { selectedProvider } = useMusicGenerationStore()
  const { toast } = useToast()
  const { checkGenerationLimit } = useSubscription()
  const state = useGeneratorState(selectedProvider)
  const { generate, isGenerating } = useGenerateMusic({ provider: selectedProvider as MusicProvider, onSuccess: onTrackGenerated, toast })
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false)
  const [audioDialogOpen, setAudioDialogOpen] = useState(false)
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false)

  useEffect(() => {
    const def = getDefaultModel(selectedProvider as MusicProvider)
    state.setParam('modelVersion', def.value)
  }, [selectedProvider, state])

  const canGenerate = useMemo(() => {
    const hasPrompt = state.debouncedPrompt.trim().length > 0
    const hasLyrics = state.debouncedLyrics.trim().length > 0
    return (hasPrompt || hasLyrics) && !isGenerating
  }, [state.debouncedPrompt, state.debouncedLyrics, isGenerating])

  const handleGenerate = useCallback(async () => {
    try {
      const ok = await checkGenerationLimit()
      if (!ok) {
        toast({ title: 'Достигнут дневной лимит', description: 'Обновите план для увеличения лимита', variant: 'destructive' })
        return
      }
      const hasVocals = state.params.vocalGender !== 'instrumental'
      const vocalGenderParam = hasVocals && state.params.vocalGender !== 'any' ? (state.params.vocalGender.substring(0, 1) as 'f' | 'm') : undefined
      const effectiveLyrics = hasVocals && state.params.lyrics.trim() ? state.params.lyrics.trim() : undefined
      await generate({
        prompt: sanitize(state.params.prompt.trim()),
        title: sanitize(state.params.title.trim()) || undefined,
        lyrics: sanitize(effectiveLyrics),
        hasVocals,
        styleTags: state.params.tags.split(',').map(t => t.trim()).filter(Boolean),
        negativeTags: state.params.negativeTags.trim() || undefined,
        weirdnessConstraint: state.params.weirdnessConstraint / 100,
        styleWeight: state.params.styleWeight / 100,
        lyricsWeight: effectiveLyrics ? state.params.lyricsWeight / 100 : undefined,
        audioWeight: state.params.referenceAudioUrl ? state.params.audioWeight / 100 : undefined,
        vocalGender: vocalGenderParam,
        customMode: !!effectiveLyrics,
        modelVersion: state.params.modelVersion,
        referenceAudioUrl: state.params.referenceAudioUrl || undefined,
        provider: selectedProvider as MusicProvider,
        projectId: state.params.activeProjectId || undefined,
      })
      onClose()
    } catch {
      toast({ title: 'Ошибка генерации', description: 'Попробуйте изменить параметры и повторить', variant: 'destructive' })
    }
  }, [checkGenerationLimit, generate, selectedProvider, state, onClose, toast])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b bg-background/95 backdrop-blur-sm p-4">
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Новый проект</h1>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant={state.mode === 'simple' ? 'default' : 'outline'} size="sm" onClick={() => state.setMode('simple')}>Быстро</Button>
          <Button variant={state.mode === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => state.setMode('custom')}>Расширенно</Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setAudioDialogOpen(true)} aria-label="Референс аудио">
              <AudioLines className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPersonaDialogOpen(true)} aria-label="Выбор персоны">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setProjectDialogOpen(true)} aria-label="Выбор проекта">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <label className="uppercase text-xs font-medium text-primary tracking-widest">Описание трека</label>
          <PromptSection
            value={state.debouncedPrompt}
            onChange={state.setDebouncedPrompt}
            onBoost={async () => {}}
            isEnhancing={false}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-3">
          <label className="uppercase text-xs font-medium text-muted-foreground tracking-widest">Жанры и стили</label>
          <StyleSection
            tags={state.params.tags}
            onChange={(tags) => state.setParam('tags', tags as string)}
            disabled={isGenerating}
          />
        </div>

        {state.mode === 'custom' && (
          <div className="space-y-3">
            <label className="uppercase text-xs font-medium text-muted-foreground tracking-widest">Текст песни</label>
            <LyricsSection
              value={state.debouncedLyrics}
              onChange={state.setDebouncedLyrics}
              onGenerate={() => setLyricsDialogOpen(true)}
              isGenerating={isGenerating}
              disabled={isGenerating}
            />
          </div>
        )}

        <div className={cn('flex items-center justify-between rounded-2xl border p-4 bg-background/50')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border flex items-center justify-center bg-gradient-to-br from-purple-900 to-black">
              <FolderOpen className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Выберите проект</h4>
              <p className="text-[10px] text-muted-foreground">{state.params.activeProjectId ? 'Проект выбран' : 'Не выбран'}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => setProjectDialogOpen(true)}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <AdvancedSection
          modelVersion={state.params.modelVersion || 'V5'}
          onModelChange={(m) => state.setParam('modelVersion', m)}
          vocalGender={state.params.vocalGender || 'any'}
          onVocalGenderChange={(g) =>
            state.setParam('vocalGender', g === 'male' ? 'male' : g === 'female' ? 'female' : 'any')
          }
          instrumental={state.params.vocalGender === 'instrumental'}
          onInstrumentalChange={(v) => state.setParam('vocalGender', v ? 'instrumental' : 'any')}
          audioWeight={state.params.audioWeight}
          onAudioWeightChange={(w) => state.setParam('audioWeight', w)}
          styleWeight={state.params.styleWeight}
          onStyleWeightChange={(w) => state.setParam('styleWeight', w)}
          disabled={isGenerating}
        />
      </ScrollArea>

      <div className="border-t bg-background/90 backdrop-blur-xl p-4">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="group w-full h-14 rounded-2xl bg-white text-black font-semibold shadow"
        >
          <span className="flex items-center justify-center gap-2">
            <Wand2 className="h-5 w-5" />
            {isGenerating ? 'Генерация...' : 'Сгенерировать'}
          </span>
        </Button>
      </div>

      <ProjectSelectorDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        selectedProjectId={state.params.activeProjectId ?? null}
        onProjectSelect={(id) => state.setParam('activeProjectId', id || undefined)}
        onTrackSelect={(track: { id: string; title: string; prompt?: string; lyrics?: string }) => {
          state.setParam('title', track.title)
          if (track.prompt) state.setDebouncedPrompt(track.prompt)
          if (track.lyrics) state.setDebouncedLyrics(track.lyrics)
        }}
        showTrackSelection={true}
      />

      <LyricsGeneratorDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        trackId={state.params.trackId}
        onGenerated={(lyrics) => {
          state.setDebouncedLyrics(lyrics)
          state.setParam('lyrics', lyrics)
        }}
      />

      <AudioSourceDialog
        open={audioDialogOpen}
        onOpenChange={setAudioDialogOpen}
        onAudioSelect={(url, fileName) => {
          state.setParam('referenceAudioUrl', url)
          state.setParam('referenceFileName', fileName)
        }}
        onRecordComplete={() => {}}
        onTrackSelect={(track: { id: string; prompt?: string; lyrics?: string }) => {
          state.setParam('referenceTrackId', track?.id)
          if (track?.prompt) state.setDebouncedPrompt(track.prompt)
          if (track?.lyrics) state.setDebouncedLyrics(track.lyrics)
        }}
      />

      <PersonaPickerDialog
        open={personaDialogOpen}
        onOpenChange={setPersonaDialogOpen}
        selectedPersonaId={state.params.personaId ?? null}
        onSelectPersona={(personaId) => state.setParam('personaId', personaId ?? undefined)}
      />
    </div>
  )
}

export default MobileGeneratorWindow