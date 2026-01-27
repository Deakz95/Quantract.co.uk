"use client";

import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/cn";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept = ".csv,.xlsx,.xls",
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxSize) {
        return `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
      }

      // Check file type
      const allowedTypes = accept.split(",").map((t) => t.trim().toLowerCase());
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const fileMime = file.type.toLowerCase();

      const isAllowed = allowedTypes.some(
        (type) =>
          type === fileExt ||
          type === fileMime ||
          (type.endsWith("/*") && fileMime.startsWith(type.slice(0, -1)))
      );

      if (!isAllowed) {
        return `File type not allowed. Accepted types: ${allowedTypes.join(", ")}`;
      }

      return null;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      {selectedFile ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
              <FileText className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
            isDragOver
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div
              className={cn(
                "mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                isDragOver
                  ? "bg-[var(--primary)]/20"
                  : "bg-[var(--muted)]"
              )}
            >
              <Upload
                className={cn(
                  "h-6 w-6 transition-colors",
                  isDragOver
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)]"
                )}
              />
            </div>
            <p className="mb-1 text-sm font-medium text-[var(--foreground)]">
              {isDragOver ? "Drop your file here" : "Drag and drop your file here"}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              or click to browse
            </p>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Supports: CSV, Excel ({formatFileSize(maxSize)} max)
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
