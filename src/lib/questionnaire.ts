"use server";

import { QuestionnaireQuestionType } from "@prisma/client";
import sanitizeHtml from "sanitize-html";

type NumberScaleOptions = {
  min: number;
  max: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
};

export type QuestionnaireOptions = string[] | NumberScaleOptions | null;

type QuestionRecord = {
  type: QuestionnaireQuestionType;
  isRequired: boolean;
  options: QuestionnaireOptions;
};

type OptionValidationResult =
  | { ok: true; value: QuestionnaireOptions }
  | { ok: false; message: string };

export async function normalizeQuestionOptions(
  type: QuestionnaireQuestionType,
  options: unknown,
): Promise<OptionValidationResult> {
  if (type === "NUMBER_SCALE") {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      return {
        ok: false,
        message: "Number scale questions require min/max options.",
      };
    }
    const raw = options as Record<string, unknown>;
    const min = Number(raw.min);
    const max = Number(raw.max);
    const step = raw.step !== undefined ? Number(raw.step) : 1;

    if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(step)) {
      return {
        ok: false,
        message: "Number scale options must include numeric min/max values.",
      };
    }
    if (min >= max) {
      return {
        ok: false,
        message: "Number scale min must be less than max.",
      };
    }
    if (step <= 0) {
      return {
        ok: false,
        message: "Number scale step must be greater than zero.",
      };
    }
    return {
      ok: true,
      value: {
        min,
        max,
        step,
        minLabel: raw.minLabel ? String(raw.minLabel) : undefined,
        maxLabel: raw.maxLabel ? String(raw.maxLabel) : undefined,
      },
    };
  }

  if (type === "DROPDOWN" || type === "RADIO_7" || type === "CHECKBOXES") {
    if (!Array.isArray(options)) {
      return {
        ok: false,
        message: "Select questions must provide an array of options.",
      };
    }
    const normalized = options
      .map((item) => String(item).trim())
      .filter(Boolean);
    if (normalized.length === 0) {
      return {
        ok: false,
        message: "Select questions must include at least one option.",
      };
    }
    if (type === "RADIO_7" && normalized.length !== 7) {
      return {
        ok: false,
        message: "Radio 7 questions must have exactly 7 options.",
      };
    }
    return { ok: true, value: normalized };
  }

  if (options !== undefined && options !== null) {
    return {
      ok: false,
      message: "This question type does not support options.",
    };
  }

  return { ok: true, value: null };
}

type AnswerValidationResult =
  | { ok: true; value: unknown; richText?: string | null }
  | { ok: false; message: string };

function stripHtml(value: string) {
  // Use a robust HTML sanitizer to strip all tags while keeping text content.
  const sanitized = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return sanitized.trim();
}

export async function validateAnswerForQuestion(
  question: QuestionRecord,
  answer: { value: unknown; richText?: string | null },
): Promise<AnswerValidationResult> {
  const { type, isRequired, options } = question;
  const value = answer.value;

  if (type === "TEXT" || type === "TEXTAREA") {
    const textValue = typeof value === "string" ? value.trim() : "";
    if (isRequired && !textValue) {
      return { ok: false, message: "This field is required." };
    }
    return { ok: true, value: textValue };
  }

  if (type === "RICH_TEXT") {
    const richText =
      typeof answer.richText === "string"
        ? answer.richText
        : typeof value === "string"
          ? value
          : "";
    const plainText = stripHtml(richText);
    if (isRequired && !plainText) {
      return { ok: false, message: "This field is required." };
    }
    return { ok: true, value: richText, richText };
  }

  if (type === "NUMBER_SCALE") {
    const scaleOptions = options as NumberScaleOptions | null;
    const numericValue = value === "" || value === null ? NaN : Number(value);
    if (Number.isNaN(numericValue)) {
      return isRequired
        ? { ok: false, message: "A numeric answer is required." }
        : { ok: true, value: null };
    }
    if (!scaleOptions) {
      return { ok: false, message: "Scale options are not configured." };
    }
    if (numericValue < scaleOptions.min || numericValue > scaleOptions.max) {
      return {
        ok: false,
        message: "Answer must be within the configured range.",
      };
    }
    return { ok: true, value: numericValue };
  }

  if (type === "CHECKBOXES") {
    const optionsArray = Array.isArray(options) ? options : [];
    const values = Array.isArray(value)
      ? value.map((item) => String(item))
      : [];
    const filtered = values.filter((item) => optionsArray.includes(item));
    if (isRequired && filtered.length === 0) {
      return { ok: false, message: "Select at least one option." };
    }
    return { ok: true, value: filtered };
  }

  if (type === "DROPDOWN" || type === "RADIO_7") {
    const optionsArray = Array.isArray(options) ? options : [];
    const selected = typeof value === "string" ? value : "";
    if (isRequired && !selected) {
      return { ok: false, message: "Please select an option." };
    }
    if (selected && !optionsArray.includes(selected)) {
      return { ok: false, message: "Selected option is invalid." };
    }
    return { ok: true, value: selected || null };
  }

  return { ok: false, message: "Unsupported question type." };
}
