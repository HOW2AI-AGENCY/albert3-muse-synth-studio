/**
 * Studio Page
 * Combined interface for MiniMax, AudioSR, and Prompt DJ
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Wand2, Radio } from 'lucide-react';
import { MinimaxGenerator } from '@/components/studio/MinimaxGenerator';
import { AudioUpscaler } from '@/components/studio/AudioUpscaler';
import { PromptDJ } from '@/components/prompt-dj/PromptDJ';

const Studio: React.FC = () => {
  const [activeTab, setActiveTab] = useState('minimax');

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          🎹 Music Studio
        </h1>
        <p className="text-lg text-muted-foreground">
          Advanced music generation, processing, and real-time mixing tools
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="minimax" className="gap-2">
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">MiniMax Generator</span>
            <span className="sm:hidden">MiniMax</span>
          </TabsTrigger>
          <TabsTrigger value="upscale" className="gap-2">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Audio Upscaler</span>
            <span className="sm:hidden">Upscale</span>
          </TabsTrigger>
          <TabsTrigger value="prompt-dj" className="gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Prompt DJ</span>
            <span className="sm:hidden">DJ</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minimax" className="mt-6">
          <MinimaxGenerator />
        </TabsContent>

        <TabsContent value="upscale" className="mt-6">
          <AudioUpscaler />
        </TabsContent>

        <TabsContent value="prompt-dj" className="mt-6">
          <PromptDJ />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Studio;
