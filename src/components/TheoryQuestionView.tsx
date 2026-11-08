import React from "react";
import { Lightbulb, Sparkles, CheckCircle2 } from "lucide-react";
import type { TheoryQuestion, TheoryPart } from "@/data/catalog";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import {
  getTheoryPartDepth,
  getTheoryIndentClass,
  normalizeTheoryQuestion,
} from "@/lib/theory-hierarchy";
import { cn } from "@/lib/cn";

export interface TheoryQuestionViewProps {
  question: TheoryQuestion;
  index?: number;
  showAnswers?: boolean;
  studentAnswer?: string;
  onStudentAnswerChange?: (val: string) => void;
  className?: string;
}

export function TheoryQuestionView({
  question,
  index,
  showAnswers = true,
  studentAnswer,
  onStudentAnswerChange,
  className,
}: TheoryQuestionViewProps) {
  const normalized = normalizeTheoryQuestion(question);
  const parts = normalized.parts || [];
  const diagramSvg = normalized.diagramSvg;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Intro text or Stem if present */}
      {normalized.introText && normalized.introText !== parts[0]?.questionText && (
        <div className="font-serif text-base sm:text-lg text-ink font-medium leading-relaxed">
          <InlineMathText text={normalized.introText} />
        </div>
      )}

      {/* Diagram container - Clean, minimalist SVG recreation */}
      {diagramSvg && (
        <div className="space-y-1.5 my-3">
          <div
            className="diagram-container bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex justify-center items-center overflow-x-auto min-h-[140px]"
            dangerouslySetInnerHTML={{ __html: diagramSvg }}
          />
          {normalized.diagramCaption && (
            <p className="text-center text-xs text-muted font-sans italic">
              Figure: {normalized.diagramCaption}
            </p>
          )}
        </div>
      )}

      {/* Hierarchical questions & subparts */}
      <div className="space-y-4">
        {parts.map((part, pIdx) => {
          const depth = getTheoryPartDepth(part.label);
          const indentClass = getTheoryIndentClass(depth);

          return (
            <div
              key={pIdx}
              className={cn("transition-all space-y-2.5", indentClass)}
            >
              {/* Question line */}
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "shrink-0 font-serif",
                    depth === 0
                      ? "text-base sm:text-lg font-bold text-ink"
                      : depth === 1
                      ? "text-sm sm:text-base font-semibold text-ink"
                      : "text-sm font-medium text-ink"
                  )}
                >
                  {part.label}
                </span>

                <div className="flex-1">
                  <div
                    className={cn(
                      "font-sans leading-relaxed text-ink",
                      depth === 0
                        ? "text-base font-bold"
                        : depth === 1
                        ? "text-sm font-semibold"
                        : "text-sm font-normal"
                    )}
                  >
                    <InlineMathText text={part.questionText} />
                    {part.marks && (
                      <span className="ml-2 inline-block text-xs font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded-md align-middle">
                        {part.marks}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Solved Answers Section (when visible) */}
              {showAnswers && (part.directAnswer || part.tutorExplanation) && (
                <div className="space-y-2 mt-2 pt-1">
                  {/* Direct Answer: clean styled block with subtle green border-left */}
                  {part.directAnswer && (
                    <div className="border-l-4 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 rounded-r-xl shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Model Solution / Direct Answer:</span>
                      </div>
                      <div className="font-mono text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap pl-0.5">
                        <InlineMathText text={part.directAnswer} />
                      </div>
                    </div>
                  )}

                  {/* Tutor Explanation: muted box with lightbulb icon */}
                  {part.tutorExplanation && (
                    <div className="rounded-xl bg-[#F7F5F0] border border-[#E5E0D8] p-3 flex items-start gap-2.5 text-xs leading-relaxed text-ink shadow-2xs">
                      <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-ink block text-[11px] uppercase tracking-wide">
                          Tutor Explanation & Marking Guidance:
                        </span>
                        <div className="text-muted-fg font-sans leading-relaxed">
                          <InlineMathText text={part.tutorExplanation} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Student written answer input (if student mode) */}
      {onStudentAnswerChange && (
        <div className="pt-2">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Your Written Response / Working:
          </label>
          <textarea
            value={studentAnswer ?? ""}
            onChange={(e) => onStudentAnswerChange(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-sm font-sans text-ink outline-none focus:border-primary shadow-2xs"
            placeholder="Type your step-by-step working and final answer..."
          />
        </div>
      )}
    </div>
  );
}
