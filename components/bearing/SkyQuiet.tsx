import * as React from "react";
import type { ProviderStatus } from "@/lib/types";
import { Button, CompassRose } from "@/components/ui";
import { missingKeyNames } from "./assessments";

export interface SkyQuietProps {
  providers: ProviderStatus[];
  onRetry: () => void;
}

/**
 * Full designed state when no job provider is configured. Names the missing
 * env keys (names only, never values) and offers a retry — adding keys and
 * checking again is the whole recovery.
 */
export function SkyQuiet({ providers, onRetry }: SkyQuietProps) {
  const keys = missingKeyNames(providers);

  return (
    <section
      aria-label="Job search not configured"
      className="flex flex-col items-center gap-6 px-4 py-14 text-center"
    >
      <CompassRose size={72} className="text-moonlight/40" />
      <div className="flex max-w-lg flex-col gap-2">
        <h2 className="text-h2">The sky is quiet</h2>
        <p className="text-moonlight">
          Job search isn&apos;t configured yet, so a real bearing can&apos;t be taken.
          Add your Jooble and Adzuna keys, then check again.
        </p>
      </div>

      {keys.length > 0 && (
        <div className="w-full max-w-sm rounded-xl border bg-depth shadow-panel">
          <ul className="divide-y">
            {keys.map((key) => (
              <li key={key} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="mono-label text-starlight">{key}</span>
                <span className="mono-label text-ember">Missing</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={onRetry}>Check again</Button>
    </section>
  );
}
