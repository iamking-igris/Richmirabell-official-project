export type OcRQualityMode = "fast" | "standard" | "high";
export type LatexOutputMode = "katex" | "latex";
export type AiOcrTemperatureCategory = "ocr" | "review" | "theory" | "cbt";

export interface AiOcrSettings {
  /** Default Gemini model used by server-side OCR / generation endpoints. */
  model: string;
  /** Temperature for note extraction OCR (0.0 - 1.0). */
  temperatureOcr: number;
  /** Temperature for student attempt review diagnostics (0.0 - 1.0). */
  temperatureReview: number;
  /** Temperature for theory question marking (0.0 - 1.0). */
  temperatureTheory: number;
  /** Temperature for AI CBT question generation (0.0 - 1.0). */
  temperatureCbt: number;
  /** OCR preprocessing quality: fast = smaller image, standard = balanced, high = full resolution. */
  ocrQuality: OcRQualityMode;
  /** Whether formula/LaTeX detection is enabled during OCR extraction. */
  formulaDetection: boolean;
  /** LaTeX rendering output preference. */
  latexOutput: LatexOutputMode;
}

export interface AiOcrStatus {
  configured: boolean;
  model: string;
  provider: string;
  method: string;
  statusText: string;
}
