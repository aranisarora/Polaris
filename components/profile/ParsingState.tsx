"use client";

import * as React from "react";
import { CompassSpinner, Panel } from "@/components/ui";

const STAGES = [
  "Reading your CV…",
  "Charting your experience…",
  "Collecting skills and projects…",
  "Setting your position on the chart…",
];

const STAGE_MS = 2_600;

export interface ParsingStateProps {
  fileName: string;
}

/**
 * The wait while Gemini reads the PDF. Staged copy keeps the moment alive —
 * the stages advance on a timer and hold on the last line until the parse
 * resolves. Never a bare spinner.
 */
export function ParsingState({ fileName }: ParsingStateProps) {
  const [stage, setStage] = React.useState(0);

  React.useEffect(() => {
    if (stage >= STAGES.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), STAGE_MS);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <Panel padding="lg" className="flex flex-col items-center gap-5 text-center">
      <CompassSpinner size={48} label="" />
      <div>
        <h2 className="text-h3 text-starlight">Reading your CV</h2>
        <p aria-live="polite" className="mt-2 text-moonlight">
          <span key={stage} className="inline-block animate-fade-up">
            {STAGES[stage]}
          </span>
        </p>
      </div>
      <p className="mono-label text-moonlight" title={fileName}>
        {fileName.length > 36 ? `${fileName.slice(0, 33)}…` : fileName}
      </p>
    </Panel>
  );
}
