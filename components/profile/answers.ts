import type { QuestionnaireAnswers } from "@/lib/types";

/**
 * The questionnaire as the profile surface collects it: the shared
 * `QuestionnaireAnswers` contract plus the person's name.
 *
 * The CV path always carries a name (`CVData.basics.name`, required by
 * CVConfirm). The questionnaire path never asked for one, so a
 * questionnaire-only user's living CV rendered without a headline and their
 * export was titled just "CV". The name is optional-but-encouraged: blank is
 * valid everywhere downstream and never blocks a save.
 */
export interface QuestionnaireDraft extends QuestionnaireAnswers {
  name?: string;
}

/** Longest name we store — a display line, not a document. */
export const NAME_MAX = 120;

/**
 * True when the draft holds at least one real answer. The name is deliberately
 * excluded: a name on its own is not a position to chart from, so it must not
 * unlock a save that would otherwise be empty.
 */
export function hasRealAnswer(draft: QuestionnaireDraft): boolean {
  return Object.entries(draft).some(
    ([key, value]) =>
      key !== "name" && typeof value === "string" && value.trim().length > 0,
  );
}
