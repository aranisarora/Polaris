import "server-only";
import { cookies } from "next/headers";
import type { StudentRecord } from "./engine/record";

/**
 * Who is looking at the ledger, and where their record came from.
 *
 * `docs/product.md` §10.1 puts the ledger *before* the account: seven fields,
 * no signup, no upload, ~45 seconds in. So the record has to live somewhere
 * before a user exists, and that somewhere is a cookie.
 *
 * The cookie is httpOnly and holds only the seven fields. It is not signed,
 * because the only thing tampering with it achieves is showing yourself a
 * different ledger — there is no privilege attached to it and nothing else
 * reads it. Anything with real consequences hangs off the Supabase session.
 */

const RECORD_COOKIE = "polaris.record";
const RUN_COOKIE = "polaris.run";
const SIX_MONTHS = 60 * 60 * 24 * 180;

function encode(record: StudentRecord): string {
  return Buffer.from(JSON.stringify(record), "utf8").toString("base64url");
}

function decode(raw: string): StudentRecord | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    // Shape check rather than trust — a stale cookie from an older release
    // should degrade to "no record", not throw on a render.
    if (
      typeof parsed?.cgpa === "number" &&
      typeof parsed?.activeBacklogs === "number" &&
      typeof parsed?.tenthPct === "number" &&
      typeof parsed?.twelfthPct === "number" &&
      typeof parsed?.branch === "string" &&
      typeof parsed?.gradYear === "number"
    ) {
      return parsed as StudentRecord;
    }
    return null;
  } catch {
    return null;
  }
}

export async function readAnonRecord(): Promise<StudentRecord | null> {
  const jar = await cookies();
  const raw = jar.get(RECORD_COOKIE)?.value;
  return raw ? decode(raw) : null;
}

export async function writeAnonRecord(record: StudentRecord): Promise<void> {
  const jar = await cookies();
  jar.set(RECORD_COOKIE, encode(record), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIX_MONTHS,
  });
}

export async function readRunSlug(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(RUN_COOKIE)?.value ?? null;
}

export async function writeRunSlug(slug: string): Promise<void> {
  const jar = await cookies();
  jar.set(RUN_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIX_MONTHS,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(RECORD_COOKIE);
  jar.delete(RUN_COOKIE);
}

/** URL-safe, unguessable, and short enough to read aloud. */
export function newSlug(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
