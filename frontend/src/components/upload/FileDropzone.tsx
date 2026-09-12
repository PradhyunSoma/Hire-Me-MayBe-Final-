import React, { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, FileText, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatBytes } from "@/lib/utils";
import type { UploadedFile } from "@/types";

export function FileDropzone({
  onFiles,
  accept = { "application/pdf": [".pdf"] },
  maxFiles = 1,
  multiple = false,
  label,
  description,
  icon,
  className,
  maxSize = 10 * 1024 * 1024,
}: {
  onFiles: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  multiple?: boolean;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  maxSize?: number;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onFiles(accepted.slice(0, maxFiles));
    },
    [onFiles, maxFiles]
  );
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    multiple,
    maxSize,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-8 text-center",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
          : isDragReject
          ? "border-destructive bg-destructive/5"
          : "border-border/80 hover:border-primary/60 hover:bg-muted/30",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl transition-all",
            isDragActive
              ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
              : "bg-primary/10 text-primary group-hover:bg-primary/15"
          )}
        >
          {icon || <UploadCloud className="h-7 w-7" />}
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{label}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <p className="text-xs text-muted-foreground pt-1">
            PDF only · up to {formatBytes(maxSize)}
            {multiple && ` · max ${maxFiles} files`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FileRow({
  file,
  onRemove,
  onRetry,
}: {
  file: UploadedFile;
  onRemove?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{file.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatBytes(file.size)}
          </span>
        </div>
        {file.uploading ? (
          <Progress value={file.progress} className="h-1.5" />
        ) : file.error ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {file.error}
          </div>
        ) : file.uploaded ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Uploaded
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Ready</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {file.uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {file.error && onRetry && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Retry" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Retry</span>
          </Button>
        )}
        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            title="Remove"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function FileList({
  files,
  onRemove,
  onRetry,
  maxFiles,
  currentCount,
}: {
  files: UploadedFile[];
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  maxFiles?: number;
  currentCount?: number;
}) {
  return (
    <div className="space-y-2">
      {typeof currentCount === "number" && typeof maxFiles === "number" && (
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
          <span>Files</span>
          <span className="tabular-nums">
            <span className={cn(currentCount >= maxFiles ? "text-primary font-semibold" : "")}>
              {currentCount}
            </span>{" "}
            / {maxFiles} resumes
          </span>
        </div>
      )}
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
        {files.map((f) => (
          <FileRow
            key={f.id}
            file={f}
            onRemove={onRemove ? () => onRemove(f.id) : undefined}
            onRetry={onRetry ? () => onRetry(f.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
