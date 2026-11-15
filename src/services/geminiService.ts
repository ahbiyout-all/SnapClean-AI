import { db } from './db';

export const API_KEY_CHANGE_EVENT = "snapclean_ai_key_changed";
export const AI_OUTBOX_UPDATED_EVENT = "ai-outbox-updated";

const QUEUEABLE_ENDPOINTS = new Set([
  "event-summary",
  "analyze-photo",
  "smart-query",
  "detect-people",
  "photobook-story",
  "rewrite-caption",
  "filter-relevance",
]);

export function getCustomApiKey(): string {
  return "";
}

export function setCustomApiKey(_key: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_KEY_CHANGE_EVENT));
  }
}

export function removeCustomApiKey(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_KEY_CHANGE_EVENT));
  }
}

export function getEffectiveApiKey(): string {
  return "SERVER_SIDE_MANAGED";
}

export function hasAiApiKey(): boolean {
  return true; // Managed securely via /api/ai/* server-side proxy
}

async function emitOutboxCount(flushing: boolean = false): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const pendingCount = await db.aiOutbox.where("status").equals("pending").count();
    window.dispatchEvent(
      new CustomEvent(AI_OUTBOX_UPDATED_EVENT, {
        detail: { pendingCount, flushing },
      })
    );
  } catch {
    // ignore if table not ready
  }
}

async function enqueueAiRequest(endpoint: string, payload: any, errorReason: string): Promise<void> {
  if (!QUEUEABLE_ENDPOINTS.has(endpoint)) return;
  try {
    const dedupeKey = `${endpoint}:${JSON.stringify(payload).slice(0, 240)}`;
    const existing = await db.aiOutbox.where("dedupeKey").equals(dedupeKey).first();
    if (existing) return;

    await db.aiOutbox.add({
      endpoint,
      payload,
      dedupeKey,
      status: "pending",
      retries: 0,
      createdAt: Date.now(),
      lastError: errorReason,
    });
    await emitOutboxCount(false);
  } catch (err) {
    console.warn("[AI Outbox] Enqueue skipped:", err);
  }
}

let isFlushingOutbox = false;

/**
 * Flush queued offline AI requests when connectivity is restored.
 */
export async function flushAiOutbox(): Promise<{ processed: number; remaining: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = await db.aiOutbox.where("status").equals("pending").count().catch(() => 0);
    return { processed: 0, remaining };
  }
  if (isFlushingOutbox) {
    const remaining = await db.aiOutbox.where("status").equals("pending").count().catch(() => 0);
    return { processed: 0, remaining };
  }

  isFlushingOutbox = true;
  let processed = 0;

  try {
    const pendingItems = await db.aiOutbox.where("status").equals("pending").toArray();
    if (pendingItems.length === 0) {
      await emitOutboxCount(false);
      return { processed: 0, remaining: 0 };
    }

    await emitOutboxCount(true);

    for (const item of pendingItems) {
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
      try {
        const res = await fetch(`/api/ai/${item.endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload || {}),
        });

        if (res.ok) {
          const json = await res.json();
          if (item.endpoint === "analyze-photo" && json?.data && item.payload?.photoPath) {
            try {
              const target = await db.photos.where("path").equals(item.payload.photoPath).first();
              if (target?.id) {
                await db.photos.update(target.id, {
                  tags: json.data.tags || target.tags,
                  aestheticScore: json.data.aestheticScore ?? target.aestheticScore,
                  description: json.data.description || target.description,
                  category: json.data.category || target.category,
                  ocrText: json.data.ocrText || target.ocrText,
                  status: "analyzed",
                });
                window.dispatchEvent(new CustomEvent("photos-database-updated"));
              }
            } catch {}
          }
          if (item.id) await db.aiOutbox.delete(item.id);
          processed++;
        } else {
          if (item.id) {
            await db.aiOutbox.update(item.id, {
              retries: item.retries + 1,
              status: item.retries >= 2 ? "failed" : "pending",
              lastError: `HTTP ${res.status}`,
            });
          }
        }
      } catch (err: any) {
        if (item.id) {
          await db.aiOutbox.update(item.id, {
            retries: item.retries + 1,
            status: item.retries >= 3 ? "failed" : "pending",
            lastError: err?.message || "Network error",
          });
        }
      }
    }
  } finally {
    isFlushingOutbox = false;
    await emitOutboxCount(false);
  }

  const remaining = await db.aiOutbox.where("status").equals("pending").count().catch(() => 0);
  return { processed, remaining };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushAiOutbox().catch(() => {});
  });
  setTimeout(() => {
    if (navigator.onLine) {
      flushAiOutbox().catch(() => {});
    } else {
      emitOutboxCount(false).catch(() => {});
    }
  }, 1500);
}

async function callAiProxy<T>(endpoint: string, payload: any, fallback: T): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueAiRequest(endpoint, payload, "Offline");
    return fallback;
  }

  try {
    const response = await fetch(`/api/ai/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {})
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
    await enqueueAiRequest(endpoint, payload, err?.message || "Network error");
    return fallback;
  }
}

export interface EventSummary {
  title: string;
  story: string;
  mood: string;
}

export async function generateEventSummary(tags: string[], storyTone: string = "lyrical"): Promise<EventSummary> {
  const fallback: EventSummary = {
    title: "Memories in the Making",
    story: "A collection of moments captured and preserved for the future.",
    mood: "Sentimental"
  };

  return callAiProxy<EventSummary>("event-summary", { tags, storyTone }, fallback);
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

export async function animateImageIntoVideo(
  imageData: string,
  prompt: string = "",
  aspectRatio: "16:9" | "9:16" = "16:9"
): Promise<{ videoData: string; mimeType: string } | null> {
  const res = await callAiProxy<{ videoData: string; mimeType: string } | null>(
    "animate-image",
    { imageData, prompt, aspectRatio },
    null
  );
  return res;
}

export async function rewritePhotobookCaption(
  meta: { location?: string; date?: string; score?: number },
  tone: string,
  currentCaption?: string
): Promise<string> {
  const fallback = currentCaption || "A beautiful memory captured in time.";
  return callAiProxy<string>("rewrite-caption", { meta, tone, currentCaption }, fallback);
}

export interface RelevanceResult {
  irrelevantPhotoIds: (string | number)[];
  reasons: Record<string, string>;
}

export async function filterIrrelevantPhotos(
  photos: { id: string | number; tags: string[]; category?: string; aestheticScore?: number; ocrText?: string }[],
  albumTitle?: string
): Promise<RelevanceResult> {
  const fallback: RelevanceResult = {
    irrelevantPhotoIds: photos
      .filter(p => {
        const isDocument = p.category?.toLowerCase() === 'document' || p.category?.toLowerCase() === 'receipt';
        const isLowAesthetic = (p.aestheticScore || 5) < 3.5;
        const hasIrrelevantTags = p.tags.some(t => ['screenshot', 'text', 'receipt', 'document', 'form'].includes(t.toLowerCase()));
        return isDocument || isLowAesthetic || hasIrrelevantTags;
      })
      .map(p => p.id),
    reasons: {}
  };

  return callAiProxy<RelevanceResult>("filter-relevance", { photos, albumTitle }, fallback);
}
