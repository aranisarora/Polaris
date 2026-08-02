"use server";

import { redirect } from "next/navigation";
import {
  CV_PROMPT_VERSION,
  extractEntities,
  type ExtractedCv,
} from "@/lib/cv/entities";
import {
  MAX_FILE_BYTES,
  extractDocumentText,
  sniff,
} from "@/lib/cv/text";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * CV upload → structured entities.
 *
 * The order of operations is the whole design, and it follows from
 * `docs/product.md` §12.4: **store every raw input forever.** So the file is
 * written to storage and recorded in `raw_inputs` *before* anything tries to
 * read it. Every later step is allowed to fail without losing the student's
 * document — a parser bug in month two is then a re-run, not a data loss.
 *
 * Entities are written per §12.3, and the prompt-and-model pairing that
 * produced them is stamped into `analyses` per §12.5.
 */

export type UploadState = {
  error?: string;
  /** A parse happened, and this is what it found. Rendered back for review. */
  found?: {
    projects: string[];
    skills: string[];
    certifications: string[];
    education: number;
    experience: number;
    /** The parse was thin or the model was unavailable. */
    degraded: boolean;
    note?: string;
  };
};

const BUCKET = "cv-uploads";

export async function uploadCv(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await getUser();
  const supabase = await createClient();
  if (!user || !supabase) redirect("/gate");

  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      error: "That file is over 5 MB. A CV that large is a scan — export it as a PDF instead.",
    };
  }

  const buffer = await file.arrayBuffer();
  const kind = sniff(new Uint8Array(buffer));
  if (!kind) {
    return {
      error: "That is not a PDF or a Word document. Export it as a PDF and try again.",
    };
  }

  const contentType =
    kind === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  // The first path segment is the owner, which is what every storage policy in
  // the migration compares against. Never the original filename — a student's
  // CV is routinely named with their full name and phone number.
  const path = `${user.id}/${crypto.randomUUID()}.${kind}`;

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });

  if (storageError) {
    return {
      error: "We could not save that file. Try again, or take the six questions instead.",
    };
  }

  // §12.4. Written before the parse, so the original is recorded even if
  // everything below this line fails.
  const { data: rawInput } = await supabase
    .from("raw_inputs")
    .insert({
      profile_id: user.id,
      kind: formData.get("source") === "linkedin" ? "linkedin-pdf" : "cv",
      storage_path: path,
      mime: contentType,
      original_name: file.name.slice(0, 200),
    })
    .select("id")
    .single();

  const rawInputId = rawInput?.id ?? null;

  /** No-op when the `raw_inputs` insert did not return a row. */
  const recordPayload = async (payload: Record<string, unknown>) => {
    if (!rawInputId) return;
    await supabase.from("raw_inputs").update({ payload }).eq("id", rawInputId);
  };

  const extraction = await extractDocumentText(buffer);
  if (!extraction.ok) {
    // The file is kept regardless. If we ship OCR later, these are exactly the
    // documents to re-run it against.
    await recordPayload({ extraction: { ok: false, code: extraction.code } });
    return { error: extraction.reason };
  }

  // The extracted text is itself a raw artefact — pre-interpretation, and what
  // a re-parse should read rather than re-opening the PDF.
  await recordPayload({
    extraction: {
      ok: true,
      kind: extraction.kind,
      wordCount: extraction.wordCount,
      pages: extraction.pages,
      truncated: extraction.truncated,
    },
    text: extraction.text,
  });

  const result = await extractEntities(extraction.text);
  const entities = result.entities;

  // A re-upload replaces the previous file's entities rather than stacking a
  // second copy of every project on top. Anything the student typed themselves
  // through the six questions is left alone — we do not overwrite their words
  // with a parse of their document.
  await supabase
    .from("cv_entities")
    .update({ archived_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("origin", "cv-upload")
    .is("archived_at", null);

  const rows = toRows(entities, user.id, rawInputId);
  if (rows.length) {
    await supabase.from("cv_entities").insert(rows);
  }

  // §12.5 — which prompt and which model read this student's CV. Cannot be
  // reconstructed after the fact, so it is recorded at the time.
  await supabase.from("analyses").insert({
    profile_id: user.id,
    kind: "cv-extraction",
    engine_version: result.version,
    output: {
      promptVersion: CV_PROMPT_VERSION,
      method: result.method,
      degraded: result.degraded,
      rawInputId,
      source: extraction.kind,
      wordCount: extraction.wordCount,
      pages: extraction.pages,
      truncated: extraction.truncated,
      counts: {
        projects: entities.projects.length,
        skills: entities.skills.length,
        certifications: entities.certifications.length,
        education: entities.education.length,
        experience: entities.experience.length,
      },
      entities,
    },
  });

  const nothingFound =
    entities.projects.length === 0 &&
    entities.skills.length === 0 &&
    entities.certifications.length === 0;

  return {
    found: {
      projects: entities.projects.map((p) => p.title),
      skills: entities.skills,
      certifications: entities.certifications.map((c) => c.name),
      education: entities.education.length,
      experience: entities.experience.length,
      degraded: result.degraded || nothingFound,
      note: nothingFound
        ? "We could not find projects or skills in that file. The six questions will do better — they ask directly."
        : result.note,
    },
  };
}

type EntityRow = {
  profile_id: string;
  kind: "project" | "skill" | "education" | "experience" | "certification";
  data: Record<string, unknown>;
  origin: string;
  origin_ref: string | null;
};

/**
 * Entities, never a blob (§12.3). The `project` shape matches what
 * `lib/viewer.ts` reads into `ProfileSignals`, so an uploaded CV and the six
 * questions produce the same audit input — which is what `docs/platform.md`
 * §3.4 means by all four intake routes being first-class.
 */
function toRows(
  cv: ExtractedCv,
  profileId: string,
  rawInputId: string | null,
): EntityRow[] {
  const base = { profile_id: profileId, origin: "cv-upload", origin_ref: rawInputId };

  return [
    ...cv.projects.map((p) => ({
      ...base,
      kind: "project" as const,
      data: {
        title: p.title,
        blurb: p.blurb,
        deployedUrl: p.deployedUrl,
        repoUrl: p.repoUrl,
        technologies: p.technologies?.length ? p.technologies : undefined,
      },
    })),
    ...cv.skills.map((name) => ({
      ...base,
      kind: "skill" as const,
      data: { name },
    })),
    ...cv.certifications.map((c) => ({
      ...base,
      kind: "certification" as const,
      data: { name: c.name, issuer: c.issuer, proctored: c.proctored },
    })),
    ...cv.education.map((e) => ({
      ...base,
      kind: "education" as const,
      data: { ...e },
    })),
    ...cv.experience.map((x) => ({
      ...base,
      kind: "experience" as const,
      data: { ...x },
    })),
  ];
}
