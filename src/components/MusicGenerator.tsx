import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

export const MusicGenerator = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const { toast } = useToast();

  const improvePrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description first",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: { prompt },
      });

      if (error) throw error;

      setPrompt(data.improvedPrompt);
      toast({
        title: "Prompt improved!",
        description: "Your description has been enhanced with AI",
      });
    } catch (error) {
      console.error("Error improving prompt:", error);
      toast({
        title: "Error",
        description: "Failed to improve prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  const generateMusic = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a music description",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to generate music",
          variant: "destructive",
        });
        return;
      }

      // Create track record
      const { data: track, error: trackError } = await supabase
        .from("tracks")
        .insert({
          user_id: user.id,
          title: prompt.substring(0, 50),
          prompt: prompt,
          status: "pending",
        })
        .select()
        .single();

      if (trackError) throw trackError;

      // Generate music via edge function
      const { data, error } = await supabase.functions.invoke("generate-music", {
        body: { trackId: track.id, prompt },
      });

      if (error) throw error;

      toast({
        title: "Music generation started!",
        description: "Your track is being created. This may take a minute...",
      });

      setPrompt("");
      onTrackGenerated?.();
    } catch (error) {
      console.error("Error generating music:", error);
      toast({
        title: "Error",
        description: "Failed to generate music. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="card-glass p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gradient-primary">
          Create Your Music
        </h3>
        <p className="text-muted-foreground text-sm">
          Describe the music you want to create, and AI will generate it for you
        </p>
      </div>

      <div className="space-y-4">
        <Textarea
          placeholder="Example: An upbeat electronic track with synth melodies and driving bass, perfect for a workout playlist..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] resize-none bg-background/50"
          disabled={isGenerating || isImproving}
        />

        <div className="flex gap-3">
          <Button
            variant="glow"
            onClick={improvePrompt}
            disabled={isImproving || isGenerating}
            className="flex-1"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {isImproving ? "Improving..." : "Improve with AI"}
          </Button>

          <Button
            variant="hero"
            onClick={generateMusic}
            disabled={isGenerating || isImproving}
            className="flex-1"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Music"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
