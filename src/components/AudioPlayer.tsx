import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  title: string;
  audioUrl?: string;
  trackId: string;
  onDelete?: () => void;
}

export const AudioPlayer = ({ title, audioUrl, trackId, onDelete }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `${title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: "Your track is being downloaded",
    });
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="card-glass p-6 space-y-4">
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      <div className="space-y-2">
        <h3 className="font-semibold text-lg truncate">{title}</h3>
        <div className="text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </div>
      </div>

      <div className="space-y-4">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          disabled={!audioUrl}
          className="cursor-pointer"
        />

        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="hero"
            onClick={togglePlay}
            disabled={!audioUrl}
            className="h-12 w-12 rounded-full"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={(v) => setVolume(v[0])}
              className="flex-1 max-w-[120px]"
            />
          </div>

          <div className="flex gap-2">
            {audioUrl && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
