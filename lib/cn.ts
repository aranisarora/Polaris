/**
 * Tiny clsx-style class combiner. No dependency — written by hand.
 * Accepts strings, numbers, nullish/false values, arrays and
 * `{ class: condition }` records, and joins the truthy results.
 */

export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]): string {
  let out = "";
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string" || typeof input === "number") {
      out += (out ? " " : "") + input;
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) out += (out ? " " : "") + inner;
    } else if (typeof input === "object") {
      for (const key of Object.keys(input)) {
        if (input[key]) out += (out ? " " : "") + key;
      }
    }
  }
  return out;
}
