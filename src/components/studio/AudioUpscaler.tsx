/**
 * Audio Upscaler Component
 * UI for upscaling audio with AudioSR
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Wand2, Download, CheckCircle, XCircle } from 'lucide-react';
import { useAudioUpscale, useAudioUpscaleStatus } from '@/hooks/useAudioUpscale';
import { toast } from 'sonner';

export const AudioUpscaler: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [ddimSteps, setDdimSteps] = useState(50);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);

  const { mutate: upscale, isPending: isStarting } = useAudioUpscale();
  const { data: statusData, isLoading: isPolling } = useAudioUpscaleStatus(
    predictionId,
    !!predictionId && !upscaledUrl
  );

  const handleUpscale = () => {
    if (!inputUrl) {
      toast.error('Please provide an audio URL');
      return;
    }

    upscale(
      {
        inputFileUrl: inputUrl,
        truncatedBatches: true,
        ddimSteps,
        guidanceScale
      },
      {
        onSuccess: (data) => {
          setPredictionId(data.predictionId);
        }
      }
    );
  };

  // Handle status updates
  React.useEffect(() => {
    if (statusData) {
      const data = statusData as any;
      if (data.status === 'succeeded' && data.output) {
        setUpscaledUrl(data.output as string);
        toast.success('Audio upscaled successfully! 🎉');
      } else if (data.status === 'failed') {
        toast.error('Upscaling failed. Please try again.');
        setPredictionId(null);
      }
    }
  }, [statusData]);

  const isProcessing = isStarting || (isPolling && !upscaledUrl);
  const data = statusData as any;
  const progress = data?.status === 'processing' ? 50 : isStarting ? 10 : upscaledUrl ? 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AudioSR Upscaler
          </CardTitle>
          <CardDescription>
            Upscale audio files to 48kHz with enhanced quality using AI super-resolution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input URL */}
          <div className="space-y-2">
            <Label htmlFor="audio-url">Audio File URL *</Label>
            <Input
              id="audio-url"
              placeholder="https://example.com/audio.mp3"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              type="url"
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">
              Provide a direct link to your audio file (MP3, WAV, M4A)
            </p>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="text-sm font-medium">Advanced Settings</h4>

            <div className="space-y-2">
              <Label>DDIM Steps: {ddimSteps}</Label>
              <Slider
                value={[ddimSteps]}
                onValueChange={(value) => setDdimSteps(value[0])}
                min={10}
                max={100}
                step={10}
                disabled={isProcessing}
              />
              <p className="text-sm text-muted-foreground">
                Number of inference steps (higher = better quality, slower)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Guidance Scale: {guidanceScale.toFixed(1)}</Label>
              <Slider
                value={[guidanceScale]}
                onValueChange={(value) => setGuidanceScale(value[0])}
                min={1}
                max={10}
                step={0.5}
                disabled={isProcessing}
              />
              <p className="text-sm text-muted-foreground">
                Classifier-free guidance (higher = more faithful to input)
              </p>
            </div>
          </div>

          {/* Upscale Button */}
          <Button
            onClick={handleUpscale}
            disabled={isProcessing || !inputUrl}
            className="w-full"
            size="lg"
          >
            {isStarting ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                Starting...
              </>
            ) : isPolling ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Upscale Audio
              </>
            )}
          </Button>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                {(statusData as any)?.status === 'processing' 
                  ? 'Upscaling audio...' 
                  : 'Initializing...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {upscaledUrl && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-5 w-5" />
              Upscaled Audio Ready
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <audio
              controls
              src={upscaledUrl}
              className="w-full"
            />
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a href={upscaledUrl} download="upscaled-audio.wav">
                <Download className="h-4 w-4 mr-2" />
                Download Upscaled WAV (48kHz)
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Failed State */}
      {(statusData as any)?.status === 'failed' && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              Upscaling Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(statusData as any).error || 'An error occurred during upscaling. Please try again.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
