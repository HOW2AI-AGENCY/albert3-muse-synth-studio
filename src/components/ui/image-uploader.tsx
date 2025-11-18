/**
 * ImageUploadField - Professional image upload component
 * Adapted from origin UI for React (non-Next.js)
 */
import { AlertCircle, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Input } from "./input";
import { Skeleton } from "./skeleton";

interface ImageUploadFieldProps {
  value?: File | string | null;
  onChange?: (value: File | string | null) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  aspectRatio?: number;
  defaultImage?: string;
  isLoading?: boolean;
  maxSize?: number; // in bytes
}

export function ImageUploadField({
  value,
  onChange,
  onBlur,
  className,
  disabled = false,
  error = false,
  aspectRatio = 1,
  defaultImage,
  isLoading = false,
  maxSize = 4 * 1024 * 1024, // 4MB default
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Handle preview URL generation and cleanup
  useEffect(() => {
    if (typeof value === "string") {
      setPreviewUrl(value);
    } else if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(defaultImage || null);
    }
  }, [value, defaultImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      // Could add error handling here
      return;
    }

    onChange?.(file);
    onBlur?.();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <Skeleton
        className={cn(
          "rounded-lg border-2 border-dashed border-muted",
          className,
        )}
        style={{ aspectRatio }}
      />
    );
  }

  return (
    <div className={cn("group relative", className)}>
      <Input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
        aria-invalid={error}
      />

      <div
        className={cn(
          "relative overflow-hidden rounded-lg border-2 transition-all",
          "hover:border-primary/50 cursor-pointer bg-background",
          error
            ? "border-destructive hover:border-destructive"
            : "border-muted",
          disabled && "pointer-events-none opacity-50 cursor-not-allowed",
          previewUrl ? "border-solid" : "border-dashed",
        )}
        style={{ aspectRatio }}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <>
            {/* Using regular img instead of Next.js Image */}
            <img
              src={previewUrl}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-50"
            />

            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                <UploadCloud className="w-8 h-8 text-white/80" />
              </div>
            )}

            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={handleRemove}
              >
                <X className="w-4 h-4 text-foreground/70" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Нажмите для загрузки
              </p>
              <p className="text-xs text-muted-foreground">
                {maxSize
                  ? `Макс. размер: ${(maxSize / 1024 / 1024).toFixed(0)} МБ`
                  : "Поддерживаемые форматы: JPG, PNG, GIF"}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4" />
            Неверное изображение
          </div>
        )}
      </div>
    </div>
  );
}
