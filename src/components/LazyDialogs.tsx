/**
 * Lazy-loaded Dialog Components
 * Оптимизация bundle size через code splitting
 */

import { lazy, Suspense, ComponentProps } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Lazy imports - используем named exports, оборачиваем в default
const TrackDeleteDialogComponent = lazy(() => 
  import('@/components/tracks/TrackDeleteDialog').then(m => ({ default: m.TrackDeleteDialog }))
);
const ExtendTrackDialogComponent = lazy(() => 
  import('@/components/tracks/ExtendTrackDialog').then(m => ({ default: m.ExtendTrackDialog }))
);
const CreateCoverDialogComponent = lazy(() => 
  import('@/components/tracks/CreateCoverDialog').then(m => ({ default: m.CreateCoverDialog }))
);
const SeparateStemsDialogComponent = lazy(() => 
  import('@/components/tracks/SeparateStemsDialog').then(m => ({ default: m.SeparateStemsDialog }))
);
const LyricsGeneratorDialogComponent = lazy(() => 
  import('@/components/lyrics/LyricsGeneratorDialog').then(m => ({ default: m.LyricsGeneratorDialog }))
);
const AddVocalDialogComponent = lazy(() => 
  import('@/components/tracks/AddVocalDialog').then(m => ({ default: m.AddVocalDialog }))
);
const AddInstrumentalDialogComponent = lazy(() => 
  import('@/components/tracks/AddInstrumentalDialog').then(m => ({ default: m.AddInstrumentalDialog }))
);
const CreatePersonaDialogComponent = lazy(() =>
  import('@/components/personas/CreatePersonaDialog').then(m => ({ default: m.CreatePersonaDialog }))
);

// Skeleton для диалогов
const DialogSkeleton = () => (
  <Dialog open>
    <DialogContent className="max-w-md">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

// Wrapper компоненты с Suspense
export const LazyTrackDeleteDialog = (props: ComponentProps<typeof TrackDeleteDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <TrackDeleteDialogComponent {...props} />
  </Suspense>
);

export const LazyExtendTrackDialog = (props: ComponentProps<typeof ExtendTrackDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <ExtendTrackDialogComponent {...props} />
  </Suspense>
);

export const LazyCreateCoverDialog = (props: ComponentProps<typeof CreateCoverDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <CreateCoverDialogComponent {...props} />
  </Suspense>
);

export const LazySeparateStemsDialog = (props: ComponentProps<typeof SeparateStemsDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <SeparateStemsDialogComponent {...props} />
  </Suspense>
);

export const LazyLyricsGeneratorDialog = (props: ComponentProps<typeof LyricsGeneratorDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <LyricsGeneratorDialogComponent {...props} />
  </Suspense>
);

export const LazyAddVocalDialog = (props: ComponentProps<typeof AddVocalDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <AddVocalDialogComponent {...props} />
  </Suspense>
);

export const LazyAddInstrumentalDialog = (props: ComponentProps<typeof AddInstrumentalDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <AddInstrumentalDialogComponent {...props} />
  </Suspense>
);

export const LazyCreatePersonaDialog = (props: ComponentProps<typeof CreatePersonaDialogComponent>) => (
  <Suspense fallback={<DialogSkeleton />}>
    <CreatePersonaDialogComponent {...props} />
  </Suspense>
);
