import { ChevronDown } from "lucide-react";

const STEPS = [
  "Open your LinkedIn profile and select More under your name.",
  "Choose Save to PDF — LinkedIn builds the file for you.",
  "Drop that PDF here once it downloads.",
];

/**
 * Collapsed helper under the dropzone for people whose CV lives on LinkedIn.
 * Native <details> — no JS, keyboard-accessible, 44px summary target.
 */
export function LinkedInDisclosure() {
  return (
    <details className="group mt-4 rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-2 text-sm font-medium text-moonlight transition-colors duration-150 hover:text-starlight [&::-webkit-details-marker]:hidden">
        Using LinkedIn? Export your profile as a PDF
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden
          className="shrink-0 transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <ol className="grid gap-2.5 px-4 pb-4 pt-1">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-baseline gap-3 text-sm">
            <span className="mono-label shrink-0 text-gold">{i + 1}</span>
            <span className="text-moonlight">{step}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
