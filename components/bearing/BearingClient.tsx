"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type {
  ClassifiedJob,
  DreamAssessment,
  JobPosting,
  JobSearchResult,
  ProviderStatus,
} from "@/lib/types";
import {
  Button,
  CompassSpinner,
  Dialog,
  EmptyState,
  ErrorState,
  LinkButton,
  NorthStarGlyph,
  WaypointGlyph,
  useToast,
} from "@/components/ui";
import {
  lockTarget,
  type LockedTargetResult,
  type LockResult,
} from "@/app/(app)/bearing/actions";
import {
  applyRecommended,
  asSentence,
  chunk,
  classifyRecovery,
  mergeJobs,
  providerLabel,
} from "./helpers";
import { DreamCard } from "./DreamCard";
import { JobRow } from "./JobRow";
import { JobRowSkeleton } from "./JobRowSkeleton";
import { ProviderNotice } from "./ProviderNotice";
import { SkyQuiet } from "./SkyQuiet";
import { TierGroups } from "./TierGroups";

export interface LockedSummary {
  title: string;
  company: string;
  isDream: boolean;
  postingId: string | null;
}

export interface BearingClientProps {
  initialJobs: ClassifiedJob[];
  initialDream: DreamAssessment | null;
  dreamStatement: string;
  dreamTitle: string | null;
  initialLocked: LockedSummary | null;
}

type Phase =
  | "ready"
  | "searching"
  | "classifying"
  | "unconfigured"
  | "empty"
  | "search-error";

const SEARCH_SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"];

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    // The browser's own failure text ("Failed to fetch") must never reach a
    // surface — every caller reads err.message straight into an error state.
    throw new Error("The sky didn't answer — check your connection and try again.");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Something didn't answer. Try again.";
    throw new Error(message);
  }
  return data as T;
}

/**
 * Client orchestration of the reality check: "Taking your bearing" sequence
 * (search → classify in batches, rows streaming in with tier stars settling),
 * stored assessments rendered instantly, the pinned dream, tier groups, and
 * the lock-a-destination confirmation moment.
 */
