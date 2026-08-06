import * as React from "react";
import { TriangleAlert } from "lucide-react";
import type { ProviderStatus } from "@/lib/types";
import { providerLabel } from "./assessments";

export interface ProviderNoticeProps {
  providers: ProviderStatus[];
}

/**
 * Quiet inline notice when one instrument is down but the other answered.
 * Renders nothing when everything is healthy (or nothing is configured —
 * that's the full "sky is quiet" state instead).
 */
export function ProviderNotice({ providers }: ProviderNoticeProps) {
  const down = providers.filter((p) => p.configured && !p.ok);
  const up = providers.filter((p) => p.configured && p.ok);
  if (down.length === 0 || up.length === 0) return null;

  const downNames = down.map((p) => providerLabel(p.name)).join(" and ");
  const upNames = up.map((p) => providerLabel(p.name)).join(" and ");
  let detail = down[0].error ?? "no response.";
  if (!detail.endsWith(".")) detail = `${detail}.`;

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-ember/30 bg-depth px-4 py-3"
    >
      <TriangleAlert size={16} strokeWidth={1.5} aria-hidden className="mt-1 shrink-0 text-ember" />
      <p className="text-sm text-moonlight">
        {downNames} didn&apos;t answer — {detail} The results below come from {upNames} alone.
      </p>
    </div>
  );
}
