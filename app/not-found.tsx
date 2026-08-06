import { LinkButton } from "@/components/ui/Button";
import { CompassRose } from "@/components/ui/glyphs";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <CompassRose size={72} className="text-moonlight/50" />
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-display text-h1 text-starlight">
          This coordinate is uncharted
        </h1>
        <p className="text-moonlight">
          There&apos;s nothing at this position. Your chart is still where you
          left it.
        </p>
      </div>
      <LinkButton href="/">Return to the chart</LinkButton>
    </main>
  );
}
