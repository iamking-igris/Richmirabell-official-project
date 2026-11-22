import type { AiOcrSettings } from "@/types/ai-settings";

const STORAGE_KEY = "richmirabel-ai-ocr-settings";

const DEFAULTS: AiOcrSettings = {
  model: "gemini-2.5-flash",
  temperatureOcr: 0.0,
  temperatureReview: 0.2,
  temperatureTheory: 0.1,
  temperatureCbt: 0.8,
  ocrQuality: "standard",
  formulaDetection: true,
  latexOutput: "katex",
};

function loadDefaults(): AiOcrSettings {
  return { ...DEFAULTS };
}

function loadFromStorage(): AiOcrSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AiOcrSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return null;
  }
}

function saveToStorage(settings: AiOcrSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silently ignore storage quota errors; settings still work in-memory.
  }
}

export type AiOcrSettingsUpdate = Partial<AiOcrSettings>;

export class AiOcrSettingsService {
  private settings: AiOcrSettings;

  constructor() {
    this.settings = loadFromStorage() ?? loadDefaults();
  }

  getSettings(): AiOcrSettings {
    return { ...this.settings };
  }

  updateSettings(updates: AiOcrSettingsUpdate): AiOcrSettings {
    this.settings = { ...this.settings, ...updates };
    saveToStorage(this.settings);
    return this.getSettings();
  }

  resetToDefaults(): AiOcrSettings {
    this.settings = loadDefaults();
    saveToStorage(this.settings);
    return this.getSettings();
  }

  isDefault(key: keyof AiOcrSettings): boolean {
    return this.settings[key] === DEFAULTS[key];
  }
}

export const aiOcrSettings = new AiOcrSettingsService();
