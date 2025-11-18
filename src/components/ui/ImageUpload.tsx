import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress"; // Import Progress component
import { ImagePlus, X, Upload, Trash2 } from "lucide-react";
import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

// Make the component purely presentational by accepting all state and handlers as props.
interface ImageUploadProps {
  previewUrl: string | null;
  fileName: string | null;
  isUploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleThumbnailClick: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemove: () => void;
  className?: string;
}

export function ImageUpload({
  previewUrl,
  fileName,
  isUploading,
  uploadProgress,
  fileInputRef,
  handleThumbnailClick,
  handleFileChange,
  handleRemove,
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const fakeEvent = {
          target: {
            files: [file],
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
      }
    },
    [handleFileChange],
  );

  return (
    <div className={cn("w-full space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <Input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {!previewUrl ? (
        <div
          onClick={!isUploading ? handleThumbnailClick : undefined}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex h-48 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted",
            isDragging && "border-primary/50 bg-primary/5",
            isUploading && "cursor-not-allowed opacity-50",
          )}
        >
          <div className="rounded-full bg-background p-3 shadow-sm">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Click to select</p>
            <p className="text-xs text-muted-foreground">
              or drag and drop file here
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="group relative h-48 overflow-hidden rounded-lg border">
            <img
              src={previewUrl}
              alt="Preview"
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleThumbnailClick}
                className="h-9 w-9 p-0"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="h-9 w-9 p-0"
                disabled={isUploading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Show progress bar during upload */}
      {isUploading && (
        <div className="space-y-1">
            <Progress value={uploadProgress} className="w-full h-2" />
            <p className="text-xs text-muted-foreground text-center">Uploading...</p>
        </div>
      )}

      {fileName && !isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">{fileName}</span>
          <button
            onClick={handleRemove}
            className="ml-auto rounded-full p-1 hover:bg-muted"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
