"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";

const MAX_BYTES = 8 * 1024 * 1024;

export interface CVDropzoneProps {
  onFile: (file: File) => void;
  className?: string;
}

/** Client-side pre-check so obvious problems never cost a round trip. */
function validate(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" ||
    (file.type === "" && file.name.toLowerCase().endsWith(".pdf"));
  if (!isPdf) {
    return "That file isn't a PDF. Export your CV as a PDF and try again.";
  }
  if (file.size === 0) {
    return "That file is empty. Choose a different PDF.";
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `That PDF is ${mb}MB — the limit is 8MB. Export a lighter version and try again.`;
  }
  return null;
}

/**
 * The CV dropzone: drag-and-drop with a visible drag-over state, plus a
 * 44px+ file picker button. Accepts PDF up to 8MB; problems are named
 * inline, in ember.
 */
export function CVDropzone({ onFile, className }: CVDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onFile(file);
  }

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-10 text-center transition-colors duration-150",
          dragOver
            ? "border-gold bg-veil/25"
            : "border-hairline-strong hover:border-gold/50",
        )}
      >
        <FileUp
          size={28}
          strokeWidth={1.5}
          aria-hidden
          className={cn(
            "transition-colors duration-150",
            dragOver ? "text-gold-bright" : "text-gold",
          )}
        />
        <div>
          <p className="font-medium text-starlight">
            {dragOver ? "Drop it — we'll take it from here" : "Drag your CV here"}
          </p>
          <p className="mt-1 text-sm text-moonlight">
            or pick the file yourself
          </p>
        </div>
        <Button type="button" size="lg">
          Choose a PDF
        </Button>
        <p className="mono-label text-moonlight">PDF · UP TO 8MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label="Upload your CV as a PDF"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2.5 text-sm text-ember">
          {error}
        </p>
      )}
    </div>
  );
}
