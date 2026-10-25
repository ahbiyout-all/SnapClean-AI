const KEY_STORAGE_NAME = "snapclean_user_gemini_api_key";
export const API_KEY_CHANGE_EVENT = "snapclean_ai_key_changed";

export function getCustomApiKey(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(KEY_STORAGE_NAME) || "";
  }
  return "";
}

export function setCustomApiKey(key: string): void {
  if (typeof window !== "undefined") {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(KEY_STORAGE_NAME, trimmed);
    } else {
      localStorage.removeItem(KEY_STORAGE_NAME);
    }
    window.dispatchEvent(new Event(API_KEY_CHANGE_EVENT));
  }
}

export function removeCustomApiKey(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY_STORAGE_NAME);
    window.dispatchEvent(new Event(API_KEY_CHANGE_EVENT));
  }
}

export function getEffectiveApiKey(): string {
  const customKey = getCustomApiKey();
  if (customKey) return customKey;
  if (typeof window !== "undefined" && (window as any).__userGeminiApiKey) {
    return (window as any).__userGeminiApiKey;
  }
  return "SERVER_SIDE_MANAGED";
}

export function hasAiApiKey(): boolean {
  return true; // Supported via server-side Gemini proxy routes
}

async function callAiProxy<T>(endpoint: string, payload: any, fallback: T): Promise<T> {
  try {
    const customKey = getCustomApiKey();
    const response = await fetch(`/api/ai/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(customKey ? { "x-custom-api-key": customKey } : {})
      },
      body: JSON.stringify({
        ...payload,
        customApiKey: customKey || undefined
      })
    });

    if (!response.ok) {
      console.warn(`[AI Proxy] Server returned ${response.status}. Using fallback response.`);
      return fallback;
    }

    const json = await response.json();
    if (json.success && json.data) {
      return json.data as T;
    }
    if (json.fallback) {
      return json.fallback as T;
    }
    return fallback;
  } catch (err: any) {
    console.warn(`[AI Proxy Network Fail / ${endpoint}]:`, err?.message || err);
    return fallback;
  }
}

export interface EventSummary {
  title: string;
  story: string;
  mood: string;
}

export async function generateEventSummary(tags: string[]): Promise<EventSummary> {
  const fallback: EventSummary = {
    title: "Memories in the Making",
    story: "A collection of moments captured and preserved for the future.",
    mood: "Sentimental"
  };

  return callAiProxy<EventSummary>("event-summary", { tags }, fallback);
}

export interface PhotoAnalysis {
  tags: string[];
  aestheticScore: number;
  description: string;
  category: string;
  ocrText?: string;
}

export async function analyzePhoto(photoPath: string, imageData?: string): Promise<PhotoAnalysis> {
  const fallback: PhotoAnalysis = {
    aestheticScore: 7.8,
    tags: ["Photography", "Analyzed", "Visual Asset"],
    description: "Photo indexed and organized securely.",
    category: "Personal"
  };

  return callAiProxy<PhotoAnalysis>("analyze-photo", { photoPath, imageData }, fallback);
}

export interface SmartQuery {
  keywords: string[];
  intent: string;
  suggestedFilters?: {
    category?: string;
    minQuality?: number;
  };
}

export async function detectPeopleInBatch(photos: { id: string | number; path: string }[]): Promise<Record<string, string[]>> {
  return callAiProxy<Record<string, string[]>>("detect-people", { photos }, {});
}

export async function expandSmartQuery(query: string): Promise<SmartQuery> {
  const fallback: SmartQuery = {
    keywords: [query],
    intent: "keyword_fallback"
  };

  return callAiProxy<SmartQuery>("smart-query", { query }, fallback);
}

export interface PhotobookAiStory {
  curatedTitle: string;
  curatedSubtitle: string;
  chapters: {
    chapterTitle: string;
    storyNote: string;
    accentQuote: string;
  }[];
  epilogue: string;
}

export async function generatePhotobookStory(
  title: string,
  theme: string,
  photoDetails: any[],
  storyTone: string = "lyrical"
): Promise<PhotobookAiStory> {
  const toneTitle = 
    storyTone === 'travel' ? "낯선 바람이 머문 길목" :
    storyTone === 'family' ? "함께여서 눈부신 날들" :
    storyTone === 'minimal' ? "빛과 침묵의 시간" : "빛나는 시간의 조각들";

  const fallback: PhotobookAiStory = {
    curatedTitle: title || toneTitle,
    curatedSubtitle: "기억 속에 영원히 머무를 소중한 순간의 아카이브",
    chapters: [
      {
        chapterTitle: storyTone === 'travel' ? "출발의 설렘" : storyTone === 'family' ? "소소한 아침의 풍경" : "설레는 첫 걸음",
        storyNote: "새로운 빛과 풍경이 우리를 맞이하던 날, 카메라 렌즈 너머로 번지던 따스한 미소들.",
        accentQuote: "우리가 기억하는 것은 날들이 아니라 순간들이다."
      },
      {
        chapterTitle: storyTone === 'travel' ? "발길 닿는 대로" : storyTone === 'family' ? "함께 웃던 오후" : "함께 머물던 자리",
        storyNote: "바람이 불어오고 햇살이 어깨를 감싸 안을 때, 시간은 우리 곁에 잠시 멈춰 섰습니다.",
        accentQuote: "사진은 침묵 속에서 가장 깊은 사랑을 말한다."
      }
    ],
    epilogue: "수많은 순간 속에서 찾아낸 가장 아름다운 보석 같은 기억들을 이 책에 담아둡니다."
  };

  return callAiProxy<PhotobookAiStory>("photobook-story", { title, theme, photoDetails, storyTone }, fallback);
}

export async function rewritePhotobookCaption(
  photoContext: any,
  storyTone: string = "lyrical",
  currentCaption?: string
): Promise<string> {
  const fallback = currentCaption || "마음 깊이 오래도록 간직하고픈 아름다운 한 컷";
  const res = await callAiProxy<{ caption: string }>(
    "photobook-caption-rewrite",
    { photoContext, storyTone },
    { caption: fallback }
  );
  return res?.caption || fallback;
}
