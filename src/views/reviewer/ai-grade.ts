import type LearnKitPlugin from "../../main";
import type { CardRecord } from "../../platform/core/store";
import type { Rating } from "./types";
import { gradeSaqAnswer } from "../../platform/integrations/ai/exam-generator-ai";
import { buildQuestionFor, buildAnswerOrOptionsFor } from "./fields";

export type AiGradeResult = {
  scorePercent: number;
  feedback: string;
  met: string[];
  missed: string[];
  wrong: string[];
  suggested: Rating;
};
export type AiGradeState = "loading" | AiGradeResult | { error: string };

export function isAiResult(s: AiGradeState | undefined): s is AiGradeResult {
  return !!s && typeof s === "object" && "suggested" in s;
}

export function scoreToRating(score: number, four: boolean): Rating {
  if (!four) return score >= 60 ? "good" : "again";
  if (score >= 90) return "easy";
  if (score >= 70) return "good";
  if (score >= 45) return "hard";
  return "again";
}

export function supportsAiGrade(card: CardRecord): boolean {
  return ["basic", "reversed", "reversed-child", "combo-child"].includes(String(card.type));
}

export async function gradeAnswerWithAi(
  plugin: LearnKitPlugin, card: CardRecord, typed: string, four: boolean,
): Promise<AiGradeResult> {
  const question = card.type === "combo-child" ? (card.q || "") : buildQuestionFor(card);
  const expected = card.type === "combo-child" ? (card.a || "") : buildAnswerOrOptionsFor(card);

  const r = await gradeSaqAnswer({
    settings: plugin.settings.studyAssistant,
    questionPrompt: question,
    markingGuide: expected.split(/\n+/).filter(Boolean),
    userAnswer: typed,
    difficulty: "medium",
    appliedScenarios: false,
  });

  return {
    scorePercent: r.scorePercent,
    feedback: r.feedback,
    met: r.keyPointsMet ?? [],
    missed: r.keyPointsMissed ?? [],
    wrong: r.keyPointsWrong ?? [],
    suggested: scoreToRating(r.scorePercent, four),
  };
}