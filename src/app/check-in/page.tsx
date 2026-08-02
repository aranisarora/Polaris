import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { activeTasks } from "@/lib/engine/roadmap";
import { loadViewer } from "@/lib/viewer";
import { submitCheckIn } from "./actions";

export const metadata: Metadata = { title: "Weekly check-in" };

/**
 * `/check-in` — under 30 seconds on a phone (`docs/product.md` §11.3).
 *
 * `docs/brand.md` §11.5 makes this a sheet rather than a tab: it is entered
 * from a push notification or a deep link and must return the student to
 * wherever they were. A check-in that navigates away costs a re-orientation
 * every week.
 *
 * §1.4's design consequence is why it has its own URL at all: the delivery
 * channel must be swappable — web push now, WhatsApp later — without touching
 * the check-in itself.
 */
export default async function CheckInPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  const task = activeTasks(v.roadmap, 1)[0];

  if (v.mechanismLocked) {
    return (
      <div className="shell">
        <header className="top">
          <Wordmark href="/today" />
          <span className="sp" />
          <span className="tr">Check-in</span>
        </header>
        <main className="wrap" style={{ flex: 1, paddingTop: 20 }}>
          <h1 className="verdict v-lg">The loop is what locked.</h1>
          <p className="lede" style={{ marginTop: 10 }}>
            Your plan is still yours and still visible — all{" "}
            {v.roadmap.tasks.length} items, every deadline. What stopped is the
            weekly check-in and the re-planning that follows it.
          </p>
          <Link
            href="/pricing"
            className="btn btn--a btn--full"
            style={{ marginTop: 20 }}
          >
            See what that costs
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/today" />
        <span className="sp" />
        <span className="tr">~25 seconds</span>
      </header>

      <main
        className="wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingBottom: 28,
        }}
      >
        <span className="eyebrow">This week</span>
        <h1 className="verdict v-lg" style={{ marginTop: 11 }}>
          {task ? `How did "${task.action.title}" go?` : "How did the week go?"}
        </h1>

        <form action={submitCheckIn} className="stack g10" style={{ marginTop: 22 }}>
          <input type="hidden" name="task" value={task?.id ?? ""} />
          {[
            { value: "done", label: "Done" },
            { value: "partial", label: "Got part-way" },
            { value: "no-time", label: "Ran out of time" },
            { value: "stuck", label: "Got stuck" },
          ].map((option) => (
            <button
              key={option.value}
              type="submit"
              name="response"
              value={option.value}
              className="btn btn--g"
              style={{ justifyContent: "flex-start", padding: 16 }}
            >
              {option.label}
            </button>
          ))}
        </form>

        <hr className="hr" />

        <div className="card card--open">
          <span className="eyebrow" style={{ color: "var(--p-open)" }}>
            The plan adjusts either way
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            &ldquo;Ran out of time&rdquo; lightens next week.
            &ldquo;Got stuck&rdquo; swaps in a narrower task. A bad week costs
            you nothing.
          </p>
        </div>
      </main>
    </div>
  );
}
