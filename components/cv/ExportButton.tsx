"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button, useToast, type ButtonVariant } from "@/components/ui";

/**
 * One-tap PDF export. Fetches GET /api/cv/export so the button can carry a
 * real loading state and a designed error (quiet toast naming the recovery
 * — the button stays live, pressing again is the retry).
 */
export function ExportButton({
  variant = "primary",
}: {
  variant?: ButtonVariant;
}) {
  const [pending, setPending] = React.useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setPending(true);
    try {
      const response = await fetch("/api/cv/export");
      if (!response.ok) throw new Error("export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "polaris-cv.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast("Exported — polaris-cv.pdf", { tone: "success" });
    } catch {
      toast("The export didn't complete. Try again.", { tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant={variant} loading={pending} onClick={handleExport}>
      {!pending && <Download size={18} strokeWidth={1.5} aria-hidden />}
      Export as PDF
    </Button>
  );
}
