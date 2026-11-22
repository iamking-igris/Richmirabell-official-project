import { cn } from "@/lib/cn";

/**
 * Shared Gemini OCR processing screen.
 *
 * Extracted verbatim from the approved Notes & Lessons implementation
 * (src/routes/admin/topics.$id.tsx) so every workflow presents exactly the
 * same processing experience. Only the stage text is passed in per
 * workflow — never show fabricated percentages here.
 */
export function OcrProcessingScreen({
  title,
  description,
  progress,
  className,
}: {
  title: string;
  description?: string;
  /** Real completed/total counts (e.g. pages processed). Rendered as plain text only. */
  progress?: string;
  className?: string;
}) {
  return (
    <div className={cn("py-6", className)}>
      {/* Custom Slick Concentric Spinner (Notes & Lessons markup) */}
      <div className="relative size-16 mx-auto mb-5">
        <div className="absolute inset-0 rounded-full border-4 border-[#1A4D2E]/15" />
        <div className="absolute inset-0 rounded-full border-4 border-[#1A4D2E] border-t-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-[#1A4D2E]/35 border-b-transparent animate-spin [animation-direction:reverse] [animation-duration:1.4s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="size-2 rounded-full bg-[#1A4D2E] animate-pulse" />
        </div>
      </div>

      <h3 className="font-serif text-2xl sm:text-3xl text-[#1A4D2E] font-medium tracking-tight">{title}</h3>
      {description && (
        <p className="font-sans text-sm text-[#6B6B6B] mt-2 max-w-md mx-auto leading-relaxed">{description}</p>
      )}
      {progress && (
        <p className="font-sans text-xs text-[#8C827A] mt-3 font-semibold uppercase tracking-wider">{progress}</p>
      )}
    </div>
  );
}