export function BearingClient({
  initialJobs,
  initialDream,
  dreamStatement,
  dreamTitle,
  initialLocked,
}: BearingClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = React.useState<Phase>(
    initialJobs.length > 0 ? "ready" : "searching",
  );
  const [jobs, setJobs] = React.useState<ClassifiedJob[]>(initialJobs);
  const [dream, setDream] = React.useState<DreamAssessment | null>(initialDream);
  const [dreamState, setDreamState] = React.useState<"idle" | "loading" | "error">(
    initialDream ? "idle" : "loading",
  );
  const [dreamError, setDreamError] = React.useState<string | null>(null);
  const [providers, setProviders] = React.useState<ProviderStatus[]>([]);
  const [pendingPostings, setPendingPostings] = React.useState<JobPosting[]>([]);
  const [failedPostings, setFailedPostings] = React.useState<JobPosting[]>([]);
  const [classifyError, setClassifyError] = React.useState<string | null>(null);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [totalPostings, setTotalPostings] = React.useState(0);
  const [retryingFailed, setRetryingFailed] = React.useState(false);
  const [locked, setLocked] = React.useState<LockedSummary | null>(initialLocked);
  const [lockPendingId, setLockPendingId] = React.useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<LockedTargetResult | null>(null);
  const [retakeOpen, setRetakeOpen] = React.useState(false);

  /** Stagger offsets (ms) per posting id for the settle-in animation. */
  const [delays, setDelays] = React.useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );
  const startedRef = React.useRef(false);
  /** Mirrors `jobs` so a failing search can tell whether anything is worth keeping. */
  const jobsRef = React.useRef<ClassifiedJob[]>(initialJobs);
  React.useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  /** Mirrors whether a dream assessment is in hand (the card must never spin on). */
  const hasDreamRef = React.useRef(initialDream !== null);
  React.useEffect(() => {
    hasDreamRef.current = dream !== null;
  }, [dream]);

  const assessDream = React.useCallback(async () => {
    setDreamState("loading");
    setDreamError(null);
    try {
      const { dream: fresh } = await postJSON<{ dream: DreamAssessment }>(
        "/api/dream/assess",
        {},
      );
      setDream(fresh);
      setDreamState("idle");
    } catch (err) {
      setDreamError(
        err instanceof Error ? err.message : "Your dream couldn't be assessed.",
      );
      setDreamState("error");
    }
  }, []);

  const takeBearing = React.useCallback(
    async (isRetake: boolean) => {
      setPhase("searching");
      setSearchError(null);
      setClassifyError(null);
      setFailedPostings([]);
      setPendingPostings([]);
      // The existing rows stay in state until the new search actually
      // answers — a failed retake must never strand the user with nothing.

      /** Keep a bearing the user already has; only fall to the full error
       * surface when there is genuinely nothing left to show. */
      const failSearch = (message: string) => {
        setSearchError(message);
        setPhase(jobsRef.current.length > 0 ? "ready" : "search-error");
        // The dream reading is independent of job search — never leave the
        // pinned card loading behind a failure.
        if (!hasDreamRef.current) void assessDream();
      };

      let search: JobSearchResult;
      try {
        search = await postJSON<JobSearchResult>("/api/jobs/search", {});
      } catch (err) {
        failSearch(
          err instanceof Error ? err.message : "The bearing couldn't be taken. Try again.",
        );
        return;
      }

      setProviders(search.providers);
      const configured = search.providers.filter((p) => p.configured);
      if (configured.length === 0) {
        setPhase("unconfigured");
        return;
      }
      if (configured.every((p) => !p.ok)) {
        failSearch(
          `The instruments didn't answer — ${configured
            .map((p) => `${providerLabel(p.name)}: ${p.error ?? "no response"}`)
            .join("; ")}.`,
        );
        return;
      }

      // The dream is assessed alongside the classification — pinned first.
      void assessDream();

      // The sky answered: only now are the previous bearing's rows stale.
      setJobs([]);
      setDelays(new Map());

      if (search.postings.length === 0) {
        setPhase("empty");
        return;
      }

      setTotalPostings(search.postings.length);
      setPendingPostings(search.postings);
      setPhase("classifying");

      const failed: JobPosting[] = [];
      let firstError: string | null = null;
      const batches = chunk(search.postings, 8);
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        try {
          const { classified } = await postJSON<{ classified: ClassifiedJob[] }>(
            "/api/jobs/classify",
            { postings: batch, reset: isRetake && i === 0 },
          );
          setDelays((prev) => {
            const next = new Map(prev);
            classified.forEach((job, index) =>
              next.set(job.posting.id, index * 60),
            );
            return next;
          });
          setJobs((prev) => applyRecommended(mergeJobs(prev, classified)));
        } catch (err) {
          failed.push(...batch);
          firstError ??=
            err instanceof Error ? err.message : "The bearing couldn't be read. Try again.";
        } finally {
          setPendingPostings((prev) =>
            prev.filter((p) => !batch.some((b) => b.id === p.id)),
          );
        }
      }

      setFailedPostings(failed);
      setClassifyError(failed.length > 0 ? firstError : null);
      setPhase("ready");
    },
    [assessDream],
  );

  React.useEffect(() => {
    // Mount-only: the initial props decide whether a bearing must be taken.
    if (startedRef.current) return;
    startedRef.current = true;
    // Deferred one tick so the kickoff's state updates never run
    // synchronously inside the effect body.
    const id = window.setTimeout(() => {
      if (initialJobs.length === 0) void takeBearing(false);
      else if (!initialDream) void assessDream();
    }, 0);
    return () => {
      startedRef.current = false;
      window.clearTimeout(id);
    };
  }, [initialJobs.length, initialDream, takeBearing, assessDream]);

  async function retryFailed() {
    const toRetry = failedPostings;
    if (toRetry.length === 0 || retryingFailed) return;
    setRetryingFailed(true);
    setClassifyError(null);
    const stillFailed: JobPosting[] = [];
    let firstError: string | null = null;
    for (const batch of chunk(toRetry, 8)) {
      try {
        const { classified } = await postJSON<{ classified: ClassifiedJob[] }>(
          "/api/jobs/classify",
          { postings: batch },
        );
        setJobs((prev) => applyRecommended(mergeJobs(prev, classified)));
      } catch (err) {
        stillFailed.push(...batch);
        firstError ??=
          err instanceof Error ? err.message : "The bearing couldn't be read. Try again.";
      }
    }
    setFailedPostings(stillFailed);
    setClassifyError(stillFailed.length > 0 ? firstError : null);
    setRetryingFailed(false);
  }

  async function handleLock(job: ClassifiedJob | "dream") {
    const key = job === "dream" ? "dream" : job.id;
    if (lockPendingId) return;
    setLockPendingId(key);
    let result: LockResult;
    try {
      result = await lockTarget(job === "dream" ? { dream: true } : { assessmentId: job.id });
    } catch {
      result = { ok: false, error: "The destination couldn't be locked. Try again." };
    }
    setLockPendingId(null);
    if (!result.ok || !result.target) {
      toast(result.error ?? "The destination couldn't be locked. Try again.", {
        tone: "error",
      });
      return;
    }
    setLocked({
      title: result.target.title,
      company: result.target.company,
      isDream: result.target.isDream,
      postingId: result.target.postingId,
    });
    setConfirmTarget(result.target);
  }

  const sequence = phase === "searching" || phase === "classifying";

  const sequenceView = (
    <section aria-label="Taking your bearing" className="flex flex-col gap-4">
      <div
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg border bg-depth px-4 py-3"
      >
        <CompassSpinner size={18} label="" className="text-gold" />
        <span className="mono-label min-w-0 text-gold">
          {phase === "searching"
            ? "Searching the sky for live postings"
            : `Comparing your profile against ${totalPostings} live postings`}
        </span>
        {phase === "classifying" && (
          <span className="mono-label ml-auto shrink-0 whitespace-nowrap text-moonlight">
            {jobs.length} / {totalPostings}
          </span>
        )}
      </div>
      <ul
        className="flex flex-col gap-3"
        aria-busy={phase === "searching" || pendingPostings.length > 0}
      >
        {(phase === "classifying" ? jobs : []).map((job) => (
          <JobRow
            key={job.posting.id}
            job={job}
            actionable={false}
            animateIn
            delayMs={delays.get(job.posting.id) ?? 0}
          />
        ))}
        {(phase === "searching"
          ? SEARCH_SKELETON_KEYS
          : pendingPostings.map((p) => p.id)
        ).map((key) => (
          <JobRowSkeleton key={key} />
        ))}
      </ul>
    </section>
  );

  // A partial classification failure is a sentence, never a list: the count,
  // the reason, what survived, one way forward. Printing the unread postings
  // would turn the surface into the job-board dump the THESIS refuses — and
  // an unread posting has nothing to say about the user anyway.
  const unreadCount = failedPostings.length;
  const failedRecovery = classifyRecovery(classifyError);
  const failedPanel = unreadCount > 0 && (
    <ErrorState
      title={`${unreadCount} ${unreadCount === 1 ? "posting" : "postings"} couldn't be read into this bearing`}
      detail={[
        asSentence(classifyError ?? "The instruments went quiet part-way through"),
        jobs.length > 0
          ? `Everything below is measured and complete — ${jobs.length} ${
              jobs.length === 1 ? "posting" : "postings"
            } read against your profile.`
          : "Nothing in this bearing could be measured against your profile.",
      ].join(" ")}
      action={
        failedRecovery === "reload" ? (
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        ) : (
          <Button
            variant="secondary"
            loading={retryingFailed}
            onClick={() => void retryFailed()}
          >
            Read them again
          </Button>
        )
      }
    />
  );

  // A retake that failed while a bearing was already on screen: the old
  // bearing stays, the failure is stated inline above it.
  const staleBearingNotice =
    phase === "ready" && searchError !== null ? (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-ember/40 bg-depth p-4 shadow-panel"
      >
        <p className="text-sm font-medium text-starlight">
          The new bearing couldn&apos;t be taken — this one is the last reading,
          still intact.
        </p>
        <p className="text-sm text-moonlight">{searchError}</p>
        <div>
          <Button variant="secondary" onClick={() => void takeBearing(true)}>
            Try again
          </Button>
        </div>
      </div>
    ) : null;

  const groupedView = (
    <>
      {failedPanel}
      {jobs.length > 0 ? (
        <TierGroups
          jobs={jobs}
          lockedPostingId={locked?.postingId ?? null}
          lockPendingId={lockPendingId}
          onLock={(job) => void handleLock(job)}
        />
      ) : failedPostings.length === 0 ? (
        <EmptyState
          title="No postings in this bearing"
          body="The last search left nothing behind. Retake the bearing to read the sky again."
          action={<Button onClick={() => void takeBearing(true)}>Retake bearing</Button>}
        />
      ) : null}
    </>
  );

  const emptyView = (
    <EmptyState
      title="The sky is clear — nothing matched"
      body="No live postings came back for your keywords. Broadening the search usually fixes this: reword your dream or loosen the role."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/onboarding">Edit your course</LinkButton>
          <Button variant="secondary" onClick={() => void takeBearing(false)}>
            Search again
          </Button>
        </div>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-[65ch] flex-col gap-1">
          <h1 className="text-h1 text-starlight">
            {sequence ? "Taking your bearing" : "Your bearing"}
          </h1>
          <p className="text-moonlight">
            {sequence
              ? "Real postings, measured against your real position. Nothing is hidden."
              : "Live postings measured against where you are today. Your dream stays pinned."}
          </p>
        </div>
        {phase === "ready" && jobs.length > 0 && (
          <Button variant="ghost" onClick={() => setRetakeOpen(true)}>
            <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
            Retake bearing
          </Button>
        )}
      </header>

      {locked && (phase === "ready" || phase === "empty") && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-depth px-4 py-3">
          <span className="mono-label text-gold">Current destination</span>
          <span className="text-sm text-starlight">
            {locked.title}
            {locked.company ? ` at ${locked.company}` : ""}
          </span>
          <span className="text-sm text-moonlight">
            Locking a new waypoint replaces it.
          </span>
        </div>
      )}

      {phase === "unconfigured" ? (
        <SkyQuiet providers={providers} onRetry={() => void takeBearing(false)} />
      ) : (
        <>
          {/* The dream is pinned at the top of every state but the
              unconfigured one — never hidden, not even by a search failure. */}
          <DreamCard
            dream={dream}
            state={dreamState}
            error={dreamError}
            dreamStatement={dreamStatement}
            dreamTitle={dreamTitle}
            onRetry={() => void assessDream()}
            onLock={() => void handleLock("dream")}
            lockPending={lockPendingId === "dream"}
            isLocked={locked?.isDream ?? false}
            actionable={phase === "ready" || phase === "empty"}
          />
          {phase === "search-error" ? (
            <ErrorState
              title="The bearing couldn't be taken"
              detail={searchError ?? undefined}
              action={
                <Button variant="secondary" onClick={() => void takeBearing(false)}>
                  Try again
                </Button>
              }
            />
          ) : (
            <>
              {staleBearingNotice}
              <ProviderNotice providers={providers} />
              {phase === "empty" ? emptyView : sequence ? sequenceView : groupedView}
            </>
          )}
        </>
      )}

      {/* The confirmation moment — course locked, route ahead. */}
      <Dialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title="Course locked"
        footer={
          <Button size="lg" onClick={() => router.push("/roadmap")}>
            Draw my route
          </Button>
        }
      >
        {confirmTarget && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2" aria-hidden="true">
              <WaypointGlyph state="current" size={14} />
              <span className="flex-1 border-t border-dashed border-gold/60" />
              <NorthStarGlyph size={22} />
            </div>
            <p className="text-starlight">
              {confirmTarget.title}
              {confirmTarget.company ? ` at ${confirmTarget.company}` : ""}.
            </p>
            <p className="text-sm text-moonlight">
              Next, Polaris draws your route — the ordered work between where you
              stand and this destination, each step tied to what the postings
              actually ask for.
            </p>
            {!confirmTarget.isDream && confirmTarget.dreamBeyond && (
              <p className="text-sm text-moonlight">
                Your north star stays on the chart — this waypoint builds toward it.
              </p>
            )}
          </div>
        )}
      </Dialog>

      {/* Retake confirmation — re-queries the sky; the cache keeps it cheap. */}
      <Dialog
        open={retakeOpen}
        onClose={() => setRetakeOpen(false)}
        title="Retake your bearing?"
        description="Polaris re-queries the live sky and measures every posting against your profile again. Recent searches are cached, so this is quick."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRetakeOpen(false)}>
              Keep this bearing
            </Button>
            <Button
              onClick={() => {
                setRetakeOpen(false);
                void takeBearing(true);
              }}
            >
              Retake bearing
            </Button>
          </>
        }
      />
    </div>
  );
}
