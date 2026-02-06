"use client";

import { useRef, useCallback } from "react";
import { Button } from "@quantract/ui";

interface PhotoCaptureProps {
  /** Array of PNG/JPEG data URLs */
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  /** Max bytes per photo before compression (default 2 MB) */
  maxBytes?: number;
}

const DEFAULT_MAX_PHOTOS = 5;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const COMPRESS_MAX_DIM = 1600; // max width/height after resize

/**
 * Camera/file input for capturing site photos on tablets.
 * Compresses images to stay under maxBytes, produces data URLs.
 */
export function PhotoCapture({
  photos,
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  maxBytes = DEFAULT_MAX_BYTES,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          let { width, height } = img;

          // Scale down if exceeds max dimension
          if (width > COMPRESS_MAX_DIM || height > COMPRESS_MAX_DIM) {
            const scale = COMPRESS_MAX_DIM / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas not supported"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Try JPEG at decreasing quality to stay under maxBytes
          let quality = 0.85;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length > maxBytes * 1.37 && quality > 0.3) {
            // 1.37 accounts for base64 overhead
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(dataUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load image"));
        };
        img.src = url;
      });
    },
    [maxBytes],
  );

  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const remaining = maxPhotos - photos.length;
      const toProcess = Array.from(files).slice(0, remaining);
      const newPhotos: string[] = [];

      for (const file of toProcess) {
        if (!file.type.startsWith("image/")) continue;
        try {
          const dataUrl = await compressImage(file);
          newPhotos.push(dataUrl);
        } catch {
          // skip failed images
        }
      }

      if (newPhotos.length > 0) {
        onChange([...photos, ...newPhotos]);
      }

      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [photos, onChange, maxPhotos, compressImage],
  );

  const removePhoto = useCallback(
    (index: number) => {
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Site Photos ({photos.length}/{maxPhotos})
        </label>
        {photos.length < maxPhotos && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            + Add Photo
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-[100px] border-2 border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] transition-colors cursor-pointer bg-transparent"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Tap to take photo or select from gallery
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs leading-none border-none cursor-pointer"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
