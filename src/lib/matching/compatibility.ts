import { Questionnaire } from "@prisma/client";

type Question = Pick<
  Questionnaire,
  | "religionImportance"
  | "familyImportance"
  | "careerAmbition"
  | "introvertExtrovert"
  | "spontaneityPlanning"
  | "politicalAlignment"
  | "relationshipGoal"
  | "wantsChildren"
>;

function numericSimilarity(a: number, b: number, maxDelta: number) {
  const diff = Math.abs(a - b);
  return Math.max(0, 1 - diff / maxDelta);
}

export function calculateCompatibility(
  primary?: Partial<Question>,
  secondary?: Partial<Question>,
) {
  if (!primary || !secondary) {
    return 50;
  }

  const scores: number[] = [];

  if (primary.religionImportance && secondary.religionImportance) {
    scores.push(
      numericSimilarity(primary.religionImportance, secondary.religionImportance, 4),
    );
  }

  if (primary.familyImportance && secondary.familyImportance) {
    scores.push(
      numericSimilarity(primary.familyImportance, secondary.familyImportance, 4),
    );
  }

  if (primary.careerAmbition && secondary.careerAmbition) {
    scores.push(
      numericSimilarity(primary.careerAmbition, secondary.careerAmbition, 4),
    );
  }

  if (primary.introvertExtrovert && secondary.introvertExtrovert) {
    scores.push(
      numericSimilarity(primary.introvertExtrovert, secondary.introvertExtrovert, 9),
    );
  }

  if (primary.spontaneityPlanning && secondary.spontaneityPlanning) {
    scores.push(
      numericSimilarity(primary.spontaneityPlanning, secondary.spontaneityPlanning, 9),
    );
  }

  if (primary.politicalAlignment && secondary.politicalAlignment) {
    scores.push(primary.politicalAlignment === secondary.politicalAlignment ? 1 : 0.6);
  }

  if (primary.relationshipGoal && secondary.relationshipGoal) {
    scores.push(primary.relationshipGoal === secondary.relationshipGoal ? 1 : 0.6);
  }

  if (primary.wantsChildren && secondary.wantsChildren) {
    scores.push(primary.wantsChildren === secondary.wantsChildren ? 1 : 0.5);
  }

  if (!scores.length) {
    return 50;
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 100);
}
