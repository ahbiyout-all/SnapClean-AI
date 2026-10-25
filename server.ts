import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import chokidar from "chokidar";
import fs from "fs-extra";
import { exec } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Serve static assets from public directory for PWA crawlers & PWABuilder
  const publicDir = path.join(process.cwd(), "public");
  app.use(express.static(publicDir));

  // Explicit PWA manifest & service worker routes with CORS and correct content types
  app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(path.join(publicDir, "manifest.json"));
  });

  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(path.join(publicDir, "sw.js"));
  });

  // Helper for Gemini AI instance
  function getGeminiClient(customApiKey?: string) {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY || "";
    return new GoogleGenAI({
      apiKey: apiKey || undefined,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Snapshot AI Server is running" });
  });

  app.get("/api/ai/status", (req, res) => {
    const isConfigured = !!process.env.GEMINI_API_KEY;
    res.json({ configured: isConfigured });
  });

  // AI Route: Event Summary
  app.post("/api/ai/event-summary", async (req, res) => {
    const { tags = [], customApiKey } = req.body || {};
    const effectiveKey = customApiKey || (req.headers["x-custom-api-key"] as string) || process.env.GEMINI_API_KEY;
    
    if (!effectiveKey) {
      return res.json({
        success: false,
        fallback: {
          title: "Memories in the Making",
          story: "A collection of moments captured and preserved for the future.",
          mood: "Sentimental"
        }
      });
    }

    try {
      const client = getGeminiClient(effectiveKey);
      const prompt = `Given these photo tags from an event: ${Array.isArray(tags) ? tags.join(", ") : String(tags)}, 
      generate a creative, short event title and a 2-sentence emotional story summary. 
      Also provide a one-word mood.`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              story: { type: Type.STRING },
              mood: { type: Type.STRING }
            },
            required: ["title", "story", "mood"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed });
    } catch (_err) {
      return res.json({
        success: false,
        fallback: {
          title: "Captured Moments",
          story: "A visual compilation of cherished memories.",
          mood: "Nostalgic"
        }
      });
    }
  });

  // AI Route: Photo Analysis
  app.post("/api/ai/analyze-photo", async (req, res) => {
    const { photoPath, imageData, customApiKey } = req.body || {};
    const effectiveKey = customApiKey || (req.headers["x-custom-api-key"] as string) || process.env.GEMINI_API_KEY;

    if (!effectiveKey) {
      return res.json({
        success: false,
        fallback: {
          aestheticScore: 7.8,
          tags: ["Photography", "Analyzed", "Visual Asset"],
          description: "Photo indexed and organized securely.",
          category: "Personal"
        }
      });
    }

    try {
      const client = getGeminiClient(effectiveKey);
      const contents: any[] = [];
      
      if (imageData) {
        // Strip data:image/jpeg;base64, prefix if present
        const cleanBase64 = imageData.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        contents.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
        });
      }

      contents.push({
        text: `Analyze this photo ${photoPath ? `(path: ${photoPath})` : ''}. 
        Provide a detailed aesthetic score (0-10), 5 descriptive tags, 
        a one-sentence description, categorize it (e.g. Travel, Family, Work, Art, Nature),
        and extract ANY visible text in the image (especially if it's a receipt, document, or sign).`
      });

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts: contents },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aestheticScore: { type: Type.NUMBER },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              ocrText: { type: Type.STRING }
            },
            required: ["aestheticScore", "tags", "description", "category"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed });
    } catch (_err) {
      return res.json({
        success: false,
        fallback: {
          aestheticScore: 7.5,
          tags: ["Photography", "Analyzed", "Local Fallback"],
          description: "A photo from your library that requested AI tagging.",
          category: "Personal"
        }
      });
    }
  });

  // AI Route: Smart Search Query Expansion
  app.post("/api/ai/smart-query", async (req, res) => {
    const { query = "", customApiKey } = req.body || {};
    const effectiveKey = customApiKey || (req.headers["x-custom-api-key"] as string) || process.env.GEMINI_API_KEY;

    if (!effectiveKey) {
      return res.json({
        success: false,
        fallback: {
          keywords: [query],
          intent: "keyword_fallback"
        }
      });
    }

    try {
      const client = getGeminiClient(effectiveKey);
      const prompt = `Interpret this photo library search query. It might be in any language (e.g. Korean, Japanese, French). 
      Translate it to English keywords if needed. Extract conceptual keywords and filters.
      Query: "${query}"`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              intent: { type: Type.STRING },
              suggestedFilters: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  minQuality: { type: Type.NUMBER }
                }
              }
            },
            required: ["keywords", "intent"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed });
    } catch (_err) {
      return res.json({
        success: false,
        fallback: {
          keywords: [query],
          intent: "keyword_fallback"
        }
      });
    }
  });

  // AI Route: Detect People in Batch
  app.post("/api/ai/detect-people", async (req, res) => {
    const { photos = [], customApiKey } = req.body || {};
    const effectiveKey = customApiKey || (req.headers["x-custom-api-key"] as string) || process.env.GEMINI_API_KEY;

    if (!effectiveKey) {
      return res.json({ success: false, fallback: {} });
    }

    try {
      const client = getGeminiClient(effectiveKey);
      const prompt = `Analyze these photos and cluster the people appearing in them. For each person detected across the photos, provide a unique identifier (e.g., "Person A", "Person B") and a list of the photo IDs that contain this person.
      Photos: ${JSON.stringify(photos.map((p: any) => ({ id: p.id, path: p.path })))}. 
      Return as a JSON object where keys are person names, and values are arrays of photo IDs.`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed });
    } catch (_err) {
      return res.json({ success: false, fallback: {} });
    }
  });

  // AI Route: Photobook Emotional Story Generation with 4 Tonal Styles
  app.post("/api/ai/photobook-story", async (req, res) => {
    const { title = "", theme = "", storyTone = "lyrical", photoDetails = [], customApiKey } = req.body || {};
    const effectiveKey = customApiKey || (req.headers["x-custom-api-key"] as string) || process.env.GEMINI_API_KEY;

    const toneGuide: Record<string, string> = {
      lyrical: "시적이고 아련한 서정적 감성 (여운과 계절감, 그리움, 찰나의 아름다움 강조)",
      travel: "생생하고 모험적인 여행 탐험기 (낯선 풍경, 골목의 설렘, 새로운 발견, 자유로움 강조)",
      family: "따뜻하고 뭉클한 가족/연인 일기 (함께한 온기, 소박한 행복, 미소, 영원한 유대감 강조)",
      minimal: "세련되고 정제된 모더니즘 에디토리얼 (여백의 미, 간결하고 깊이 있는 문장, 빛과 구도 중심)"
    };

    const selectedGuide = toneGuide[storyTone] || toneGuide.lyrical;

    const fallbackStory = {
      curatedTitle: title || (storyTone === 'travel' ? "낯선 바람이 머문 길목" : storyTone === 'family' ? "함께여서 눈부신 날들" : storyTone === 'minimal' ? "빛과 침묵의 시간" : "빛나는 시간의 조각들"),
      curatedSubtitle: storyTone === 'travel' ? "지도 밖으로 떠난 우리들의 잊지 못할 기록" : storyTone === 'family' ? "서로의 미소로 채워진 소중한 가족 앨범" : storyTone === 'minimal' ? "정제된 프레임 속에 담아낸 찰나의 순간" : "기억 속에 영원히 머무를 소중한 순간의 아카이브",
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

    if (!effectiveKey) {
      return res.json({ success: false, fallback: fallbackStory });
    }

    try {
      const client = getGeminiClient(effectiveKey);
      const prompt = `당신은 세계적인 감성 사진집(Photobook) 수석 에디터입니다.
아래 사진 목록 메타데이터를 정밀 분석하여, 지정된 문학적 톤앤매너로 디지털 사진첩 텍스트를 완성해 주세요.

[요청 톤앤매너]: ${selectedGuide}
[사진첩 테마]: ${theme}
[기존 제목 후보]: ${title || "미정"}

[사진 메타데이터 목록]:
${JSON.stringify(photoDetails, null, 2)}

다음 JSON 규격으로만 응답하세요:
{
  "curatedTitle": "감성적이고 세련된 사진첩 메인 제목 (한국어, 15자 내외)",
  "curatedSubtitle": "톤앤매너에 어울리는 서정적 부제 한 줄 (20자 내외)",
  "chapters": [
    {
      "chapterTitle": "챕터 제목 (예: 1장. 노을빛이 번지던 오후)",
      "storyNote": "이 챕터 사진들의 정서를 관통하는 2~3줄의 문학적 에세이 글귀",
      "accentQuote": "짧은 시적 영감 한마디 (10자 내외)"
    }
  ],
  "epilogue": "책 뒷표지에 실릴 마음을 울리는 마무리 에필로그"
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed });
    } catch (_err) {
      return res.json({ success: false, fallback: fallbackStory });
    }
  });

  // AI Route: Single Photo Caption AI Rewriter
  app.post("/api/ai/photobook-caption-rewrite", async (req, res) => {
    const { photoContext = {}, storyTone = "lyrical", customApiKey } = req.body || {};
    const effectiveKey = customApiKey || (req.headers["x-custom-api-key"] as string) || process.env.GEMINI_API_KEY;

    const fallbackCaption = "마음 깊이 오래도록 간직하고픈 아름다운 한 컷";

    if (!effectiveKey) {
      return res.json({ success: false, fallback: fallbackCaption, data: { caption: fallbackCaption } });
    }

    try {
      const client = getGeminiClient(effectiveKey);
      const prompt = `사진 메타데이터와 지정된 톤앤매너를 반영하여 사진집에 어울리는 감성적인 한 줄 캡션을 15~25자 내외로 작성해 주세요.
사진 정보: ${JSON.stringify(photoContext)}
톤앤매너: ${storyTone} (lyrical: 서정적 감성, travel: 생생한 여행기, family: 따뜻한 가족일기, minimal: 담백한 미니멀)
반드시 JSON 형식 {"caption": "작성된 캡션"} 으로만 응답하세요.`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed });
    } catch (_err) {
      return res.json({ success: false, fallback: fallbackCaption, data: { caption: fallbackCaption } });
    }
  });

  // Multiplatform Mobile & Desktop Downloads
  app.get("/api/download/:artifact", async (req, res) => {
    const { artifact } = req.params;
    const distMobileDir = path.join(process.cwd(), "dist/mobile");
    const distDir = path.join(process.cwd(), "dist");

    // Ensure mobile packages exist; if not, trigger build
    if (!fs.existsSync(distMobileDir)) {
      try {
        const { buildMobilePackages } = await import("./scripts/build-mobile.js");
        await buildMobilePackages();
      } catch (err) {
        console.warn("[Download API] Could not auto-build mobile packages:", err);
      }
    }

    if (artifact === "apk") {
      const files = fs.existsSync(distMobileDir) ? fs.readdirSync(distMobileDir) : [];
      const apk = files.find(f => f.endsWith(".apk")) || "snapcleanai-mobile.apk";
      const filePath = path.join(distMobileDir, apk);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Disposition", `attachment; filename="${apk}"`);
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        return res.sendFile(filePath);
      }
      return res.status(404).json({ error: "APK package not found. Run npm run build:mobile first." });
    }

    if (artifact === "ipa") {
      const files = fs.existsSync(distMobileDir) ? fs.readdirSync(distMobileDir) : [];
      const ipa = files.find(f => f.endsWith(".ipa")) || "snapcleanai-ios.ipa";
      const filePath = path.join(distMobileDir, ipa);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Disposition", `attachment; filename="${ipa}"`);
        res.setHeader("Content-Type", "application/octet-stream");
        return res.sendFile(filePath);
      }
      return res.status(404).json({ error: "iOS IPA package not found. Run npm run build:mobile first." });
    }

    if (artifact === "mobileconfig") {
      const filePath = path.join(distMobileDir, "snapcleanai-ios.mobileconfig");
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Disposition", 'attachment; filename="snapcleanai-ios.mobileconfig"');
        res.setHeader("Content-Type", "application/x-apple-aspen-config");
        return res.sendFile(filePath);
      }
      return res.status(404).json({ error: "iOS mobileconfig profile not found. Run npm run build:mobile first." });
    }

    if (artifact === "manifest.plist") {
      const filePath = path.join(distMobileDir, "manifest.plist");
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/xml");
        return res.sendFile(filePath);
      }
      return res.status(404).json({ error: "OTA manifest.plist not found." });
    }

    if (artifact === "mobile-info") {
      const filePath = path.join(distMobileDir, "mobile-info.json");
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      return res.status(404).json({ error: "Mobile info not found." });
    }

    if (artifact === "portable") {
      const files = fs.existsSync(distDir) ? fs.readdirSync(distDir) : [];
      const exe = files.find(f => f.endsWith(".exe") && f.includes("portable")) || "snapcleanai-portable.exe";
      const filePath = path.join(distDir, exe);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Disposition", `attachment; filename="${exe}"`);
        res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
        return res.sendFile(filePath);
      }
      return res.status(404).json({ error: "Portable Windows executable not found." });
    }

    return res.status(400).json({ error: "Unknown download artifact requested" });
  });

  // Solve web-local memory losses on refresh by serving highly stylized SVG placeholders dynamically
  function servePlaceholder(filePath: string, res: any) {
    const isVideo = filePath.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    const fileName = path.basename(filePath);
    
    let startColor = '#3b82f6'; // blue
    let endColor = '#1d4ed8';
    let typeLabel = 'IMAGE';
    let iconMarkup = `<circle cx="120" cy="80" r="25" fill="none" stroke="white" stroke-width="6"/><path d="M50 140 L100 90 L130 120 L170 70 L220 140 Z" fill="white" opacity="0.8"/>`;

    if (isVideo) {
      startColor = '#ec4899'; // pink
      endColor = '#be185d';
      typeLabel = 'VIDEO';
      iconMarkup = `<polygon points="100,55 155,90 100,125" fill="white" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="6"/>`;
    } else if (isPdf) {
      startColor = '#8b5cf6'; // purple
      endColor = '#6d28d9';
      typeLabel = 'DOCUMENT';
      iconMarkup = `<rect x="85" y="45" width="70" height="90" rx="6" fill="none" stroke="white" stroke-width="6"/><line x1="100" y1="70" x2="140" y2="70" stroke="white" stroke-width="4"/><line x1="100" y1="95" x2="140" y2="95" stroke="white" stroke-width="4"/>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="100%" height="100%">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="240" height="180" rx="16" fill="url(#grad)" />
      <g opacity="0.12">
        <circle cx="40" cy="40" r="70" fill="white" />
        <circle cx="200" cy="140" r="50" fill="white" />
      </g>
      <g>
        ${iconMarkup}
      </g>
      <rect x="15" y="142" width="210" height="26" rx="6" fill="black" opacity="0.35" />
      <text x="120" y="159" fill="white" font-family="system-ui, sans-serif" font-weight="900" font-size="9" text-anchor="middle" letter-spacing="0.5">
        ${fileName.toUpperCase()}
      </text>
      <text x="120" y="24" fill="white" opacity="0.5" font-family="system-ui, sans-serif" font-weight="950" font-size="7" text-anchor="middle" letter-spacing="1.5">
        ${typeLabel} STREAM BUFFER
      </text>
    </svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(svg);
  }

  app.get("/api/system/view", (req, res) => {
    const rawPath = req.query.path as string;
    if (!rawPath) return res.status(400).send("Path is required");
    try {
      if (fs.existsSync(rawPath)) {
        return res.sendFile(rawPath);
      }
    } catch (e) {}
    return servePlaceholder(rawPath, res);
  });

  app.get("/api/system/thumbnail", (req, res) => {
    const rawPath = req.query.path as string;
    if (!rawPath) return res.status(400).send("Path is required");
    try {
      if (fs.existsSync(rawPath)) {
        return res.sendFile(rawPath);
      }
    } catch (e) {}
    return servePlaceholder(rawPath, res);
  });

  app.post("/api/system/open-file", (req, res) => {
    const { path: rawPath } = req.body || {};
    if (!rawPath) return res.status(400).json({ error: "Path is required" });

    // Handle opening on the host operating system with "Open With" dialog
    const platform = process.platform;
    let command = "";
    if (platform === "win32") {
      // Windows command to show the "연결 프로그램 선택 (Open With)" dialog
      command = `rundll32.exe shell32.dll,OpenAs_RunDLL "${rawPath.replace(/"/g, '\\"')}"`;
    } else if (platform === "darwin") {
      command = `open "${rawPath.replace(/"/g, '\\"')}"`;
    } else {
      command = `xdg-open "${rawPath.replace(/"/g, '\\"')}"`;
    }

    exec(command, (err) => {
      if (err) {
        console.warn(`[System] Could not open file via host shell (${command}):`, err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      console.log(`[System] Prompted connection program dialog for: ${rawPath}`);
      return res.json({ success: true, message: "Opened program selection dialog" });
    });
  });

  // --- File Watcher Service ---
  // In a real app, this would watch user-configured directories.
  // For demo, we'll watch a 'monitored' directory or the dcim mock path if we can.
  const watchPath = process.env.WATCH_PATH || path.join(process.cwd(), "public/mock_storage");
  
  // Ensure directory exists for demo
  await fs.ensureDir(watchPath);

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // we only want new files
  });

  console.log(`[Watcher] Monitoring: ${watchPath}`);

  watcher.on("add", (filePath) => {
    console.log(`[Watcher] New file detected: ${filePath}`);
    const fileName = path.basename(filePath);
    io.emit("file:added", {
      path: filePath,
      name: fileName,
      detectedAt: Date.now()
    });
  });

  watcher.on("change", (filePath) => {
    console.log(`[Watcher] File changed: ${filePath}`);
    io.emit("file:changed", {
      path: filePath,
      detectedAt: Date.now()
    });
  });

  // --- Socket.io Events ---
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    
    socket.emit("server:ready", {
      message: "Connected to Snapshot AI Watcher Service",
      watching: watchPath
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  // --- Vite Middleware / Static Serving ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
