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

type PointAllocationOptions = {
  items: string[];
  total: number;
};

type RankingOptions = {
  items: string[];
};

type AgeRangeOptions = {
  minAge?: number;
  maxAge?: number;
};

export type TextOptions = {
  validation: "number";
  min?: number;
  max?: number;
};

export type QuestionnaireOptions =
  | string[]
  | NumberScaleOptions
  | AgeRangeOptions
  | PointAllocationOptions
  | RankingOptions
  | TextOptions
  | null;

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

  if (type === "POINT_ALLOCATION") {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      return {
        ok: false,
        message: "Point allocation questions require items and total options.",
      };
    }
    const raw = options as Record<string, unknown>;
    const items = Array.isArray(raw.items)
      ? raw.items.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const total = Number(raw.total);

    if (items.length === 0) {
      return {
        ok: false,
        message: "Point allocation questions must include at least one item.",
      };
    }
    if (Number.isNaN(total) || total <= 0) {
      return {
        ok: false,
        message: "Point allocation total must be a positive number.",
      };
    }
    return { ok: true, value: { items, total } };
  }

  if (type === "RANKING") {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      return {
        ok: false,
        message: "Ranking questions require items options.",
      };
    }
    const raw = options as Record<string, unknown>;
    const items = Array.isArray(raw.items)
      ? raw.items.map((item) => String(item).trim()).filter(Boolean)
      : [];

    if (items.length < 2) {
      return {
        ok: false,
        message: "Ranking questions must include at least two items.",
      };
    }
    return { ok: true, value: { items } };
  }

  if (type === "AGE_RANGE") {
    // AGE_RANGE type stores default min/max age but allows any configuration
    if (options && typeof options === "object" && !Array.isArray(options)) {
      const raw = options as Record<string, unknown>;
      const minAge = raw.minAge !== undefined ? Number(raw.minAge) : 18;
      const maxAge = raw.maxAge !== undefined ? Number(raw.maxAge) : 80;

      if (Number.isNaN(minAge) || Number.isNaN(maxAge)) {
        return {
          ok: false,
          message:
            "Age range options must include numeric minAge/maxAge values.",
        };
      }
      if (minAge >= maxAge) {
        return {
          ok: false,
          message: "Age range minAge must be less than maxAge.",
        };
      }

      return {
        ok: true,
        value: { minAge, maxAge },
      };
    }
    // Default values if no options provided
    return { ok: true, value: { minAge: 18, maxAge: 80 } };
  }

  // TEXT questions may have validation options (e.g., { validation: "number" })
  if (
    type === "TEXT" &&
    options &&
    typeof options === "object" &&
    !Array.isArray(options)
  ) {
    const raw = options as Record<string, unknown>;
    if (raw.validation === "number") {
      const result: TextOptions = { validation: "number" };
      if (raw.min !== undefined) {
        const min = Number(raw.min);
        if (Number.isNaN(min)) {
          return {
            ok: false,
            message: "Text validation min must be a number.",
          };
        }
        result.min = min;
      }
      if (raw.max !== undefined) {
        const max = Number(raw.max);
        if (Number.isNaN(max)) {
          return {
            ok: false,
            message: "Text validation max must be a number.",
          };
        }
        result.max = max;
      }
      if (
        result.min !== undefined &&
        result.max !== undefined &&
        result.min >= result.max
      ) {
        return {
          ok: false,
          message: "Text validation min must be less than max.",
        };
      }
      return { ok: true, value: result };
    }
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

    // Validate numeric TEXT fields
    if (
      type === "TEXT" &&
      textValue &&
      options &&
      typeof options === "object" &&
      !Array.isArray(options) &&
      "validation" in options &&
      (options as TextOptions).validation === "number"
    ) {
      const textOpts = options as TextOptions;
      const numericValue = Number(textValue);
      if (Number.isNaN(numericValue)) {
        return { ok: false, message: "Please enter a valid number." };
      }
      if (textOpts.min !== undefined && numericValue < textOpts.min) {
        return {
          ok: false,
          message: `Value must be at least ${textOpts.min}.`,
        };
      }
      if (textOpts.max !== undefined && numericValue > textOpts.max) {
        return {
          ok: false,
          message: `Value must be at most ${textOpts.max}.`,
        };
      }
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

  if (type === "AGE_RANGE") {
    const ageOptions = options as AgeRangeOptions | null;
    const ageValue =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as { min?: unknown; max?: unknown })
        : {};

    // Convert to numbers to handle string inputs from API calls
    const minAge =
      ageValue.min !== undefined && ageValue.min !== null
        ? Number(ageValue.min)
        : undefined;
    const maxAge =
      ageValue.max !== undefined && ageValue.max !== null
        ? Number(ageValue.max)
        : undefined;

    // Validate numeric conversion
    if (minAge !== undefined && Number.isNaN(minAge)) {
      return { ok: false, message: "Minimum age must be a valid number." };
    }
    if (maxAge !== undefined && Number.isNaN(maxAge)) {
      return { ok: false, message: "Maximum age must be a valid number." };
    }

    if (isRequired) {
      if (minAge === undefined) {
        return { ok: false, message: "Please select a minimum age." };
      }
      if (maxAge === undefined) {
        return { ok: false, message: "Please select a maximum age." };
      }
    }

    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      return {
        ok: false,
        message: "Minimum age cannot be greater than maximum age.",
      };
    }

    // Validate against configured bounds (like NUMBER_SCALE does)
    if (ageOptions) {
      const configuredMin = ageOptions.minAge ?? 18;
      const configuredMax = ageOptions.maxAge ?? 80;

      if (minAge !== undefined && minAge < configuredMin) {
        return {
          ok: false,
          message: `Minimum age must be at least ${configuredMin}.`,
        };
      }
      if (minAge !== undefined && minAge > configuredMax) {
        return {
          ok: false,
          message: `Minimum age must be at most ${configuredMax}.`,
        };
      }
      if (maxAge !== undefined && maxAge < configuredMin) {
        return {
          ok: false,
          message: `Maximum age must be at least ${configuredMin}.`,
        };
      }
      if (maxAge !== undefined && maxAge > configuredMax) {
        return {
          ok: false,
          message: `Maximum age must be at most ${configuredMax}.`,
        };
      }
    }

    return { ok: true, value: { min: minAge, max: maxAge } };
  }

  if (type === "CHECKBOXES") {
    const optionsArray = Array.isArray(options) ? options : [];
    const values = Array.isArray(value)
      ? value.map((item) => String(item))
      : [];
    const filtered = values.filter((item) => optionsArray.includes(item));
    if (isRequired && filtered.length === 0 && !optionsArray.includes("None")) {
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

  if (type === "POINT_ALLOCATION") {
    const pointOptions = options as PointAllocationOptions | null;
    if (!pointOptions) {
      return {
        ok: false,
        message: "Point allocation options are not configured.",
      };
    }
    const allocations =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    // Convert values to numbers and validate
    const normalizedAllocations: Record<string, number> = {};
    for (const [key, val] of Object.entries(allocations)) {
      const numVal = Number(val);
      if (Number.isNaN(numVal)) {
        return { ok: false, message: `Invalid allocation value for ${key}.` };
      }
      if (numVal < 0) {
        return {
          ok: false,
          message: "Point allocations cannot be negative.",
        };
      }
      normalizedAllocations[key] = numVal;
    }

    const total = Object.values(normalizedAllocations).reduce(
      (sum, val) => sum + val,
      0,
    );
    // Always reject over-allocation (even for optional questions)
    if (total > pointOptions.total) {
      return {
        ok: false,
        message: `Points cannot exceed ${pointOptions.total}. Currently: ${total}.`,
      };
    }
    // For required questions, must total exactly the configured amount
    if (isRequired && total !== pointOptions.total) {
      return {
        ok: false,
        message: `Points must total exactly ${pointOptions.total}. Currently: ${total}.`,
      };
    }
    // Validate that all allocated items are valid
    const validItems = new Set(pointOptions.items);
    for (const key of Object.keys(normalizedAllocations)) {
      if (!validItems.has(key)) {
        return { ok: false, message: `Invalid item: ${key}` };
      }
    }
    return { ok: true, value: normalizedAllocations };
  }

  if (type === "RANKING") {
    const rankingOptions = options as RankingOptions | null;
    if (!rankingOptions) {
      return { ok: false, message: "Ranking options are not configured." };
    }
    const rankedItems = Array.isArray(value)
      ? value.map((item) => String(item))
      : [];
    if (isRequired && rankedItems.length !== rankingOptions.items.length) {
      return {
        ok: false,
        message: "All items must be ranked.",
      };
    }
    // Validate that ranked items match the configured items
    const validItems = new Set(rankingOptions.items);
    const rankedSet = new Set(rankedItems);
    if (rankedItems.length !== rankedSet.size) {
      return { ok: false, message: "Each item can only be ranked once." };
    }
    for (const item of rankedItems) {
      if (!validItems.has(item)) {
        return { ok: false, message: `Invalid item: ${item}` };
      }
    }
    return { ok: true, value: rankedItems };
  }

  return { ok: false, message: "Unsupported question type." };
}
