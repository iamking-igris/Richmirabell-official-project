import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { useNoteStore } from '@/lib/useNoteStore';
import type { NoteBlock } from '@/lib/note-schema';

/**
 * Clean helper function to sanitize and format LaTeX strings before KaTeX rendering.
 */
function cleanLatex(mathStr: string): string {
  if (!mathStr) return '';
  let cleaned = mathStr.trim();
  // Strip code block wrappers if any
  cleaned = cleaned.replace(/^```(?:latex|tex)?\s*/i, '').replace(/\s*```$/, '');
  // Strip outer delimiters if present: \(...\), \[...\], $...$
  if ((cleaned.startsWith('\\(') && cleaned.endsWith('\\)')) || (cleaned.startsWith('\\[') && cleaned.endsWith('\\]'))) {
    cleaned = cleaned.slice(2, -2).trim();
  } else if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/**
 * Renders text containing inline KaTeX math formulas (e.g. \mu, F_{12}, \frac{a}{b}, \(...\), $...$).
 */
export function InlineMathText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;

  // Pattern matches:
  // 1. Explicit math delimiters: \(...\), \[...\], $...$
  // 2. Common LaTeX macros & math tokens: \frac{...}{...}, \sqrt{...}, \mu, \alpha, \beta, \theta, \pi, \sigma, \lambda, \Delta, \vec{...}, \times, \cdot, \pm, \int, \partial
  // 3. Subscripts & superscripts: F_{12}, v_0, E_k, x^2, 10^5, m_1
  const mathRegex = /(\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?:\$[^$\n]+\$)|(?:\\(?:frac|sqrt|mu|alpha|beta|gamma|delta|theta|pi|sigma|lambda|rho|omega|epsilon|phi|vec|bar|text|cdot|times|pm|int|partial|sum|prod|infty|deg|degree|Omega|approx|neq|leq|geq)\b(?:\{[^{}]*\}|_[a-zA-Z0-9{}]*|\^[a-zA-Z0-9{}]*)*)|(?:\b[a-zA-Z](?:_[a-zA-Z0-9{}]|\^[a-zA-Z0-9{}]|\_{[a-zA-Z0-9\+\-=]+}|\^{[a-zA-Z0-9\+\-=]+})+))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const rawMath = match[0];
    const mathContent = cleanLatex(rawMath);

    parts.push(
      <span key={match.index} className="inline-block px-0.5 align-baseline">
        <InlineMath
          math={mathContent}
          renderError={() => <code className="font-mono text-xs text-[#1A4D2E] bg-[#1A4D2E]/10 px-1 rounded">{rawMath}</code>}
        />
      </span>
    );
    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

/**
 * Renders paragraph blocks, intelligently splitting definition lists (e.g. "u = initial velocity v = final velocity")
 * or newline-separated variable lists into structured cards/lists while rendering inline KaTeX for all math expressions.
 */
