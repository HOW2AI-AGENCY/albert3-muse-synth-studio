import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const UpscaleAudioDialog = lazy(() => 
  import('./dialogs/UpscaleAudioDialog').then(m => ({ default: m.UpscaleAudioDialog }))
);

export const LazyUpscaleAudioDialog = (props: any) => (
  <Suspense fallback={
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  }>
    <UpscaleAudioDialog {...props} />
  </Suspense>
);
