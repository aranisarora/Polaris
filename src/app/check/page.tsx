import type { Metadata } from "next";
import { COLLEGES, GRAD_YEARS } from "@/lib/data/colleges";
import { buildCountdown, type Countdown } from "@/lib/engine/countdown";
import { CheckForm } from "./check-form";

export const metadata: Metadata = {
  title: "Check your eligibility",
  description:
    "Seven questions, forty-five seconds, no signup. See which companies you can walk into today.",
};

/**
 * `/check` — the ungated ledger flow (`docs/platform.md` §3.1).
 *
 * The countdown figures are computed here, on the server, for every offered
 * graduation year. That keeps the resolve state showing real calendar
 * arithmetic rather than decoration, without a second round trip at exactly
 * the moment the funnel can least afford one.
 */
export default async function CheckPage(props: {
  searchParams: Promise<{ college?: string }>;
}) {
  const { college } = await props.searchParams;

  const colleges = [...COLLEGES]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      area: c.area,
      universityCode: c.universityCode,
      autonomous: c.autonomous,
    }));

  const valid = college && colleges.some((c) => c.slug === college);
  const initialCollege = valid ? college : college === "other" ? "other" : "";

  const countdowns: Record<number, Countdown> = {};
  for (const year of GRAD_YEARS) {
    countdowns[year] = buildCountdown(year, "VTU");
  }

  return (
    <CheckForm
      colleges={colleges}
      initialCollege={initialCollege}
      countdowns={countdowns}
    />
  );
}
