"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Input } from "@/components/ui";

export interface ChipListEditorProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Accessible + visible label of the add button. Default "Add". */
  addLabel?: string;
  help?: string;
  className?: string;
}

/**
 * Editable chip list (skills, links, project tech). Type + Enter or the Add
 * button appends; commas split into several chips; each chip carries a
 * 44px-tall remove control.
 */
export function ChipListEditor({
  id,
  label,
  values,
  onChange,
  placeholder,
  addLabel = "Add",
  help,
  className,
}: ChipListEditorProps) {
  const [draft, setDraft] = React.useState("");

  function add() {
    const incoming = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const existing = new Set(values.map((v) => v.toLowerCase()));
    const next = [...values];
    for (const item of incoming) {
      if (!existing.has(item.toLowerCase())) {
        existing.add(item.toLowerCase());
        next.push(item);
      }
    }
    onChange(next);
    setDraft("");
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="mb-1.5 text-sm font-medium text-starlight">
        {label}
      </label>

      {values.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-2" aria-label={label}>
          {values.map((value, i) => (
            <li
              key={`${value}-${i}`}
              className="flex min-h-11 items-center rounded-full border bg-night py-1 pl-4 text-sm text-starlight"
            >
              <span className="max-w-56 truncate">{value}</span>
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => remove(i)}
                className="ml-0.5 flex h-11 w-11 items-center justify-center rounded-full text-moonlight transition-colors duration-150 hover:text-starlight"
              >
                <X size={14} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={add}>
          {addLabel}
        </Button>
      </div>
      {help && <p className="mt-1.5 text-sm text-moonlight">{help}</p>}
    </div>
  );
}
