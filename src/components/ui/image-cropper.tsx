"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Crop, Upload, UploadCloud, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface CroppedImageData {
  url: string;
  file: File;
  metadata: ImageDimensions;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

interface ImageUploaderProps {
  imgClassName?: string;
  onImageCropped?: (data: CroppedImageData) => void;
  fixedSize?: { width: number; height: number };
  aspectRatio?: number; // e.g., 16/9, 4/3, 1/1
  className?: string;
  maxFileSize?: number;
  supportedFormats?: string[];
  name?: string;
  value?: string | File | null;
  onChange?: (value: string | File | null) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function ImageCropper({
  onImageCropped,
  fixedSize,
  aspectRatio,
  className,
  maxFileSize = MAX_FILE_SIZE,
  supportedFormats = SUPPORTED_FORMATS,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  imgClassName,
  placeholder = "Drag and drop an image here, or click to select",
}: ImageUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && typeof value === "string" && value !== croppedImageUrl) {
      setCroppedImageUrl(value);
    }
  }, [value]);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!supportedFormats.includes(file.type)) {
        return `Unsupported file format. Please use: ${supportedFormats
          .map((f) => f.split("/")[1].toUpperCase())
          .join(", ")}`;
      }

      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        return `File size too large. Maximum size is ${maxSizeMB}MB`;
      }

      return null;
    },
    [supportedFormats, maxFileSize],
  );

  const checkImageDimensions = useCallback(
    (img: HTMLImageElement): boolean => {
      if (!fixedSize) return false;
      return (
        img.naturalWidth === fixedSize.width &&
        img.naturalHeight === fixedSize.height
      );
    },
    [fixedSize],
  );

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (disabled) return;

      setValidationError(null);
      setIsProcessing(true);

      try {
        const validationError = validateFile(file);
        if (validationError) {
          setValidationError(validationError);
          setIsProcessing(false);
          resetFileInput();
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setSelectedImage(imageUrl);
          setOriginalFile(file);

          const tempImg = new Image();
          tempImg.onload = () => {
            if (checkImageDimensions(tempImg)) {
              const croppedImageUrl = imageUrl;
              setCroppedImageUrl(croppedImageUrl);
              onChange?.(file);
              onImageCropped?.({
                url: croppedImageUrl,
                file,
                metadata: {
                  width: tempImg.naturalWidth,
                  height: tempImg.naturalHeight,
                },
              });
              onBlur?.();
              setIsProcessing(false);
            } else {
              setShowCropDialog(true);
              setIsProcessing(false);
            }
          };
          tempImg.onerror = () => {
            setValidationError("Invalid or corrupted image file");
            setIsProcessing(false);
            resetFileInput();
          };
          tempImg.src = imageUrl;
        };
        reader.onerror = () => {
          setValidationError("Failed to read file");
          setIsProcessing(false);
          resetFileInput();
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("File processing error:", error);
        setValidationError("An error occurred while processing the file");
        setIsProcessing(false);
        resetFileInput();
      }
    },
    [
      disabled,
      validateFile,
      checkImageDimensions,
      onChange,
      onImageCropped,
      onBlur,
      resetFileInput,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current && cropContainerRef.current) {
      const img = imageRef.current;
      const imgRect = img.getBoundingClientRect();

      // Calculate crop dimensions to take full width
      let cropWidth = imgRect.width;
      let cropHeight = imgRect.height;

      if (fixedSize) {
        // For fixed size, maintain aspect ratio but use full width
        const targetRatio = fixedSize.width / fixedSize.height;
        cropHeight = cropWidth / targetRatio;

        // If calculated height exceeds container, adjust both dimensions
        if (cropHeight > imgRect.height) {
          cropHeight = imgRect.height;
          cropWidth = cropHeight * targetRatio;
        }
      } else if (aspectRatio) {
        // For aspect ratio only, maintain ratio with full width
        cropHeight = cropWidth / aspectRatio;

        // If calculated height exceeds container, adjust both dimensions
        if (cropHeight > imgRect.height) {
          cropHeight = imgRect.height;
          cropWidth = cropHeight * aspectRatio;
        }
      }

      setCropArea({
        x: 0,
        y: (imgRect.height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    }
  }, [fixedSize, aspectRatio]);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();

      if (fixedSize && type === "resize") return;

      setDragStart({ x: e.clientX, y: e.clientY });
      if (type === "move") {
        setIsDragging(true);
      } else {
        setIsResizing(true);
      }
    },
    [fixedSize],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging && !isResizing) return;
      if (!cropContainerRef.current || !imageRef.current) return;

      requestAnimationFrame(() => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const imgRect = imageRef.current!.getBoundingClientRect();

        if (isDragging) {
          setCropArea((prev) => {
            const newX = Math.max(
              0,
              Math.min(imgRect.width - prev.width, prev.x + deltaX),
            );
            const newY = Math.max(
              0,
              Math.min(imgRect.height - prev.height, prev.y + deltaY),
            );
            return { ...prev, x: newX, y: newY };
          });
        } else if (isResizing) {
          setCropArea((prev) => {
            let newWidth = Math.max(50, prev.width + deltaX);
            let newHeight = Math.max(50, prev.height + deltaY);

            if (aspectRatio) {
              if (Math.abs(deltaX) > Math.abs(deltaY)) {
                newHeight = newWidth / aspectRatio;
              } else {
                newWidth = newHeight * aspectRatio;
              }
            }

            newWidth = Math.min(newWidth, imgRect.width - prev.x);
            newHeight = Math.min(newHeight, imgRect.height - prev.y);

            return { ...prev, width: newWidth, height: newHeight };
          });
        }

        setDragStart({ x: e.clientX, y: e.clientY });
      });
    },
    [isDragging, isResizing, dragStart, aspectRatio],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const blobToFile = useCallback((blob: Blob, filename: string): File => {
    return new File([blob], filename, { type: blob.type });
  }, []);

  //  cropImage function
  const cropImage = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current || !originalFile) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      const img = imageRef.current;
      const imgRect = img.getBoundingClientRect();

      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;

      const outputWidth =
        fixedSize?.width || Math.round(cropArea.width * scaleX);
      const outputHeight =
        fixedSize?.height || Math.round(cropArea.height * scaleY);

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        img,
        Math.round(cropArea.x * scaleX),
        Math.round(cropArea.y * scaleY),
        Math.round(cropArea.width * scaleX),
        Math.round(cropArea.height * scaleY),
        0,
        0,
        outputWidth,
        outputHeight,
      );

      // Use setTimeout to prevent UI blocking
      setTimeout(() => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedImageUrl = URL.createObjectURL(blob);
              const croppedFile = blobToFile(
                blob,
                `cropped-${originalFile.name}`,
              );

              setCroppedImageUrl(croppedImageUrl);
              onChange?.(croppedFile);
              onImageCropped?.({
                url: croppedImageUrl,
                file: croppedFile,
                metadata: { width: outputWidth, height: outputHeight },
              });
              setShowCropDialog(false);
              onBlur?.();
            }
            setIsProcessing(false);
          },
          "image/jpeg", // Use JPEG for better performance with photos
          0.9, // Slightly lower quality for better performance
        );
      }, 0);
    } catch (error) {
      console.error("Error cropping image:", error);
      setValidationError("Failed to crop image. Please try again.");
      setIsProcessing(false);
    }
  }, [
    cropArea,
    fixedSize,
    originalFile,
    onImageCropped,
    onChange,
    onBlur,
    blobToFile,
  ]);

  const handleRemoveImage = useCallback(() => {
    if (croppedImageUrl && croppedImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(croppedImageUrl);
    }

    setCroppedImageUrl(null);
    setValidationError(null);
    onChange?.(null);
    onBlur?.();
    resetFileInput();
  }, [croppedImageUrl, onChange, onBlur, resetFileInput]);

  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setShowCropDialog(false);

        if (selectedImage && selectedImage.startsWith("blob:")) {
          URL.revokeObjectURL(selectedImage);
        }

        setSelectedImage(null);
        setOriginalFile(null);
        setValidationError(null);
        resetFileInput();
      }
    },
    [selectedImage, resetFileInput],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  useEffect(() => {
    return () => {
      if (croppedImageUrl && croppedImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(croppedImageUrl);
      }
      if (selectedImage && selectedImage.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [croppedImageUrl, selectedImage]);

  const displayError = error || validationError;
  const currentAspectRatio =
    cropArea.width > 0 && cropArea.height > 0
      ? (cropArea.width / cropArea.height).toFixed(2)
      : "1.00";

  return (
    <>
      <div
        className={cn(
          "group overflow-hidden",
          "h-52",
          "border-2 border-dashed rounded-lg bg-background  text-center transition-colors",
          disabled
            ? "border-muted-foreground/10 bg-muted/5 cursor-not-allowed"
            : "cursor-pointer",
          !disabled && isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          displayError && "border-destructive bg-destructive/5",
          className,
        )}
      >
        <div
          onDrop={!disabled ? handleDrop : undefined}
          onDragOver={!disabled ? handleDragOver : undefined}
          onDragLeave={!disabled ? handleDragLeave : undefined}
          onClick={
            !disabled && !isProcessing
              ? () => fileInputRef.current?.click()
              : undefined
          }
        >
          {croppedImageUrl ? (
            <div className="relative">
              <img
                src={croppedImageUrl || "/placeholder.svg"}
                alt="Uploaded image"
                className={cn(
                  "w-full h-[204px] object-cover rounded-lg ",
                  imgClassName,
                )}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="">
              <div className="relative w-full px-4 py-8 flex-1">
                <Upload
                  className={cn(
                    "mx-auto h-12 w-12 mb-4",
                    disabled
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground",
                  )}
                />
                <p
                  className={cn(
                    "text-sm mb-2 line-clamp-2",
                    disabled
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground",
                  )}
                >
                  {isProcessing ? "Processing image..." : placeholder}
                </p>
                <p
                  className={cn(
                    "text-xs line-clamp-1",
                    disabled
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground",
                  )}
                >
                  Supports{" "}
                  {supportedFormats
                    .map((f) => f.split("/")[1].toUpperCase())
                    .join(", ")}{" "}
                  up to {Math.round(maxFileSize)} MB
                </p>
                {validationError && (
                  <p className="text-xs text-destructive mt-2">
                    {validationError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={supportedFormats.join(",")}
          className="hidden"
          disabled={disabled || isProcessing}
          onChange={handleFileInputChange}
        />
      </div>

      <Dialog open={showCropDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="w-fit  max-w-7xl! max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-5 w-5" />
              Crop Image
              {fixedSize && (
                <Badge variant="secondary" className="ml-2">
                  {fixedSize.width}×{fixedSize.height}
                </Badge>
              )}
              {aspectRatio && !fixedSize && (
                <Badge variant="secondary" className="ml-2">
                  Ratio {aspectRatio.toFixed(2)}:1
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              ref={cropContainerRef}
              className="relative max-h-[80vh] overflow-hidden rounded-lg border bg-muted/10 select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {selectedImage && (
                <>
                  <img
                    ref={imageRef}
                    src={selectedImage || "/placeholder.svg"}
                    alt="Crop preview"
                    className="max-w-full w-full max-h-[70vh] object-contain"
                    onLoad={handleImageLoad}
                    draggable={false}
                  />

                  <div
                    className={cn(
                      "absolute border-2 border-primary bg-primary/10",
                      fixedSize ? "cursor-default" : "cursor-move",
                    )}
                    style={{
                      left: cropArea.x,
                      top: cropArea.y,
                      width: cropArea.width,
                      height: cropArea.height,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, "move")}
                  >
                    {!fixedSize && (
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-se-resize border border-primary-foreground"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, "resize");
                        }}
                      />
                    )}

                    <div className="absolute -top-8 left-0 bg-primary text-primary-foreground px-2 py-1 rounded text-xs whitespace-nowrap">
                      {Math.round(cropArea.width)}×{Math.round(cropArea.height)}
                      <span className="ml-2 opacity-75">
                        {currentAspectRatio}:1
                      </span>
                      {aspectRatio && (
                        <span className="ml-1 opacity-75">
                          (target: {aspectRatio.toFixed(2)}:1)
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={cropImage} disabled={isProcessing}>
              <Crop className="h-4 w-4 mr-2" />
              {isProcessing ? "Processing..." : "Crop Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}