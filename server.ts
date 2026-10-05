import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import chokidar from "chokidar";
import fs from "fs-extra";
import { exec } from "child_process";

async function startServer() {
  const app = express();
  app.use(express.json());
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

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Snapshot AI Server is running" });
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
