/**
 * Studio Page
 * Combined interface for MiniMax, AudioSR, and Prompt DJ
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Music, Wand2, Radio } from 'lucide-react';
import { MinimaxGenerator } from '@/components/studio/MinimaxGenerator';
import { AudioUpscaler } from '@/components/studio/AudioUpscaler';
import { PromptDJ } from '@/components/prompt-dj/PromptDJ';

const Studio: React.FC = () => {
  const [activeTab, setActiveTab] = useState('minimax');

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <Card variant="modern" className="p-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🎹 Music Studio
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
              Advanced music generation, processing, and real-time mixing tools
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              AI Powered
            </Badge>
            <Badge variant="outline" className="text-xs">
              Real-time
            </Badge>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="minimax" className="gap-2">
                <Music className="h-4 w-4" />
                <span className="hidden sm:inline">MiniMax Generator</span>
                <span className="sm:hidden">MiniMax</span>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>AI-генерация музыки с MiniMax</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="upscale" className="gap-2">
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Audio Upscaler</span>
                <span className="sm:hidden">Upscale</span>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Улучшение качества аудио</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="prompt-dj" className="gap-2">
                <Radio className="h-4 w-4" />
                <span className="hidden sm:inline">Prompt DJ</span>
                <span className="sm:hidden">DJ</span>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Диджейская станция с AI</p>
            </TooltipContent>
          </Tooltip>
        </TabsList>

        <TabsContent value="minimax" className="mt-6 animate-fade-in">
          <Card variant="modern" className="p-6">
            <MinimaxGenerator />
          </Card>
        </TabsContent>

        <TabsContent value="upscale" className="mt-6 animate-fade-in">
          <Card variant="modern" className="p-6">
            <AudioUpscaler />
          </Card>
        </TabsContent>

        <TabsContent value="prompt-dj" className="mt-6 animate-fade-in">
          <Card variant="modern" className="p-6">
            <PromptDJ />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Studio;