export function ParagraphContentRenderer({ text }: { text: string }) {
  if (!text) return null;

  const trimmed = text.trim();

  // 1. Check if the paragraph contains newline-separated items or bullet lists
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length > 1) {
    const isListOrDefs = lines.every(
      (line) =>
        /^[-*•]\s+/.test(line) ||
        /^\d+[\.\)]\s+/.test(line) ||
        /^[a-zA-Z0-9_\{\}\\\mu\alpha\beta\theta\pi\lambda\rho\sigma\delta\Delta\s\(\)]+\s*[:=]\s*.+/.test(line) ||
        /^where:?/i.test(line)
    );

    if (isListOrDefs) {
      return (
        <div className="space-y-2.5 my-3">
          {lines.map((line, idx) => {
            const cleanLine = line.replace(/^[-*•\d\.\)]\s+/, '');
            const match = cleanLine.match(/^([a-zA-Z0-9_\{\}\\\mu\alpha\beta\theta\pi\lambda\rho\sigma\delta\Delta\s\(\)]+)\s*[:=]\s*(.+)$/);
            if (match) {
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-[#F4F8F5] px-4 py-2.5 rounded-xl border border-[#1A4D2E]/20 text-sm shadow-2xs"
                >
                  <span className="font-mono font-bold text-[#1A4D2E] shrink-0 bg-white border border-[#1A4D2E]/25 px-2.5 py-0.5 rounded-lg shadow-2xs">
                    <InlineMathText text={match[1].trim()} />
                  </span>
                  <span className="text-[#2A2422] font-sans">
                    = <InlineMathText text={match[2].trim()} />
                  </span>
                </div>
              );
            }
            return (
              <div key={idx} className="flex items-start gap-2.5 text-base text-[#3A3533] font-sans leading-relaxed">
                <span className="inline-flex size-2 rounded-full bg-[#1A4D2E] mt-2.5 shrink-0" />
                <span>
                  <InlineMathText text={line} />
                </span>
              </div>
            );
          })}
        </div>
      );
    }
  }

  // 2. Check for single-line run-on definition patterns (e.g., "u = initial velocity v = final velocity a = acceleration")
  const defPattern = /([a-zA-Z0-9_\{\}\\\mu\alpha\beta\theta\pi\lambda\rho\sigma\delta\Delta]+(?:\s*\([a-zA-Z0-9\s,]+\))?)\s*[:=]\s*([^:=]+?)(?=(?:\s+[a-zA-Z0-9_\{\}\\\mu\alpha\beta\theta\pi\lambda\rho\sigma\delta\Delta]+(?:\s*\([a-zA-Z0-9\s,]+\))?\s*[:=])|$)/g;
  const defMatches = Array.from(trimmed.matchAll(defPattern));

  if (defMatches.length >= 2 && !trimmed.includes('\n')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
        {defMatches.map((m, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2.5 bg-[#F4F8F5] px-3.5 py-2.5 rounded-xl border border-[#1A4D2E]/20 text-sm shadow-2xs"
          >
            <span className="font-mono font-semibold text-[#1A4D2E] shrink-0 bg-white border border-[#1A4D2E]/25 px-2.5 py-0.5 rounded-lg shadow-2xs">
              <InlineMathText text={m[1].trim()} />
            </span>
            <span className="text-[#2A2422] text-xs sm:text-sm font-sans">
              = <InlineMathText text={m[2].trim()} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  // 3. Default: standard paragraph text with inline KaTeX rendering
  return (
    <p className="font-sans text-base sm:text-[17px] text-[#3A3533] leading-[1.65] max-w-[70ch] whitespace-pre-line">
      <InlineMathText text={trimmed} />
    </p>
  );
}

interface NotePreviewRendererProps {
  className?: string;
  readOnly?: boolean;
}

export function NotePreviewRenderer({ className = '', readOnly = false }: NotePreviewRendererProps) {
  const doc = useNoteStore((s) => s.doc);
  const updateMeta = useNoteStore((s) => s.updateMeta);
  const updateBlock = useNoteStore((s) => s.updateBlock);
  const removeBlock = useNoteStore((s) => s.removeBlock);
  const moveBlock = useNoteStore((s) => s.moveBlock);
  const addBlock = useNoteStore((s) => s.addBlock);
  const reorderBlocks = useNoteStore((s) => s.reorderBlocks);

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderBlocks(String(active.id), String(over.id));
    }
  }

  return (
    <div className={`w-full max-w-3xl mx-auto bg-[#FDFBF7] text-[#2A2422] p-6 sm:p-12 transition-all ${className}`}>
      {/* 1. Header */}
      {readOnly ? (
        <header className="mb-10 border-b border-[#E5E0D8] pb-8 space-y-3">
          {doc.subject && (
            <p className="font-sans text-sm font-medium text-[#1A4D2E]">{doc.subject}</p>
          )}
          {doc.topic && (
            <p className="font-sans text-xs font-bold uppercase tracking-wider text-[#1A4D2E]">{doc.topic}</p>
          )}
          <h1 className="font-serif text-4xl sm:text-5xl text-[#2A2422] tracking-tight leading-tight">
            {doc.title || 'Untitled Note'}
          </h1>
          {doc.subtitle && (
            <p className="font-sans text-base sm:text-lg text-[#6B6B6B] leading-relaxed">{doc.subtitle}</p>
          )}
          {doc.meta && (
            <p className="font-sans text-xs sm:text-sm text-[#8C827A]">{doc.meta}</p>
          )}
        </header>
      ) : (
        <header className="mb-10 border-b border-[#E5E0D8] pb-8 space-y-3">
          {/* Subject */}
          <div>
            <input
              type="text"
              value={doc.subject}
              onChange={(e) => updateMeta('subject', e.target.value)}
              placeholder="Subject (e.g. Physics)"
              className="w-full bg-transparent outline-none border-none p-0 text-sm font-sans font-medium text-[#1A4D2E] placeholder:text-[#1A4D2E]/40"
            />
          </div>

          {/* Topic - uppercase, bold, letter-spacing */}
          <div>
            <input
              type="text"
              value={doc.topic}
              onChange={(e) => updateMeta('topic', e.target.value.toUpperCase())}
              placeholder="TOPIC CODE"
              className="w-full bg-transparent outline-none border-none p-0 text-xs font-sans font-bold uppercase tracking-wider text-[#1A4D2E] placeholder:text-[#1A4D2E]/40"
            />
          </div>

          {/* Title - Fraunces serif font */}
          <div>
            <input
              type="text"
              value={doc.title}
              onChange={(e) => updateMeta('title', e.target.value)}
              placeholder="Lesson Title"
              className="w-full bg-transparent outline-none border-none p-0 text-4xl sm:text-5xl font-serif text-[#2A2422] tracking-tight placeholder:text-[#2A2422]/30 leading-tight"
            />
          </div>

          {/* Subtitle - Standard Outfit text */}
          <div>
            <AutoResizeTextarea
              value={doc.subtitle}
              onChange={(val) => updateMeta('subtitle', val)}
              placeholder="Add a one-line summary..."
              className="w-full bg-transparent outline-none border-none p-0 text-base sm:text-lg font-sans text-[#6B6B6B] placeholder:text-[#6B6B6B]/40 leading-relaxed"
            />
          </div>

          {/* Meta - Small, muted, sans-serif text */}
          <div>
            <input
              type="text"
              value={doc.meta}
              onChange={(e) => updateMeta('meta', e.target.value)}
              placeholder="20 min · 4 questions · 2 theory"
              className="w-full bg-transparent outline-none border-none p-0 text-xs sm:text-sm font-sans text-[#8C827A] placeholder:text-[#8C827A]/40"
            />
          </div>
        </header>
      )}

      {/* 2. Block List */}
      {readOnly ? (
        <div className="space-y-6">
          {doc.blocks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E5E0D8] bg-[#F7F4EE]/50 p-10 text-center text-[#6B6B6B]">
              <p className="font-serif text-lg text-[#2A2422]">This note is currently blank.</p>
              <p className="font-sans text-xs text-[#8C827A] mt-1">
                Content will appear here once blocks are added in Note Studio or extracted from source files.
              </p>
            </div>
          ) : (
            doc.blocks.map((block) => (
              <ReadOnlyBlockContent key={block.id} block={block} />
            ))
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={doc.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {doc.blocks.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-[#E5E0D8] bg-[#F7F4EE]/50 p-8 sm:p-12 text-center">
                  <div className="mx-auto size-12 rounded-2xl bg-[#1A4D2E]/10 text-[#1A4D2E] flex items-center justify-center mb-3.5">
                    <svg className="size-6 text-[#1A4D2E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#2A2422] font-medium">
                    This note is currently blank
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#6B6B6B] mt-1.5 max-w-md mx-auto">
                    No mockup data added. Start building your lesson with blocks below or upload source materials in the Source tab.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => addBlock('objectives', 0)}
                      className="px-3.5 py-2 rounded-xl border border-[#1A4D2E]/30 bg-[#1A4D2E]/10 text-[#1A4D2E] font-sans text-xs font-semibold hover:bg-[#1A4D2E]/15 shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <span className="font-bold text-sm">+</span> Objectives
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('heading')}
                      className="px-3.5 py-2 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <span className="text-[#1A4D2E] font-bold text-sm">+</span> Heading
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('paragraph')}
                      className="px-3.5 py-2 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <span className="text-[#1A4D2E] font-bold text-sm">+</span> Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('formula')}
                      className="px-3.5 py-2 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <span className="text-[#1A4D2E] font-bold text-sm">+</span> Formula
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('diagram')}
                      className="px-3.5 py-2 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <span className="text-[#1A4D2E] font-bold text-sm">+</span> Diagram
                    </button>
                  </div>
                </div>
              ) : (
                doc.blocks.map((block, index) => (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    index={index}
                    total={doc.blocks.length}
                    onUpdate={(updates) => updateBlock(block.id, updates)}
                    onRemove={() => removeBlock(block.id)}
                    onMove={(dir) => moveBlock(block.id, dir)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* 3. Notion-Style Inline Block Adder Bar (Only in Editable Note Mode) */}
      {!readOnly && (
        <div className="mt-10 pt-6 border-t border-[#E5E0D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FDFBF7] p-3 rounded-2xl border border-[#E5E0D8]">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#8C827A] px-1">
              + Add Content Block
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addBlock('objectives', 0)}
                className="px-3 py-1.5 rounded-xl border border-[#1A4D2E]/30 bg-[#1A4D2E]/10 text-[#1A4D2E] font-sans text-xs font-semibold hover:bg-[#1A4D2E]/15 shadow-2xs transition-all flex items-center gap-1.5"
                title="Add Learning Objectives block"
              >
                <span className="font-bold text-sm">+</span> Objectives
              </button>
              <button
                type="button"
                onClick={() => addBlock('heading')}
                className="px-3 py-1.5 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
              >
                <span className="text-[#1A4D2E] font-bold text-sm">+</span> Heading
              </button>
              <button
                type="button"
                onClick={() => addBlock('paragraph')}
                className="px-3 py-1.5 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
              >
                <span className="text-[#1A4D2E] font-bold text-sm">+</span> Paragraph
              </button>
              <button
                type="button"
                onClick={() => addBlock('formula')}
                className="px-3 py-1.5 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
              >
                <span className="text-[#1A4D2E] font-bold text-sm">+</span> Formula
              </button>
              <button
                type="button"
                onClick={() => addBlock('diagram')}
                className="px-3 py-1.5 rounded-xl border border-[#E5E0D8] bg-white text-[#2A2422] font-sans text-xs font-semibold hover:border-[#1A4D2E] hover:text-[#1A4D2E] shadow-2xs transition-all flex items-center gap-1.5"
              >
                <span className="text-[#1A4D2E] font-bold text-sm">+</span> Diagram
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Read-Only Renderer Component (Clean Typography, No Inputs, No Drag Handles)
function ReadOnlyBlockContent({ block }: { block: NoteBlock }) {
  switch (block.type) {
    case 'objectives':
      return (
        <div className="mb-6 rounded-2xl border border-[#1A4D2E]/25 bg-[#F4F8F5] p-6 sm:p-7 shadow-xs">
          <h3 className="font-serif text-xl sm:text-2xl text-[#1A4D2E] font-medium tracking-tight mb-3.5 flex items-center gap-2.5">
            <span className="inline-flex size-6 rounded-full bg-[#1A4D2E] text-white items-center justify-center shadow-2xs">
              <svg className="size-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Learning Objectives
          </h3>
          <ul className="space-y-2.5">
            {block.items.filter((item) => item.trim()).map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="inline-flex size-5 shrink-0 rounded-full bg-[#1A4D2E]/15 text-[#1A4D2E] items-center justify-center mt-0.5">
                  <svg className="size-3 text-[#1A4D2E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-sans text-base text-[#2A2422] leading-relaxed">
                  <InlineMathText text={item} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'heading':
      return (
        <div className="mb-6">
          <div className="inline-flex flex-col items-start max-w-full">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#2A2422] tracking-tight font-medium">
              <InlineMathText text={block.text} />
            </h2>
            <span className="h-[2.5px] w-10 bg-[#1A4D2E] mt-2 inline-block" aria-hidden="true" />
          </div>
        </div>
      );

    case 'paragraph':
      return (
        <div className="mb-6">
          <ParagraphContentRenderer text={block.text} />
        </div>
      );

    case 'formula':
      return (
        <div className="mb-6 rounded-2xl border border-[#E5DFD7] bg-[#F9F6F0] p-6 sm:p-8 flex justify-center items-center shadow-xs text-center transition-all">
          {block.latex ? (
            <div className="text-[#1A4D2E] text-xl sm:text-2xl tracking-normal max-w-full overflow-x-auto py-1">
              <BlockMath
                math={cleanLatex(block.latex)}
                renderError={() => (
                  <span className="text-red-500 font-sans text-sm">
                    Invalid LaTeX: <code className="font-mono">{block.latex}</code>
                  </span>
                )}
              />
            </div>
          ) : (
            <span className="text-[#8C827A] italic font-sans text-sm">
              Empty formula
            </span>
          )}
        </div>
      );

    case 'diagram':
      return (
        <div className="mb-6 border border-[#E5E0D8] bg-[#FDFBF7] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 flex justify-center">
            {block.imageUrl ? (
              <img
                src={block.imageUrl}
                alt={block.caption || 'Lesson Diagram'}
                className="max-h-64 object-contain rounded-md"
              />
            ) : (
              <div className="py-8 text-center text-[#8C827A] font-sans text-sm italic">
                Diagram
              </div>
            )}
          </div>
          {block.caption && (
            <div className="border-t border-[#E5E0D8] p-3 text-sm font-sans text-[#6B6B6B]">
              <InlineMathText text={block.caption} />
            </div>
          )}
        </div>
      );
  }
}

interface SortableBlockItemProps {
  block: NoteBlock;
  index: number;
  total: number;
  onUpdate: (updates: Partial<NoteBlock>) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}

function SortableBlockItem({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group pl-8 -ml-8 rounded-xl transition-all duration-200 ${
        isDragging
          ? 'z-50 opacity-60 scale-[0.99] shadow-2xl ring-2 ring-[#1A4D2E]'
          : 'hover:shadow-2xs'
      }`}
    >
      {/* Drag handle & Actions on hover (positioned in the left gutter) */}
      <div className="absolute left-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-20 bg-[#FDFBF7] px-1 py-0.5 rounded-lg border border-[#E5E0D8] shadow-xs">
        {/* 6-dot Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="p-1 text-[#8C827A] hover:text-[#2A2422] cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reorder block"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="6" r="1.8" />
            <circle cx="16" cy="6" r="1.8" />
            <circle cx="8" cy="12" r="1.8" />
            <circle cx="16" cy="12" r="1.8" />
            <circle cx="8" cy="18" r="1.8" />
            <circle cx="16" cy="18" r="1.8" />
          </svg>
        </button>

        {/* Up arrow */}
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove('up')}
          aria-label="Move up"
          className="p-1 text-[#8C827A] hover:text-[#1A4D2E] disabled:opacity-20 transition-colors"
          title="Move up"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Down arrow */}
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove('down')}
          aria-label="Move down"
          className="p-1 text-[#8C827A] hover:text-[#1A4D2E] disabled:opacity-20 transition-colors"
          title="Move down"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete block"
          className="p-1 text-[#8C827A] hover:text-red-600 transition-colors"
          title="Delete block"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Block Content Component */}
      <EditableBlockContent block={block} onUpdate={onUpdate} />
    </div>
  );
}

function FormulaBlockEditor({
  block,
  onUpdate,
}: {
  block: { id: string; type: 'formula'; latex: string };
  onUpdate: (updates: Partial<NoteBlock>) => void;
}) {
  const [isEditing, setIsEditing] = useState(!block.latex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="mb-6 rounded-2xl border border-[#E5DFD7] bg-[#F9F6F0] shadow-xs transition-all hover:border-[#1A4D2E]/40 group/formula">
      {/* Top Header / Actions Bar (subtle) */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#E5DFD7]/60 text-xs font-sans text-[#8C827A]">
        <div className="flex items-center gap-1.5 font-medium text-[#1A4D2E]">
          <span className="font-serif italic font-semibold text-sm">f(x)</span>
          <span>Mathematical Formula</span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1A4D2E] bg-white border border-[#E5DFD7] hover:bg-[#F4F1EA] shadow-2xs transition-colors"
        >
          {isEditing ? (
            <>
              <svg className="size-3.5 text-[#1A4D2E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Done</span>
            </>
          ) : (
            <>
              <svg className="size-3 text-[#1A4D2E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Edit Formula</span>
            </>
          )}
        </button>
      </div>

      {/* Rendered Math Area - Clickable to toggle edit */}
      <div
        onClick={() => {
          if (!isEditing) setIsEditing(true);
        }}
        className={`p-6 sm:p-8 flex flex-col justify-center items-center text-center transition-colors ${
          !isEditing ? 'cursor-pointer hover:bg-[#F4F1EA]/60' : ''
        }`}
        title={!isEditing ? 'Click formula to edit LaTeX' : undefined}
      >
        {block.latex ? (
          <div className="text-[#1A4D2E] text-xl sm:text-2xl tracking-normal max-w-full overflow-x-auto py-1">
            <BlockMath
              math={cleanLatex(block.latex)}
              renderError={() => (
                <div className="py-2 px-3 rounded-lg bg-red-50 text-red-600 font-sans text-xs inline-block">
                  Invalid LaTeX: <code className="font-mono">{block.latex}</code>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="py-2 text-[#8C827A] italic font-sans text-sm flex items-center gap-2">
            <span>Empty formula — click to enter LaTeX code</span>
          </div>
        )}

        {!isEditing && (
          <span className="opacity-0 group-hover/formula:opacity-100 transition-opacity text-[11px] font-sans text-[#8C827A] mt-2">
            Click formula to edit LaTeX
          </span>
        )}
      </div>

      {/* Clean LaTeX Input Drawer (Only shown when editing) */}
      {isEditing && (
        <div className="px-5 pb-5 pt-3 border-t border-[#E5DFD7]/80 bg-[#FDFBF7] rounded-b-2xl space-y-3">
          <div>
            <label className="block text-[11px] font-sans font-semibold text-[#8C827A] uppercase tracking-wider mb-1.5">
              LaTeX Code (KaTeX)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={block.latex}
                onChange={(e) => onUpdate({ latex: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditing(false);
                  }
                }}
                placeholder="e.g. v = f \lambda or x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                className="w-full rounded-xl border border-[#E5DFD7] bg-white px-3.5 py-2.5 text-sm font-mono text-[#2A2422] outline-none focus:border-[#1A4D2E] focus:ring-1 focus:ring-[#1A4D2E] transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-xl bg-[#1A4D2E] text-white text-xs font-semibold hover:bg-[#143D24] shadow-xs transition-colors shrink-0"
              >
                Done
              </button>
            </div>
          </div>

          {/* Quick symbol presets / helper chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-sans text-[#8C827A]">Quick presets:</span>
            {[
              { label: 'v = fλ', val: 'v = f \\lambda' },
              { label: 'T = 1/f', val: 'T = \\frac{1}{f}' },
              { label: 'E = mc²', val: 'E = mc^2' },
              { label: 'Fraction', val: '\\frac{a}{b}' },
              { label: 'Square root', val: '\\sqrt{x}' },
              { label: 'Quadratic', val: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
              { label: 'Kinetic Energy', val: 'E_k = \\frac{1}{2}mv^2' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onUpdate({ latex: preset.val })}
                className="px-2.5 py-1 rounded-md border border-[#E5DFD7] bg-white text-[11px] font-sans text-[#6B6B6B] hover:text-[#1A4D2E] hover:border-[#1A4D2E] transition-colors shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableBlockContent({
  block,
  onUpdate,
}: {
  block: NoteBlock;
  onUpdate: (updates: Partial<NoteBlock>) => void;
}) {
  const [editingDiagramUrl, setEditingDiagramUrl] = useState(false);

  switch (block.type) {
    case 'objectives':
      return (
        <div className="mb-6 rounded-2xl border border-[#1A4D2E]/25 bg-[#F4F8F5] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-serif text-xl sm:text-2xl text-[#1A4D2E] font-medium tracking-tight flex items-center gap-2.5">
              <span className="inline-flex size-6 rounded-full bg-[#1A4D2E] text-white items-center justify-center shadow-2xs">
                <svg className="size-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Learning Objectives
            </h3>
            <span className="text-[11px] font-sans text-[#1A4D2E]/70">
              Type items below (new line for each objective)
            </span>
          </div>

          <div className="space-y-2">
            <AutoResizeTextarea
              value={block.items.join('\n')}
              onChange={(val) => onUpdate({ items: val.split('\n') })}
              placeholder="Define core concepts...&#10;Apply key formulas...&#10;Solve exam-level problems..."
              className="w-full bg-transparent outline-none font-sans text-base text-[#2A2422] leading-relaxed border-l-2 border-[#1A4D2E]/40 pl-3.5 focus:border-[#1A4D2E] placeholder:text-[#1A4D2E]/30"
            />
          </div>
        </div>
      );

    case 'heading':
      return (
        <div className="mb-6 group">
          <div className="inline-flex flex-col items-start max-w-full">
            <input
              type="text"
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Heading text..."
              className="bg-transparent outline-none font-serif text-2xl sm:text-3xl text-[#2A2422] tracking-tight font-medium placeholder:text-[#2A2422]/30 w-full"
            />
            {/* 40px short green underline right below heading text */}
            <span className="h-[2.5px] w-10 bg-[#1A4D2E] mt-2 inline-block" aria-hidden="true" />
          </div>
        </div>
      );

    case 'paragraph':
      return (
        <div className="mb-6">
          <AutoResizeTextarea
            value={block.text}
            onChange={(val) => onUpdate({ text: val })}
            placeholder="Write lesson paragraphs here..."
            className="w-full max-w-[70ch] bg-transparent outline-none resize-none font-sans text-base sm:text-[17px] text-[#3A3533] leading-[1.65] placeholder:text-[#8C827A]/40"
          />
        </div>
      );

    case 'formula':
      return <FormulaBlockEditor block={block} onUpdate={onUpdate} />;

    case 'diagram':
      return (
        <div className="mb-6 border border-[#E5E0D8] bg-[#FDFBF7] rounded-xl overflow-hidden shadow-sm">
          {/* Diagram image container */}
          <div className="p-4 flex flex-col items-center justify-center relative group/img">
            {block.imageUrl ? (
              <img
                src={block.imageUrl}
                alt={block.caption || 'Lesson Diagram'}
                className="max-h-64 object-contain rounded-md"
              />
            ) : (
              <div className="py-8 text-center text-[#8C827A]">
                <p className="font-sans text-sm">No image selected</p>
                <button
                  type="button"
                  onClick={() => setEditingDiagramUrl(true)}
                  className="mt-2 text-xs font-semibold text-[#1A4D2E] underline"
                >
                  Enter Image URL
                </button>
              </div>
            )}

            {/* Change URL overlay button on hover */}
            <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setEditingDiagramUrl(!editingDiagramUrl)}
                className="text-[11px] font-sans text-[#2A2422] bg-[#FDFBF7] border border-[#E5E0D8] px-2 py-1 rounded-md shadow-2xs hover:border-[#1A4D2E]"
              >
                {editingDiagramUrl ? 'Close URL' : 'Change Image'}
              </button>
            </div>

            {/* Editable Image URL Drawer */}
            {editingDiagramUrl && (
              <div className="mt-3 w-full max-w-md bg-white border border-[#E5E0D8] rounded-xl p-3 shadow-xs space-y-2">
                <label className="block text-[11px] font-semibold text-[#8C827A] uppercase">
                  Image URL / Asset Path:
                </label>
                <input
                  type="text"
                  value={block.imageUrl}
                  onChange={(e) => onUpdate({ imageUrl: e.target.value })}
                  placeholder="/media/physics.jpg or https://..."
                  className="w-full text-xs font-sans text-[#2A2422] border border-[#E5E0D8] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1A4D2E]"
                />
                <div className="flex flex-wrap gap-1 text-[10px] text-[#8C827A]">
                  <span>Presets:</span>
                  {[
                    { l: 'Physics', u: '/media/physics.jpg' },
                    { l: 'Chemistry', u: '/media/chemistry.jpg' },
                    { l: 'Biology', u: '/media/biology.jpg' },
                    { l: 'Math', u: '/media/mathematics.jpg' },
                  ].map((p) => (
                    <button
                      key={p.l}
                      type="button"
                      onClick={() => onUpdate({ imageUrl: p.u })}
                      className="underline text-[#1A4D2E]"
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Caption with border-t separation */}
          <div className="border-t border-[#E5E0D8] p-3 text-sm font-sans text-[#6B6B6B]">
            <input
              className="w-full bg-transparent outline-none font-sans text-sm text-[#6B6B6B] placeholder:text-[#8C827A]/50"
              value={block.caption}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Add caption..."
            />
          </div>
        </div>
      );
  }
}

function AutoResizeTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={className}
    />
  );
}
