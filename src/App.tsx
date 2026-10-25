import React, {
  useState,
  useEffect,
  useRef,
  ElementType,
  useMemo,
} from "react";
import * as d3 from "d3";
import { db, PhotoRecord, AuditLog, EventRecord } from "./services/db";
import { DedupeEngine, DedupeGroup } from "./services/dedupeEngine";
import { PeopleEngine, PersonGroup } from "./services/peopleEngine";
import { ThumbnailGenerator } from "./utils/thumbnailGenerator";
import { GifParser } from "./utils/gifParser";
import {
  DirectoryTreeExplorer,
  DirectoryNode,
} from "./components/DirectoryTree";
import { StatCard } from "./components/StatCard";
import { PhotoCard, PhotoCardProps } from "./components/PhotoCard";
import { CinematicReel } from "./components/CinematicReel";
import { MemoryMomentWidget } from "./components/MemoryMomentWidget";
import { SocialExportModal } from "./components/SocialExportModal";
import { CollabShareModal } from "./components/CollabShareModal";
import { PrintOptimizerModal } from "./components/PrintOptimizerModal";
import { DeepRecoveryModal } from "./components/DeepRecoveryModal";
import { ForensicLedger } from "./components/ForensicLedger";
import { LegacySettings } from "./components/LegacySettings";
import { PhotoMap } from "./components/PhotoMap";
import { StorageChart } from "./components/StorageChart";
import { ProgressiveDiscoveryBanner } from "./components/ProgressiveDiscoveryBanner";
import { getLocalizedCategory } from "./utils/categoryUtils";
import { useI18n } from "./i18n/context";
import { io, Socket } from "socket.io-client";
import { DuplicateGroup, EventImage } from "./components/DuplicateGroup";
import { libraryManager } from "./services/PhotoLibraryManager";
import {
  Menu,
  LayoutDashboard,
  Trash2,
  Image as ImageIcon,
  Zap,
  Settings,
  ShieldCheck,
  Hash,
  Cpu,
  Layers,
  Search,
  Plus,
  ArrowRight,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  RefreshCw,
  Folder,
  Activity,
  ChevronUp,
  MoreVertical,
  PieChart,
  FastForward,
  Users,
  Sparkles,
  Calendar,
  MapPin,
  Navigation,
  HardDrive,
  Clock,
  Lock,
  Key,
  Flame,
  History,
  Download,
  X,
  RotateCcw,
  Wand2,
  Printer,
  Instagram,
  Share2,
  Smartphone,
  Cloud,
  Wifi,
  Highlighter,
  Maximize,
  CloudOff,
  Server,
  BarChart3,
  Video,
  Pause,
  Play,
  Square,
  FolderPlus,
  Binary,
  AlertTriangle,
  Info,
  FileText,
  SlidersHorizontal,
  Music,
  Film,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  generateEventSummary,
  analyzePhoto,
  EventSummary,
  expandSmartQuery,
  SmartQuery,
  hasAiApiKey,
} from "./services/geminiService";
import { AiApiKeyModal } from "./components/AiApiKeyModal";
import { useAiApiKey } from "./hooks/useAiApiKey";
import { CryptoEngine } from "./services/cryptoEngine";
import { SystemAPI } from "./services/systemApi";
import { BlurDetection } from "./utils/blurDetection";
import { PWAInstallButton } from "./components/PWAInstallButton";
import { AuditTab } from "./components/tabs/AuditTab";
import { TrashTab } from "./components/tabs/TrashTab";
import { DashboardTab } from "./components/tabs/DashboardTab";
import { DuplicatesTab } from "./components/tabs/DuplicatesTab";
import { PhotobookTab } from "./components/tabs/PhotobookTab";
import { LibraryTab } from "./components/tabs/LibraryTab";
import { PeopleTab } from "./components/tabs/PeopleTab";
import { useScanner } from "./hooks/useScanner";
import { useLibrary } from "./hooks/useLibrary";
import { usePeople } from "./hooks/usePeople";
import { Photo } from "./types";
import { MemoriesTab } from "./components/tabs/MemoriesTab";
import { LocationTab } from "./components/tabs/LocationTab";
import { EngineTab } from "./components/tabs/EngineTab";
import { EnhancementTab } from "./components/tabs/EnhancementTab";
import { PrintTab } from "./components/tabs/PrintTab";
import { SyncTab } from "./components/tabs/SyncTab";
import { BurstTab } from "./components/tabs/BurstTab";
import { idleSweeper } from "./services/idleSweeper";
import { DiagnosticsDashboard } from "./components/DiagnosticsDashboard";
import { MotionCreatorModal } from "./components/MotionCreatorModal";
import { PatchNotesModal } from "./components/PatchNotesModal";
import { IndexingProgressHUD } from "./components/IndexingProgressHUD";
import { ScanSourceModal } from "./components/ScanSourceModal";
import { APP_VERSION_INFO } from "./version";
import { useUpdateChecker } from "./hooks/useUpdateChecker";
import { UpdateNotificationModal } from "./components/UpdateNotificationModal";
import { MultiplatformInstallModal } from "./components/MultiplatformInstallModal";
import { GlobalTooltip } from "./components/GlobalTooltip";

// Components
export default function App() {
  const [activeTab, setActiveTab] = useState("duplicates");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScanSourceModal, setShowScanSourceModal] = useState(false);
  const [showMultiplatformModal, setShowMultiplatformModal] = useState(false);
  const { t, language, setLanguage } = useI18n();

  const {
    hasUpdate,
    latestVersion,
    release: latestRelease,
    isSimulated: isUpdateSimulated,
    isModalOpen: showUpdateModal,
    setIsModalOpen: setShowUpdateModal,
    ignoreCurrentVersion,
  } = useUpdateChecker();

  const { isConfigured: isAiConfigured } = useAiApiKey();

  // If AI key is removed while on an AI-only tab, redirect to duplicates
  useEffect(() => {
    if (!isAiConfigured && (activeTab === "people" || activeTab === "memories" || activeTab === "enhancement")) {
      setActiveTab("duplicates");
    }
  }, [isAiConfigured, activeTab]);

  // Minimal 3 core menus: 중복 정리, 디지털 사진첩, 사진 보관함
  const navItems = useMemo(() => {
    return [
      {
        id: "duplicates",
        icon: Hash,
        label: language === "ko" ? "중복 사진 정리" : "Duplicates Clean",
        isAi: false,
      },
      {
        id: "photobook",
        icon: BookOpen,
        label: language === "ko" ? "디지털 사진첩" : "Digital Photobook",
        isAi: false,
      },
      {
        id: "library",
        icon: ImageIcon,
        label: language === "ko" ? "사진 보관함" : "Photo Library",
        isAi: false,
      },
    ];
  }, [language]);

  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [showScanSettings, setShowScanSettings] = useState(false);
  const [notifications, setNotifications] = useState<
    {
      id: string;
      title: string;
      message: string;
      type: "info" | "success" | "warning" | "error";
      timestamp: number;
    }[]
  >([]);
  const [modal, setModal] = useState<{
    type: "alert" | "confirm" | "organize" | "report" | "error";
    title: string;
    message: string;
    options?: string[];
    data?: any;
    onConfirm?: (option?: string, mode?: "move" | "copy") => void;
    onClose?: () => void;
  } | null>(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [motionCreatorPhotos, setMotionCreatorPhotos] = useState<PhotoRecord[] | null>(null);
  const allowedCloseRef = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupTauriCloseHandler = async () => {
      if (SystemAPI.isTauri()) {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const appWindow = getCurrentWindow();

          unlisten = await appWindow.onCloseRequested((event) => {
            if (!allowedCloseRef.current) {
              event.preventDefault();
              setShowExitConfirm(true);
            }
          });
        } catch (err) {
          console.warn("Failed to register Tauri close request handler", err);
        }
      }
    };

    setupTauriCloseHandler();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!allowedCloseRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (unlisten) unlisten();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleConfirmExit = async () => {
    allowedCloseRef.current = true;
    setShowExitConfirm(false);
    if (SystemAPI.isTauri()) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        getCurrentWindow().close();
      } catch (err) {
        console.error("Failed to close Tauri window", err);
      }
    } else {
      addNotification(
        "App Terminated",
        "In a native app, this would close SnapClean. On web, you can now close this tab safely.",
        "success",
      );
    }
  };

  const addNotification = (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ) => {
    const id =
      Date.now().toString() + "-" + Math.random().toString(36).substring(2, 9);
    setNotifications((prev) =>
      [{ id, title, message, type, timestamp: Date.now() }, ...prev].slice(
        0,
        5,
      ),
    );
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const handleOpenMediaViewer = (e: Event) => {
      const customEvent = e as CustomEvent<{
        photo: PhotoRecord;
        list?: PhotoRecord[];
      }>;
      if (customEvent && customEvent.detail && customEvent.detail.photo) {
        SystemAPI.openInDefaultApp(customEvent.detail.photo, addNotification);
      }
    };
    window.addEventListener("open-media-viewer", handleOpenMediaViewer);
    return () =>
      window.removeEventListener("open-media-viewer", handleOpenMediaViewer);
  }, []);

  const {
    scanning,
    setScanning,
    handleStartScan,
    handlePauseScan,
    handleResumeScan,
    handleStopScanRequest,
    handleSkipDeepScan,
    isPaused,
    isStopped,
    scanStats,
    detectDuplicates,
    resolveDuplicate,
    resolveAllGroups,
    organizeDuplicates,
    sortedGroups,
    dupSortBy,
    setDupSortBy,
    autoResolveRule,
    setAutoResolveRule,
    dedupeOptions,
    setDedupeOptions,
    originalHandling,
    setOriginalHandling,
    orgTargetFolder,
    orgProgress,
    setOrgProgress,
    organizing,
    setOrganizing,
    lowValueAssets,
    setScanStats,
    thermalThrottleActive,
    batteryStatus,
    scanFormats,
    setScanFormats,
    backupEnabled,
    setBackupEnabled,
    backupFolder,
    setBackupFolder,
    scanSpeed,
    setScanSpeed,
    quickScanMode,
    setQuickScanMode,
    bgSyncConfig,
    updateBgSyncConfig,
    triggerIncrementalSync,
    requestNotificationPermission,
    bgSyncStatus,
    handlePurgeAllIndexData,
  } = useScanner(addNotification, setModal);

  const {
    libraryPhotos,
    trashPhotos,
    lastPurged,
    emptyTrash,
    undoEmptyTrash,
    categoryStats,
    formatStats,
    dateStats,
    locations,
    selectedCategories,
    setSelectedCategories,
    selectedQualityTags,
    setSelectedQualityTags,
    selectedFormats,
    setSelectedFormats,
    selectedYears,
    setSelectedYears,
    selectedCameras,
    setSelectedCameras,
    selectedOrientations,
    setSelectedOrientations,
    selectedSizes,
    setSelectedSizes,
    selectedLocations,
    setSelectedLocations,
    searchQuery,
    setSearchQuery,
    syncing,
    handleSyncLibrary,
    filteredLibraryPhotos,
    loadLibrary,
    taggingProgress,
    handleBulkTagging,
    handleEnhance,
    handleOrganize,
    handleBatchRename,
    deleteFromDisk,
    isProcessingSmartQuery,
    setIsProcessingSmartQuery,
    resetLibraryState,
  } = useLibrary(addNotification, setModal, selectedFolders);

  const {
    peopleGroups,
    loading: peopleLoading,
    renamePerson,
    loadPeople,
  } = usePeople(addNotification);

  const [showCollabShare, setShowCollabShare] = useState<EventRecord | null>(
    null,
  );

  const [dbCount, setDbCount] = useState(0);
  const [totalWaste, setTotalWaste] = useState(0);
  const [memoryMoment, setMemoryMoment] = useState<PhotoRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  useEffect(() => {
    const fetchAudits = async () => {
      const logs = await db.auditLogs
        .orderBy("timestamp")
        .reverse()
        .limit(100)
        .toArray();
      setAuditLogs(logs);
    };
    fetchAudits();
    // Refresh when tab becomes active or periodically
    const interval = setInterval(fetchAudits, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);
  const [activeReel, setActiveReel] = useState<{
    event: any;
    photos: any[];
  } | null>(null);
  const [showSocialExport, setShowSocialExport] = useState(false);
  const [showPrintOpt, setShowPrintOpt] = useState(false);
  const [showDeepRecovery, setShowDeepRecovery] = useState(false);

  const memoriesList = useMemo(() => {
    const map: Record<number, PhotoRecord[]> = {};
    libraryPhotos.forEach((p) => {
      const yr = p.dateTaken ? new Date(p.dateTaken).getFullYear() : 2026;
      if (!map[yr]) map[yr] = [];
      map[yr].push(p);
    });
    return Object.entries(map)
      .map(([yr, photos]) => ({ year: parseInt(yr, 10), photos }))
      .sort((a, b) => b.year - a.year);
  }, [libraryPhotos]);

  const [eventSummaries, setEventSummaries] = useState<Record<string, any>>({});
  const handleGenerateAISummary = async (eventId: string, photos: PhotoRecord[]) => {
    try {
      const tags = photos.slice(0, 10).map((p) => p.category || (p.path ? p.path.split('/').pop() || 'photo' : 'photo'));
      const summary = await generateEventSummary(tags);
      setEventSummaries((prev) => ({ ...prev, [eventId]: summary }));
      return summary;
    } catch (e) {
      console.error(e);
      return null;
    }
  };
  const generateAllMemorySummaries = async () => {
    for (const mem of memoriesList) {
      await handleGenerateAISummary(String(mem.year), mem.photos);
    }
  };

  const refreshDBCount = async () => {
    try {
      const count = await db.photos.count();
      setDbCount(count);

      if (count === 0) {
        setTotalWaste(0);
        setMemoryMoment(null);
        return;
      }

      // Total waste estimation
      const reclaimedBytes = sortedGroups.reduce(
        (acc, g) => acc + (g.redundantSize || 0),
        0,
      );
      const lowValBytes = lowValueAssets.reduce((acc, p) => acc + p.size, 0);
      setTotalWaste(reclaimedBytes + lowValBytes);

      // Pick a memory moment
      const all = await db.photos.where("isDeleted").equals(0).toArray();
      if (all.length > 0) {
        const random = all[Math.floor(Math.random() * all.length)];
        setMemoryMoment(random);
      } else {
        setMemoryMoment(null);
      }
    } catch (e) {
      console.error("[refreshDBCount] Error refreshing stats:", e);
    }
  };

  useEffect(() => {
    refreshDBCount();
  }, [sortedGroups, lowValueAssets]);

  useEffect(() => {
    const handleDbUpdated = () => {
      refreshDBCount();
    };
    window.addEventListener("photos-database-updated", handleDbUpdated);
    return () => window.removeEventListener("photos-database-updated", handleDbUpdated);
  }, [sortedGroups, lowValueAssets]);

  // Track the transition of scanner from active to idle, and refresh all states
  const wasScanningRef = useRef(false);
  useEffect(() => {
    if (scanning) {
      wasScanningRef.current = true;
    } else if (wasScanningRef.current && !scanning) {
      wasScanningRef.current = false;

      // If scan was stopped/aborted, don't trigger post-scan completion notification
      if (isStopped) {
        return;
      }

      const postScanAsync = async () => {
        try {
          const currentCount = await db.photos.count();
          if (currentCount === 0) return;

          // Fetch the latest count and reload library/people
          await Promise.all([
            loadLibrary(),
            loadPeople(),
            refreshDBCount(),
          ]);
          addNotification(
            t("scanCompleted") || "Scan Completed",
            `Successfully scanned and integrated folders. Base library is fully matching.`,
            "success",
          );
        } catch (err) {
          console.error("[Post-Scan Process] Data updates failed:", err);
        }
      };

      postScanAsync();
    }
  }, [scanning, isStopped, loadLibrary, loadPeople]);

  const handleFullAppReset = async () => {
    wasScanningRef.current = false;
    // 1. Immediately abort running scan
    handleStopScanRequest();

    // 2. Clear App-level selection & UI states immediately
    setSelectedPaths([]);
    setSelectedFolders([]);
    setDbCount(0);
    setTotalWaste(0);
    setMemoryMoment(null);
    setSelectedPhotoId(null);
    setSelectedPhotoIds([]);
    setIsMultiSelectMode(false);
    resetLibraryState();

    // 3. Clear scanner & database (IndexedDB)
    await handlePurgeAllIndexData();

    // 4. Reload people & refresh count
    await loadPeople();
    await refreshDBCount();
  };

  const logAuditAction = async (
    action: string,
    path?: string,
    details: any = "",
  ) => {
    try {
      await db.auditLogs.add({
        action,
        path,
        details,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error("Audit Logging Failed", e);
    }
  };

  const runSelfHealingAudit = async () => {
    setScanning(true);
    addNotification(t("integrityAudit"), t("startingAudit"), "info");

    try {
      const photos = await db.photos.toArray();
      let issuesFound = 0;
      let healedCount = 0;
      let missingPaths: number[] = [];

      for (const photo of photos) {
        const result = await SystemAPI.verifyFileIntegrity(
          photo.path,
          photo.md5,
        );
        if (!result.exists) {
          await db.photos.update(photo.id!, { status: "missing" });
          issuesFound++;
          missingPaths.push(photo.id!);
          logAuditAction(
            "INTEGRITY_FAIL",
            photo.path,
            "File missing during background watchdog cycle",
          );
        } else if (!result.hashMatches) {
          issuesFound++;
          logAuditAction(
            "INTEGRITY_MISMATCH",
            photo.path,
            "Bit-rot or unauthorized modification detected",
          );

          // Phase 38.3: Heavy Bit-rot Parity Reconciliation (지능형 이중 패리티 정합성 자동 비교 복원)
          // Initiate instant handshake with simulated NAS mirror or dual parity storage
          addNotification(
            "Bit-Rot Remediation Engaged",
            `Recovering byte structures and signatures for "${photo.path.split("/").pop()}"...`,
            "warning",
          );

          try {
            const healResult = await SystemAPI.reconcileAndRestoreParity(
              photo.path,
              photo.md5 || "",
            );
            if (healResult.success) {
              healedCount++;
              logAuditAction(
                "INTEGRITY_HEALED",
                photo.path,
                `Self-healed via ${healResult.strategy}: ${healResult.message}`,
              );
              addNotification(
                "Parity Synchronized",
                `Flushed bit-rot blocks. Parity restored via ${healResult.strategy}.`,
                "success",
              );
            } else {
              addNotification(
                "Healing Blocked",
                `Failed to restore redundancy parity: ${healResult.message}`,
                "error",
              );
            }
          } catch (healErr) {
            console.error("[Bit-rot Auto Healing Fatal]", healErr);
          }
        }
      }

      const activeIssues = issuesFound - healedCount;

      if (activeIssues > 0 || missingPaths.length > 0) {
        setModal({
          type: "confirm",
          title: t("integrityAudit"),
          message:
            t("integrityIssuesFound", { count: issuesFound }) +
            `\n\n` +
            `• ${t("missing")}: ${missingPaths.length}\n` +
            `• Hash Mismatches: ${activeIssues} (${healedCount} healed automatically)\n\n` +
            `Would you like to purge the ${missingPaths.length} missing asset references from the database?`,
          onConfirm: async () => {
            if (missingPaths.length > 0) {
              await db.photos.bulkDelete(missingPaths);
              logAuditAction(
                "INTEGRITY_REPAIR",
                "DATABASE",
                `Purged ${missingPaths.length} dangling references.`,
              );
              addNotification(
                t("selfHealingComplete"),
                `Successfully repaired ${missingPaths.length} records.`,
                "success",
              );
              detectDuplicates();
            }
          },
        });
      } else if (healedCount > 0) {
        logAuditAction(
          "INTEGRITY_CHECK_PASS",
          "GLOBAL",
          `Full system audit completed. Detected ${issuesFound} bit-rot issues, successfully self-healed ${healedCount} of them.`,
        );
        setModal({
          type: "alert",
          title: "All Bit-rot Self-Healed",
          message: `Watchdog verification complete: ${healedCount} files returned signature collisions due to bit-rot, but the Intelligent NAS Mirror Syncer rebuilt and overwrote them with 0% byte distortion.`,
        });
      } else {
        logAuditAction(
          "INTEGRITY_CHECK_PASS",
          "GLOBAL",
          "Full system audit completed with 0 errors.",
        );
        addNotification(t("integrityAudit"), t("libraryHealthy"), "success");
      }
    } catch (e) {
      addNotification(t("auditFailed"), String(e), "warning");
    } finally {
      setScanning(false);
    }
  };

  const clearStorage = async () => {
    await db.photos.clear();
    await db.auditLogs.clear();
    await db.events.clear();
    addNotification("Factory Reset", "Database has been purged.", "warning");

    // Phase 43.1: Force-refresh all data stores to flush UI
    setSelectedPaths([]);
    setSearchQuery("");
    await Promise.all([
      loadLibrary(),
      loadPeople(),
      refreshDBCount(),
    ]);
  };

  const handleSelectLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc],
    );
  };

  const directoryTree = useMemo(() => {
    const root: DirectoryNode = {
      name: "Root",
      path: "",
      children: [],
      files: [],
    };
    libraryPhotos.forEach((photo) => {
      const p = photo.path.startsWith("/") ? photo.path.slice(1) : photo.path;
      const parts = p.split("/");
      parts.pop();
      let current = root;
      let pathSoFar = "/";

      parts.forEach((folderName, idx) => {
        if (!folderName) return;
        pathSoFar += folderName + "/";

        // Skip visual tree nesting for internal virtual root paths like web-local, storage, dcim ONLY when they have sub-directories
        if (
          (folderName === "web-local" ||
            folderName === "storage" ||
            folderName === "dcim") &&
          idx < 2
        ) {
          if (idx === parts.length - 1) {
            // Keep it if it is the leaf folder
          } else {
            return;
          }
        }

        let child = current.children.find((c) => c.name === folderName);
        if (!child) {
          child = {
            name: folderName,
            path: pathSoFar,
            children: [],
            files: [],
          };
          current.children.push(child);
        }
        current = child;
      });

      current.files.push(photo);
    });

    // Calculate recursive totals
    const calculateTotals = (node: DirectoryNode): number => {
      const childTotals = node.children.reduce(
        (acc, child) => acc + calculateTotals(child),
        0,
      );
      node.totalFiles = node.files.length + childTotals;
      return node.totalFiles || 0;
    };
    calculateTotals(root);

    return root;
  }, [libraryPhotos]);

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{
    platform: string;
    arch: string;
    desktopCitizen: boolean;
  } | null>(null);
  const [isWatcherEnabled, setIsWatcherEnabled] = useState(false);

  const [airGappedMode, setAirGappedMode] = useState(false);
  const [useQuantization, setUseQuantization] = useState(true);
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const [accentColor, setAccentColor] = useState("blue");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [peerCount, setPeerCount] = useState(2);

  useEffect(() => {
    const updatePeers = () => {
      const peerStatus =
        localStorage.getItem("snapclean_peer_status") || "idle";
      const swarmStatus =
        localStorage.getItem("snapclean_swarm_status") || "standby";
      let count = 0;
      if (peerStatus === "linked") count += 1;
      if (swarmStatus === "active") {
        count += 2;
      } else if (swarmStatus === "connecting") {
        count += 1;
      }
      setPeerCount(count);
    };
    updatePeers();
    const interval = setInterval(updatePeers, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    idleSweeper.init();

    // Initialize the Tauri local SQLite backend and patch IndexedDB indexes on app startup
    const initTauriDb = async () => {
      try {
        await SystemAPI.initDb();
        console.log("System DB initialized successfully.");
      } catch (err) {
        console.error("Failed to initialize System DB:", err);
      }

      // Check if DB Auto-Heal is enabled on startup (default is true)
      const shouldHeal = localStorage.getItem('snapclean_startup_autoheal') !== 'false';
      if (shouldHeal) {
        try {
          // Find existing photo records that omission of isDeleted or isPrivate broke indexing for
          const uninitialized = await db.photos
            .filter((p) => p.isDeleted === undefined)
            .toArray();
          if (uninitialized.length > 0) {
            console.log(
              `[HealDB] Repairing ${uninitialized.length} photo index properties.`,
            );
            await Promise.all(
              uninitialized.map((p) =>
                db.photos.update(p.id!, {
                  isDeleted: 0,
                  isPrivate: p.isPrivate !== undefined ? p.isPrivate : 0,
                }),
              ),
            );
            console.log(`[HealDB] Photo database repaired.`);
          }
        } catch (e) {
          console.error("[HealDB] Error patching uninitialized photo fields:", e);
        }
      } else {
        console.log("[HealDB] Database auto-heal on startup bypassed by user preferences.");
      }
    };

    // Execute all startup behaviors sequentially and gracefully
    const runStartupAutomationFlow = async () => {
      // 1. Core DB Init and optional heal
      await initTauriDb();

      // 2. Real-time Watcher (default: true)
      const autowatcher = localStorage.getItem('snapclean_startup_autowatcher') !== 'false';
      if (autowatcher && SystemAPI.isTauri() && watchPaths.length > 0) {
        watchPaths.forEach(async (path) => {
          try {
            await SystemAPI.startWatcher(path);
            console.log(`[Startup] Watcher started for: ${path}`);
          } catch (err) {
            console.error(`[Startup] Failed to start watcher for ${path}:`, err);
          }
        });
      }

      // 3. Auto-Cleanup / Maintenance (default: false)
      const autocleanup = localStorage.getItem('snapclean_startup_autocleanup') === 'true';
      if (autocleanup) {
        try {
          const res = await SystemAPI.runMaintenance();
          addNotification(
            language === "ko" ? "시작 시 자동 디스크 무결성 정리 완료" : "Startup Auto-Maintenance Complete",
            language === "ko" 
              ? `데이터 무결성: ${res.integrity}, 제거된 오르판 좀비 파일: ${res.phantom_files_removed}개` 
              : `Integrity: ${res.integrity}, Purged ${res.phantom_files_removed} orphan records.`,
            "success"
          );
          refreshDBCount();
        } catch (e) {
          console.error("[Startup] Maintenance execution failure:", e);
        }
      }

      // 4. Auto-Scan on Startup (default: false)
      const autoscan = localStorage.getItem('snapclean_startup_autoscan') === 'true';
      if (autoscan && watchPaths.length > 0) {
        setTimeout(() => {
          addNotification(
            language === "ko" ? "시작 시 자동 디렉토리 스캔 개시" : "Startup Auto-Scan Initiated",
            language === "ko" ? "등록된 감시 경로에 대해 자동 인덱싱 연산을 가동합니다." : "Automatically scanning all monitored paths on app start.",
            "info"
          );
          handleStartScan(watchPaths);
        }, 1500);
      }
    };

    runStartupAutomationFlow();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      idleSweeper.destroy();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any)._isScanningActive = scanning;
    }
  }, [scanning]);

  const [smartQuery, setSmartQuery] = useState<SmartQuery | null>(null);
  const [orgMode, setOrgMode] = useState<"move" | "copy">("copy");
  const [showSystemTray, setShowSystemTray] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const [isAiKeyModalOpen, setIsAiKeyModalOpen] = useState(false);
  const [aiKeyFeatureName, setAiKeyFeatureName] = useState<string | undefined>(undefined);

  const handleSmartSearch = async () => {
    if (!searchQuery || !isOnline) return;
    if (!hasAiApiKey()) {
      setAiKeyFeatureName(language === "ko" ? "AI 스마트 검색" : "AI Smart Search");
      setIsAiKeyModalOpen(true);
      return;
    }
    setIsProcessingSmartQuery(true);
    try {
      const result = await expandSmartQuery(searchQuery);
      setSmartQuery(result);
      if (result.keywords.length > 0) {
        setSearchQuery(result.keywords.join(" "));
      }
      addNotification("Smart Search", `Intent: ${result.intent}`, "info");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingSmartQuery(false);
    }
  };

  useEffect(() => {
    if (selectedPhoto) {
      const cat = selectedPhoto.category?.toLowerCase() || "";
      if (cat.includes("nature") || cat.includes("landscape"))
        setAccentColor("emerald");
      else if (cat.includes("people") || cat.includes("portrait"))
        setAccentColor("rose");
      else if (cat.includes("travel") || cat.includes("urban"))
        setAccentColor("amber");
      else if (cat.includes("work") || cat.includes("doc"))
        setAccentColor("indigo");
      else setAccentColor("blue");
    } else {
      setAccentColor("blue");
    }
  }, [selectedPhoto]);

  // Handle clicking outside the Metadata Inspector to close it
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        selectedPhoto &&
        inspectorRef.current &&
        !inspectorRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;

        // Bypass closing if click was targeting components designed to select/open/interact with photo records
        if (
          target.closest(".photo-card") ||
          target.closest(".memory-moment-clickable") ||
          target.closest("[data-photo-id]") ||
          target.closest(".leaflet-marker-icon") ||
          target.closest(".leaflet-popup") ||
          target.closest(".context-menu") ||
          target.closest(".context-menu-item") ||
          target.closest(".leaflet-container") ||
          target.closest("button") || // any control buttons on the page
          target.closest(".ignore-outside-click")
        ) {
          return;
        }

        setSelectedPhotoId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [selectedPhoto]);
  // Global UI Persistence & State Bridges (Phase 16.1)
  useEffect(() => {
    if (selectedPhotoId) {
      const fetchSelected = async () => {
        let photo = libraryPhotos.find((p) => p.id === selectedPhotoId);
        if (!photo) {
          photo = await db.photos.get(selectedPhotoId);
        }

        if (photo) {
          let needsUpdate = false;
          const updated = { ...photo };

          const isPdf =
            photo.type === "application/pdf" ||
            photo.path?.toLowerCase().endsWith(".pdf");
          const isVideo =
            photo.type?.startsWith("video/") ||
            photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);

          if (!isPdf && !isVideo && (!photo.width || !photo.height)) {
            try {
              const thumbUrl = SystemAPI.getImageUrl(photo.path, "full");
              const thumbData = await ThumbnailGenerator.generate(thumbUrl);
              if (thumbData.width && thumbData.height) {
                updated.width = thumbData.width;
                updated.height = thumbData.height;
                needsUpdate = true;
              }
            } catch (e) {
              console.warn("Failed to on-demand extract dimensions", e);
            }
          } else if (isVideo && (!photo.width || !photo.height)) {
            updated.width = 1920;
            updated.height = 1080;
            needsUpdate = true;
          }

          if (
            !photo.cameraModel ||
            !photo.iso ||
            photo.iso === 0 ||
            photo.fNumber === undefined
          ) {
            try {
              const exif = await SystemAPI.extractExif(photo.path);
              if (exif) {
                updated.cameraModel =
                  exif.camera_model ||
                  updated.cameraModel ||
                  "Web Browser Camera";
                updated.iso =
                  exif.iso !== undefined ? exif.iso : updated.iso || 100;
                updated.fNumber =
                  exif.f_number !== undefined
                    ? exif.f_number
                    : updated.fNumber || 2.8;
                updated.exposureTime =
                  exif.exposure_time !== undefined
                    ? exif.exposure_time
                    : updated.exposureTime || 1 / 125;
                updated.focalLength =
                  exif.focal_length !== undefined
                    ? exif.focal_length
                    : updated.focalLength || 35;
                needsUpdate = true;
              }
            } catch (e) {
              console.warn("Failed to on-demand extract EXIF", e);
            }
          }

          if (needsUpdate) {
            await db.photos.update(photo.id!, updated);
            setSelectedPhoto(updated);
            setTimeout(() => {
              loadLibrary();
            }, 100);
          } else {
            setSelectedPhoto(photo);
          }
        }
      };
      fetchSelected();
    } else {
      setSelectedPhoto(null);
    }
  }, [selectedPhotoId, libraryPhotos, loadLibrary]);

  const [onnxInfo, setOnnxInfo] = useState<{
    availableProviders: string[];
    activeProvider: string;
    modelStatus: string;
    vramUsage: string;
  } | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [dbEngineInfo, setDbEngineInfo] = useState<{
    engine: string;
    wal: boolean;
    avgQueryTime: string;
    journalMode: string;
  } | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [watchPaths, setWatchPaths] = useState<string[]>(() => {
    const saved = localStorage.getItem("snapclean_watch_paths");
    return saved ? JSON.parse(saved) : ["/users/me/pictures"];
  });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    photo: Photo;
  } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  const handleContextMenu = (e: React.MouseEvent, photo: PhotoRecord) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, photo });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) closeContextMenu();
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [contextMenu]);

  const workerRef = useRef<Worker | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    localStorage.setItem("snapclean_watch_paths", JSON.stringify(watchPaths));
  }, [watchPaths]);

  const addWatchPath = async (path: string) => {
    if (watchPaths.includes(path)) return;
    setWatchPaths((prev) => [...prev, path]);
    if (SystemAPI.isTauri()) {
      await SystemAPI.startWatcher(path);
    }
    addNotification(
      t("watcherAdded"),
      t("nowMonitoring").replace("{{path}}", path),
      "success",
    );
  };

  const removeWatchPath = async (path: string) => {
    setWatchPaths((prev) => prev.filter((p) => p !== path));
    if (SystemAPI.isTauri()) {
      await SystemAPI.stopWatching(path);
    }
    addNotification(
      t("watcherRemoved"),
      t("stoppedMonitoring").replace("{{path}}", path),
      "info",
    );
  };

  useEffect(() => {
    if (isWatcherEnabled) {
      const interval = setInterval(() => {
        if (Math.random() > 0.9) {
          addNotification(
            t("backgroundInsight"),
            t("backgroundInsightDesc"),
            "info",
          );
        }
      }, 120000);
      return () => clearInterval(interval);
    }
  }, [isWatcherEnabled]);

  // Global Hotkeys (Phase 14.1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Cmd/Ctrl + S to Scan
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleStartScan();
      }
      // Cmd/Ctrl + F to Search
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setActiveTab("library");
        setTimeout(() => {
          const searchInput = document.querySelector(
            'input[type="text"]',
          ) as HTMLInputElement;
          searchInput?.focus();
        }, 50);
      }
      // Shift + Number for Tab Switching
      if (e.shiftKey && e.key.match(/^[1-9]$/)) {
        const tabs = [
          "dashboard",
          "duplicates",
          "burst",
          "library",
          "trash",
        ];
        const index = parseInt(e.key) - 1;
        if (index < tabs.length) {
          setActiveTab(tabs[index]);
        }
      }
      // Delete key for Trash
      if (e.key === "Delete" && selectedPhotoIds.length > 0) {
        deleteFromDisk(selectedPhotoIds);
        setSelectedPhotoIds([]);
      }
      // Esc to close command palette
      if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIds, filteredLibraryPhotos]);

  // Sync Stats
  useEffect(() => {
    const updateStats = async () => {
      const count = await db.photos.count();
      setDbCount(count);
    };
    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => {
      clearInterval(interval);
      workerRef.current?.terminate();
    };
  }, []);

  const handleSelectFolder = async () => {
    const isMobileDevice =
      typeof window !== "undefined" &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
        window.innerWidth < 768);

    // Call directory picker directly to preserve active user activation gesture
    const paths = await SystemAPI.selectDirectory(true);
    if (paths && (!Array.isArray(paths) || paths.length > 0)) {
      const pathsArray = Array.isArray(paths) ? paths : [paths];
      setSelectedPaths(pathsArray);

      const webFiles = (window as any).__webFiles as (FileList | File[]) | undefined;
      const fileCount = webFiles ? webFiles.length : 0;

      if (fileCount > 0) {
        addNotification(
          language === "ko"
            ? isMobileDevice
              ? "📱 모바일 사진 색인 시작"
              : "📂 선택된 폴더 직접 탐색 시작"
            : isMobileDevice
              ? "📱 Direct Photo Scan Started"
              : "📂 Direct Folder Scan Started",
          language === "ko"
            ? `선택한 대상에서 ${fileCount}개 파일을 기기에서 직접 검색 및 색인 분석합니다.`
            : `Directly scanning and indexing ${fileCount} files from the selected folder.`,
          "info",
        );
      } else {
        addNotification(
          language === "ko" ? "📂 폴더 선택 완료" : "📂 Folder Selected",
          language === "ko"
            ? `${pathsArray.join(", ")} 경로에서 파일 직접 탐색 및 검색을 시작합니다.`
            : `Directly scanning files from ${pathsArray.join(", ")}...`,
          "info",
        );
      }

      handleStartScan(pathsArray);
    } else {
      // User cancelled or selection was empty
      addNotification(
        language === "ko" ? "폴더 선택 취소" : "Folder Selection Cancelled",
        language === "ko"
          ? "폴더 선택이 취소되었습니다. 스마트폰에서는 [갤러리/사진 직접 선택]으로 여러 장을 선택하시거나, PC 브라우저에서 폴더를 지정해주세요."
          : "Folder selection cancelled. On mobile, choose 'Gallery / Photos Direct' to select photos, or select a folder on desktop.",
        "info"
      );
    }
  };

  const handleSelectPhotos = async () => {
    const paths = await SystemAPI.selectFiles("image/*,video/*");
    if (paths) {
      const pathsArray = Array.isArray(paths) ? paths : [paths];
      setSelectedPaths(pathsArray);

      const webFiles = (window as any).__webFiles as (FileList | File[]) | undefined;
      const fileCount = webFiles ? webFiles.length : 0;

      if (fileCount > 0) {
        addNotification(
          language === "ko"
            ? "🖼️ 갤러리 사진 직접 탐색 시작"
            : "🖼️ Direct Photos Scan Started",
          language === "ko"
            ? `선택한 ${fileCount}장의 사진을 기기에서 직접 분석 및 중복 검색합니다.`
            : `Directly scanning and analyzing ${fileCount} selected photos.`,
          "info",
        );
        handleStartScan(pathsArray);
      }
    }
  };

  const handleSelectDirectory = () => {
    if (SystemAPI.isTauri()) {
      handleSelectFolder();
    } else {
      setShowScanSourceModal(true);
    }
  };

  const cameraModels = useMemo(() => {
    const models = new Set<string>();
    libraryPhotos.forEach((p) => {
      if (p.cameraModel && p.cameraModel.trim() !== "")
        models.add(p.cameraModel);
    });
    return Array.from(models).sort();
  }, [libraryPhotos]);

  const accentClasses: Record<string, string> = {
    blue: "bg-blue-600 shadow-blue-600/20",
    emerald: "bg-emerald-600 shadow-emerald-600/20",
    rose: "bg-rose-600 shadow-rose-600/20",
    amber: "bg-amber-600 shadow-amber-600/20",
    indigo: "bg-indigo-600 shadow-indigo-600/20",
  };

  return (
    <div className="flex h-[100dvh] bg-[#0f172a] text-slate-200 overflow-hidden font-sans flex-col">
      {/* Native-style Frameless Title Bar (Roadmap Phase 15.1) */}
      <div className="h-10 bg-slate-900/90 hidden lg:flex items-center justify-between px-4 border-b border-white/5 select-none sticky top-0 z-50 backdrop-blur-xl shrink-0 group title-bar">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 px-1">
            <button
              className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110 transition-all flex items-center justify-center group/btn cursor-pointer"
              onClick={() => setShowExitConfirm(true)}
            >
              <X
                size={6}
                className="text-black/40 opacity-0 group-hover/btn:opacity-100"
              />
            </button>
            <button className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-110 transition-all cursor-default" />
            <button className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-110 transition-all cursor-default" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <span className="text-[10px] font-bold text-slate-300 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
            <Fingerprint size={12} className="text-blue-500 animate-pulse" />{" "}
            SNAPCLEAN <span className="text-blue-500/50">PRO</span>
          </span>
        </div>

        <div
          className="flex-1 h-full drag-handle mx-4 flex items-center justify-center cursor-move"
          data-tauri-drag-region
          onMouseDown={() => {
            if (scanning && !isPaused) {
              handlePauseScan();
            }
          }}
          onMouseUp={() => {
            if (scanning && isPaused) {
              handleResumeScan();
            }
          }}
          onMouseLeave={() => {
            if (scanning && isPaused) {
              handleResumeScan();
            }
          }}
        >
          <div
            data-tauri-drag-region
            className="bg-white/5 px-3 py-0.5 rounded-full border border-white/5 text-[9px] text-slate-500 font-medium"
          >
            {activeTab.toUpperCase()} • {dbCount} ASSETS INDEXED
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded border border-white/5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
            />
            <span className="text-[8px] text-slate-400 uppercase font-black">
              {isOnline ? "Network Core Active" : "Offline Mode"}
            </span>
          </div>

          {hasUpdate ? (
            <button
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all font-mono font-bold text-[10px] tracking-wide cursor-pointer shadow-md shadow-amber-500/10 animate-pulse"
              title={
                language === "ko"
                  ? `새 버전 v${latestVersion} 업데이트 가능 - 클릭하여 다운로드`
                  : `New update v${latestVersion} available - Click to download`
              }
            >
              <Download size={11} className="text-amber-400" />
              <span>v{latestVersion} UPDATE</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPatchNotes(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all font-mono font-bold text-[10px] tracking-wide cursor-pointer shadow-sm"
              title={
                language === "ko"
                  ? "공식 패치노트 및 버전 정보 보기"
                  : "View Patch Notes & Build Info"
              }
            >
              <Sparkles size={11} className="text-amber-400 animate-pulse" />
              <span>v{APP_VERSION_INFO.version}</span>
              <span className="hidden sm:inline text-[9px] text-slate-400 font-sans">
                {language === "ko" ? "패치노트" : "Changelog"}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowMultiplatformModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all font-semibold text-[10px] tracking-wide cursor-pointer shadow-sm"
            title={language === "ko" ? "PC 및 모바일(Android/iPhone) 설치 파일 센터" : "Install on PC, Android, or iPhone"}
          >
            <Smartphone size={11} className="text-emerald-400" />
            <span>{language === "ko" ? "앱 설치 / 다운로드" : "Install App"}</span>
          </button>

          {isAiConfigured ? (
            <button
              onClick={() => {
                setAiKeyFeatureName(undefined);
                setIsAiKeyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 transition-all font-semibold text-[10px] tracking-wide cursor-pointer shadow-xs shadow-purple-500/20"
              title={
                language === "ko"
                  ? "AI 기능 활성화됨 (클릭하여 API 키 관리 및 해제)"
                  : "AI Active (Click to manage or remove API key)"
              }
            >
              <Sparkles size={11} className="text-purple-300 animate-pulse" />
              <span>{language === "ko" ? "✨ AI 활성화됨" : "✨ AI Active"}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setAiKeyFeatureName(undefined);
                setIsAiKeyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-purple-500/15 text-slate-300 hover:text-purple-200 border border-white/10 hover:border-purple-400/30 transition-all font-semibold text-[10px] tracking-wide cursor-pointer"
              title={
                language === "ko"
                  ? "API 키를 등록하면 AI 전용 기능(인물 분류, 추억 앨범, 화질 복원, 스마트 검색)이 활성화됩니다"
                  : "Register an API key to reveal AI features"
              }
            >
              <Sparkles size={11} className="text-slate-400" />
              <span>{language === "ko" ? "AI 기능 켜기 (API 키 등록)" : "Enable AI (API Key)"}</span>
            </button>
          )}

          <button
            onClick={() => setLanguage(language === "en" ? "ko" : "en")}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all uppercase font-black text-[9px] tracking-widest"
          >
            {language === "en" ? "ENG" : "KOR"}
            <RefreshCw
              size={10}
              className="group-hover:rotate-180 transition-transform duration-500"
            />
          </button>
          {systemInfo && (
            <>
              <span className="hidden md:inline">
                SYSTEM: {systemInfo.platform.toUpperCase()}
              </span>
              <button
                onClick={() => setShowSystemTray(!showSystemTray)}
                className="relative group flex items-center gap-2 hover:text-white transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500/70 font-bold flex items-center gap-1 uppercase">
                  {t("engineActive")}
                </span>
                {showSystemTray && (
                  <div className="absolute top-6 right-0 w-48 glass p-3 rounded-xl z-[100] text-left shadow-2xl border-white/20">
                    <p className="text-[10px] text-white font-bold mb-2 border-b border-white/10 pb-1 flex justify-between">
                      {t("systemTray")} <span>v1.0</span>
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Arch:</span>{" "}
                        <span className="text-white">{systemInfo.arch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Files:</span>{" "}
                        <span className="text-white">{dbCount}</span>
                      </div>
                      {dbEngineInfo && (
                        <div className="flex gap-2">
                          <div className="flex justify-between text-[8px] text-slate-500 border-t border-white/5 mt-1 pt-1">
                            <span>Native Engine:</span>{" "}
                            <span className="text-emerald-400">
                              {dbEngineInfo.journalMode}-Mode
                            </span>
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-500">
                            <span>Latency:</span>{" "}
                            <span className="text-white">
                              {dbEngineInfo.avgQueryTime}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Watcher:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsWatcherEnabled(!isWatcherEnabled);
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded ${isWatcherEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}
                        >
                          {isWatcherEnabled ? "ACTIVE" : "DISABLED"}
                        </button>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const data = await SystemAPI.checkUpdates();
                          setModal({
                            type: data.available ? "confirm" : "alert",
                            title: data.available
                              ? "Update Available"
                              : "Up to Date",
                            message: data.available
                              ? `Version ${data.version} is ready to install (${data.size}). Changelog: ${data.changelog}`
                              : `SnapClean Pro (v1.2.4) is currently the latest stable version.`,
                            onConfirm: data.available
                              ? () => {
                                  window.location.reload();
                                }
                              : undefined,
                          });
                        }}
                        className="w-full py-1 text-[10px] border border-white/10 rounded-lg text-slate-300 hover:text-white"
                      >
                        Check for Updates
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSystemTray(false);
                          handleStartScan();
                        }}
                        className="w-full mt-2 py-1 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-500"
                      >
                        Trigger Rescan
                      </button>
                    </div>
                  </div>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop App Navigation */}
        <aside className="w-64 border-r border-white/10 hidden lg:flex flex-col p-6 gap-8 bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="text-white fill-white" size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
          </div>

          <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {navItems.map((item, idx) => {
              const isAiTab = Boolean(item.isAi);
              const isActive = activeTab === item.id;

              let buttonClass = "";
              if (isActive) {
                if (isAiTab && !isAiConfigured) {
                  buttonClass =
                    "bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-lg shadow-amber-500/10 font-bold";
                } else if (isAiTab && isAiConfigured) {
                  buttonClass =
                    "bg-purple-600 text-white border border-purple-400/40 shadow-lg shadow-purple-500/20 font-bold";
                } else {
                  buttonClass = `${accentClasses[accentColor] || accentClasses.blue} text-white shadow-lg font-bold`;
                }
              } else {
                if (isAiTab && !isAiConfigured) {
                  buttonClass =
                    "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300/90 border border-amber-500/25";
                } else if (isAiTab && isAiConfigured) {
                  buttonClass =
                    "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20";
                } else {
                  buttonClass =
                    "text-slate-400 hover:bg-white/5 border border-transparent";
                }
              }

              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isAiTab && !isAiConfigured) {
                      setAiKeyFeatureName(item.label);
                      setIsAiKeyModalOpen(true);
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${buttonClass}`}
                >
                  <item.icon
                    size={18}
                    className={
                      isAiTab
                        ? !isAiConfigured
                          ? "text-amber-400 shrink-0"
                          : "text-purple-400 shrink-0"
                        : "shrink-0"
                    }
                  />
                  <span className="font-medium truncate">{item.label}</span>

                  {isAiTab && (
                    <span
                      className={`ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                        !isAiConfigured
                          ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse"
                          : "bg-purple-500/25 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {!isAiConfigured ? (
                        <>
                          <Key size={10} className="text-amber-400 shrink-0" />
                          <span>{language === "ko" ? "Key 필요" : "Key Needed"}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={10} className="text-purple-300 shrink-0" />
                          <span>AI</span>
                        </>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-4">
            <div className="flex flex-col gap-2 relative">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  {t("folders")}
                </p>
                <div className="text-[8px] text-slate-500 font-medium italic">
                  Click to filter library
                </div>
              </div>
              {libraryPhotos.length === 0 ? (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[11px] text-slate-400 font-medium">
                    {t("noScannedFolders")}
                  </p>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <DirectoryTreeExplorer
                    tree={directoryTree}
                    onSelect={(path) =>
                      setSelectedFolders((prev) =>
                        prev.includes(path)
                          ? prev.filter((p) => p !== path)
                          : [...prev, path],
                      )
                    }
                    onScan={(path) => handleStartScan(path)}
                    selectedPaths={selectedFolders}
                  />
                </div>
              )}
            </div>

            {systemInfo && (
              <button
                onClick={async () => {
                  const data = await SystemAPI.getShellContext();
                  setModal({
                    type: "confirm",
                    title: t("shellContextTitle"),
                    message: t("shellContextMessage", {
                      action: data.action,
                      target: data.target,
                    }),
                    onConfirm: handleStartScan,
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-xl border border-white/5 transition-all text-center uppercase tracking-widest mb-4"
              >
                <MoreVertical size={14} className="rotate-90 text-blue-500" />
                {t("shellIngest")}
              </button>
            )}

            <div className="glass p-4 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12" />
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">
                {t("memoryStatus")}
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">
                  {dbCount.toLocaleString()} {t("indexed")}
                </span>
                <Database size={14} className="text-blue-400" />
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-blue-500 w-1/3" />
              </div>
              <button
                onClick={() => {
                  setModal({
                    type: "confirm",
                    title: "Factory Reset",
                    message: t("purgeConfirm"),
                    onConfirm: clearStorage,
                  });
                }}
                className="text-[10px] text-rose-400 hover:underline cursor-pointer"
              >
                {t("purgeIndex")}
              </button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Language / 언어
              </span>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${language === "en" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("ko")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${language === "ko" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                  KO
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto pb-32 lg:pb-0">
          <header className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 lg:p-6 bg-slate-950/90 backdrop-blur-2xl border-b border-white/10 shadow-xl mb-3 sm:mb-4 gap-3 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  className="lg:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
                  onClick={() => setMobileMenuOpen(true)}
                  title="Menu"
                >
                  <Menu size={20} />
                </button>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight capitalize text-white">
                  {t(activeTab as any)}
                </h2>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <PWAInstallButton language={language} />

              {peerCount > 0 && (
                <div
                  className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border group cursor-help transition-all bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  title="Cross-Device Heritage Sync Active"
                >
                  <Wifi size={14} className="animate-pulse shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline whitespace-nowrap">
                    {peerCount === 1
                      ? "1 Peer Active"
                      : `${peerCount} Peers Active`}
                  </span>
                  <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              )}

              {scanning && (
                <div className="shrink-0 flex items-center gap-3 bg-slate-900/90 border border-indigo-500/30 shadow-2xl backdrop-blur-md px-3 sm:px-4 py-2 rounded-xl w-full max-w-[560px] animate-fade-in">
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                        {isPaused ? (
                          <Pause size={12} className="text-amber-400 shrink-0" />
                        ) : (
                          <RefreshCw size={12} className="animate-spin text-blue-400 shrink-0" />
                        )}
                        {isPaused ? "Scan Paused" : t("deepScanning")}
                      </span>
                      <span className="text-[10px] sm:text-xs font-extrabold font-mono text-slate-100 tracking-tight bg-slate-950/60 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap shrink-0">
                        <span className="text-blue-400">{scanStats.processed.toLocaleString()}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-slate-300">{scanStats.total > 0 ? scanStats.total.toLocaleString() : "..."}</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden mb-1 border border-white/5 shrink-0 relative">
                      {scanStats.total > 0 ? (
                        <div
                          className={`h-full transition-all duration-300 ${isPaused ? "bg-amber-500" : "bg-linear-to-r from-blue-500 to-indigo-500"}`}
                          style={{
                            width: `${Math.min(100, Math.max(1, Math.round((scanStats.processed / scanStats.total) * 100)))}%`,
                          }}
                        />
                      ) : (
                        <div className="h-full w-full bg-linear-to-r from-blue-500/30 via-indigo-500 to-blue-500/30 animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 border-l border-white/10 pl-2">
                    {scanStats.stage === 'deep_analysis' && (
                      <button
                        onClick={handleSkipDeepScan}
                        className="px-2 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                        title={language === "ko" ? "AI 정밀분석 건너뛰기" : "Skip AI Deep Scan"}
                      >
                        <FastForward size={13} fill="currentColor" />
                        <span className="hidden md:inline">{language === "ko" ? "건너뛰기" : "Skip"}</span>
                      </button>
                    )}
                    {isPaused ? (
                      <button
                        onClick={handleResumeScan}
                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                        title="Resume Scan"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        onClick={handlePauseScan}
                        className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors cursor-pointer"
                        title="Pause Scan"
                      >
                        <Pause size={14} fill="currentColor" />
                      </button>
                    )}
                    <button
                      onClick={handleStopScanRequest}
                      disabled={isStopped}
                      className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                      title="Stop Scan"
                    >
                      <Square size={14} fill="currentColor" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setShowScanSettings(!showScanSettings)}
                  className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
                    showScanSettings
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                  title={
                    language === "ko"
                      ? "스캔 설정 (파일 형식 및 고속/전수 모드)"
                      : "Scan Settings (File formats & Quick/Deep mode)"
                  }
                >
                  <SlidersHorizontal size={15} className="shrink-0 text-indigo-400" />
                  <span className="whitespace-nowrap">
                    {language === "ko" ? "스캔 설정" : "Settings"}
                  </span>
                  {scanFormats.length < 22 ? (
                    <span className="shrink-0 bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full flex items-center justify-center">
                      {scanFormats.length}
                    </span>
                  ) : (
                    <span className="shrink-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full flex items-center justify-center whitespace-nowrap">
                      {language === "ko" ? "전체" : "All"}
                    </span>
                  )}
                </button>

                <button
                  onClick={() =>
                    selectedPaths.length > 0
                      ? handleStartScan(selectedPaths)
                      : handleSelectDirectory()
                  }
                  disabled={scanning || scanFormats.length === 0}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-600/25 cursor-pointer transition-all active:scale-95"
                >
                  {scanning ? (
                    <RefreshCw className="shrink-0 animate-spin" size={15} />
                  ) : (
                    <Zap size={15} className="shrink-0 text-amber-300 fill-amber-300" />
                  )}
                  <span className="whitespace-nowrap">
                    {scanning ? t("processingBatch") : t("scanFiles")}
                  </span>
                </button>
              </div>
            </div>
          </header>

          <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-4 sm:gap-8">
            {/* Progressive Discovery & Smart Background Sync Banner */}
            <ProgressiveDiscoveryBanner
              scanning={scanning}
              scanStats={scanStats}
              bgSyncConfig={bgSyncConfig}
              bgSyncStatus={bgSyncStatus}
              onReviewDiscovered={() => setActiveTab("duplicates")}
              onTriggerSync={triggerIncrementalSync}
              onRequestNotification={requestNotificationPermission}
              onOpenSyncSettings={() => setActiveTab("sync")}
            />

            {scanning && (
              <div className="w-full bg-linear-to-r from-slate-900/90 via-indigo-950/50 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden animate-fade-in shrink-0">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl border ${isPaused ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                      <Search size={22} className={isPaused ? "" : "animate-pulse"} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base md:text-lg font-bold text-white tracking-tight">
                          {language === "ko" ? "디스크 / 폴더 탐색 및 스캔 진행 중" : "Disk / Folder Scan in Progress"}
                        </h3>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${isPaused ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"}`}>
                          {isPaused ? (language === "ko" ? "일시정지" : "PAUSED") : (language === "ko" ? "진행 중" : "SCANNING")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-md md:max-w-xl">
                        {selectedPaths.length > 0 ? selectedPaths.join(", ") : (language === "ko" ? "선택한 경로 탐색 중..." : "Scanning selected path...")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    {scanStats.speed !== undefined && scanStats.speed > 0 && (
                      <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
                        <div className="flex items-center gap-1 text-xs font-black font-mono text-indigo-300">
                          <Zap size={13} className="text-indigo-400 animate-pulse" />
                          <span>{scanStats.speed} {language === "ko" ? "개/초" : "files/s"}</span>
                        </div>
                        {scanStats.etaSeconds !== undefined && scanStats.etaSeconds > 0 && (
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock size={10} className="text-slate-400" />
                            <span>
                              {language === "ko" ? "남은 시간:" : "ETA:"} {scanStats.etaSeconds > 60 
                                ? `${Math.floor(scanStats.etaSeconds / 60)}${language === "ko" ? "분 " : "m "}${scanStats.etaSeconds % 60}${language === "ko" ? "초" : "s"}` 
                                : `${scanStats.etaSeconds}${language === "ko" ? "초" : "s"}`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-right">
                      <div className="text-xl md:text-2xl font-black font-mono text-white tracking-tight">
                        {scanStats.total > 0 ? `${Math.min(100, Math.round((scanStats.processed / scanStats.total) * 100))}%` : "---"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {scanStats.processed.toLocaleString()} / {scanStats.total > 0 ? scanStats.total.toLocaleString() : "..."} {language === "ko" ? "개 파일" : "files"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                      {isPaused ? (
                        <button
                          onClick={handleResumeScan}
                          className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all cursor-pointer"
                          title={language === "ko" ? "스캔 재개" : "Resume Scan"}
                        >
                          <Play size={18} fill="currentColor" />
                        </button>
                      ) : (
                        <button
                          onClick={handlePauseScan}
                          className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                          title={language === "ko" ? "스캔 일시정지" : "Pause Scan"}
                        >
                          <Pause size={18} fill="currentColor" />
                        </button>
                      )}
                      <button
                        onClick={handleStopScanRequest}
                        disabled={isStopped}
                        className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-all cursor-pointer disabled:opacity-30"
                        title={language === "ko" ? "스캔 중단" : "Stop Scan"}
                      >
                        <Square size={18} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 p-0.5">
                  {scanStats.total > 0 ? (
                    <div
                      className={`h-full rounded-full transition-all duration-300 shadow-lg ${
                        isPaused
                          ? "bg-amber-500"
                          : "bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-blue-500/30"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(1, Math.round((scanStats.processed / scanStats.total) * 100)))}%`,
                      }}
                    />
                  ) : (
                    <div className="h-full rounded-full bg-linear-to-r from-blue-500/30 via-indigo-500 to-blue-500/30 animate-pulse w-full" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2.5">
                  <span className="truncate max-w-[80%]" title={scanStats.currentPath}>
                    {isStopped
                      ? (language === "ko" ? "스캔 정리 중..." : "Winding down...")
                      : isPaused
                        ? (language === "ko" ? "일시정지 중..." : "Standing by...")
                        : scanStats.currentPath || (language === "ko" ? "폴더 검색 및 파일 인덱싱 준비 중..." : "Preparing folder scan & file index...")}
                  </span>
                  <span className="shrink-0 text-[10px] text-indigo-400 font-sans font-bold">
                    SnapClean Engine
                  </span>
                </div>
              </div>
            )}
            {orgProgress && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
                <div className="glass p-8 rounded-[2.5rem] border-white/10 w-full max-w-lg shadow-2xl text-center">
                  <div className="relative w-32 h-32 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FolderPlus size={40} className="text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white italic uppercase mb-2">
                    Isolation in Progress
                  </h3>
                  <p className="text-slate-400 text-sm mb-8">
                    {orgProgress.status}
                  </p>

                  <div className="bg-white/5 rounded-2xl p-4 mb-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      <span>Cluster Progress</span>
                      <span>
                        {Math.round(
                          (orgProgress.current / orgProgress.total) * 100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(orgProgress.current / orgProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono italic">
                    Grouping: {orgProgress.current} / {orgProgress.total} units
                  </p>
                </div>
              </div>
            )}

            {activeTab === "dashboard" && (
              <DashboardTab
                memoryMoment={memoryMoment}
                setSelectedPhotoId={setSelectedPhotoId}
                dbCount={dbCount}
                totalWaste={
                  sortedGroups.reduce(
                    (acc, g) => acc + (g.redundantSize || 0),
                    0,
                  ) + trashPhotos.reduce((acc, p) => acc + p.size, 0)
                }
                groups={sortedGroups}
                categoryStats={categoryStats}
                formatStats={formatStats}
                dateStats={dateStats}
                onOpenPhotobook={() => setActiveTab("photobook")}
              />
            )}

            {activeTab === "duplicates" && (
              <DuplicatesTab
                type="exact"
                sortedGroups={sortedGroups}
                autoResolveRule={autoResolveRule}
                setAutoResolveRule={setAutoResolveRule}
                dupSortBy={dupSortBy}
                setDupSortBy={setDupSortBy}
                organizeDuplicates={organizeDuplicates}
                orgTargetFolder={orgTargetFolder}
                resolveAllGroups={resolveAllGroups}
                resolveDuplicate={resolveDuplicate}
                backupEnabled={backupEnabled}
                setBackupEnabled={setBackupEnabled}
                backupFolder={backupFolder}
                setBackupFolder={setBackupFolder}
                selectedPhotoId={selectedPhotoId}
                setSelectedPhotoId={setSelectedPhotoId}
                addNotification={addNotification}
                directoryTree={directoryTree}
                originalHandling={originalHandling}
                setOriginalHandling={setOriginalHandling}
                isAiConfigured={isAiConfigured}
                dedupeOptions={dedupeOptions}
                setDedupeOptions={setDedupeOptions}
                onRescanDuplicates={detectDuplicates}
                onCreatePhotobook={() => setActiveTab("photobook")}
              />
            )}

            {activeTab === "photobook" && (
              <PhotobookTab
                libraryPhotos={libraryPhotos}
                isAiConfigured={isAiConfigured}
                onOpenAiKeyModal={() => {
                  setAiKeyFeatureName(language === "ko" ? "AI 감성 스토리 작가" : "AI Storyteller");
                  setIsAiKeyModalOpen(true);
                }}
                onSwitchToDuplicates={() => setActiveTab("duplicates")}
              />
            )}

            {activeTab === "library" && (
              <LibraryTab
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSmartSearch={handleSmartSearch}
                isProcessingSmartQuery={isProcessingSmartQuery}
                isOnline={true}
                isAiConfigured={isAiConfigured}
                syncing={syncing}
                handleSyncLibrary={handleSyncLibrary}
                categoryStats={categoryStats}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                selectedQualityTags={selectedQualityTags}
                setSelectedQualityTags={setSelectedQualityTags}
                selectedFormats={selectedFormats}
                setSelectedFormats={setSelectedFormats}
                dateStats={dateStats}
                selectedYears={selectedYears}
                setSelectedYears={setSelectedYears}
                locations={locations}
                selectedLocations={selectedLocations}
                setSelectedLocations={setSelectedLocations}
                handleSelectLocation={handleSelectLocation}
                selectedSizes={selectedSizes}
                setSelectedSizes={setSelectedSizes}
                selectedOrientations={selectedOrientations}
                setSelectedOrientations={setSelectedOrientations}
                cameraModels={cameraModels}
                selectedCameras={selectedCameras}
                setSelectedCameras={setSelectedCameras}
                filteredLibraryPhotos={filteredLibraryPhotos}
                selectedPhotoIds={selectedPhotoIds}
                setSelectedPhotoIds={setSelectedPhotoIds}
                showMap={showMap}
                setShowMap={setShowMap}
                libraryPhotos={libraryPhotos}
                isMultiSelectMode={isMultiSelectMode}
                setIsMultiSelectMode={setIsMultiSelectMode}
                taggingProgress={taggingProgress}
                handleBulkTagging={handleBulkTagging}
                handleEnhance={handleEnhance}
                handleContextMenu={(e, id) => {
                  const photo = libraryPhotos.find((p) => p.id === id);
                  if (photo) handleContextMenu(e, photo);
                }}
                setSelectedPhotoId={setSelectedPhotoId}
                selectedPhotoId={selectedPhotoId}
                setModal={setModal}
                handleOrganize={handleOrganize}
                handleBatchRename={handleBatchRename}
                addNotification={addNotification}
              />
            )}

            {activeTab === "people" && isAiConfigured && (
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                      <Users className="text-indigo-500" />
                      {t("peopleHub")}
                    </h2>
                    <p className="text-slate-400 mt-1 max-w-lg">
                      AI Vision Core has automatically clustered your assets by
                      detected facial vectors and biometric landmarks.
                    </p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <span className="text-xs text-slate-500 block mb-1">
                      {t("confidence")}
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {(
                        peopleGroups.reduce((acc, g) => acc + g.confidence, 0) /
                        (peopleGroups.length || 1)
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {peopleGroups.map((cluster, idx) => {
                    const mainPhoto = cluster.photos[0];
                    const isMainPdf =
                      mainPhoto &&
                      (mainPhoto.type === "application/pdf" ||
                        mainPhoto.path?.toLowerCase().endsWith(".pdf"));
                    const thumbUrl =
                      mainPhoto && !isMainPdf
                        ? mainPhoto.thumbnail && mainPhoto.thumbnail.size > 0
                          ? libraryManager.getBlobUrl(mainPhoto.path, () =>
                              URL.createObjectURL(mainPhoto.thumbnail!),
                            )
                          : SystemAPI.getImageUrl(mainPhoto.path, "thumbnail")
                        : null;

                    return (
                      <motion.div
                        key={`${cluster.id}-${idx}`}
                        whileHover={{ y: -5 }}
                        className="glass rounded-[2rem] border-white/5 group hover:border-indigo-500/30 transition-all overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex items-center gap-4 mb-8">
                            <div className="relative">
                              <div
                                className={`w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl font-black text-indigo-400 border border-indigo-500/20 font-mono italic z-10 relative overflow-hidden`}
                              >
                                {isMainPdf ? (
                                  <FileText
                                    size={24}
                                    className="text-red-500"
                                  />
                                ) : thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    alt={cluster.name}
                                  />
                                ) : (
                                  cluster.name[0]
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-slate-900 z-20 flex items-center justify-center">
                                <ShieldCheck size={10} className="text-white" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-black text-xl text-white italic uppercase truncate tracking-tight">
                                {cluster.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">
                                {cluster.photos.length} {t("matchingPortraits")}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-6">
                            {cluster.photos.slice(1, 4 + 1).map((p, pIdx) => {
                              const isItemPdf =
                                p.type === "application/pdf" ||
                                p.path?.toLowerCase().endsWith(".pdf");
                              const itemUrl = !isItemPdf
                                ? p.thumbnail && p.thumbnail.size > 0
                                   ? libraryManager.getBlobUrl(p.path, () =>
                                      URL.createObjectURL(p.thumbnail!),
                                    )
                                  : SystemAPI.getImageUrl(p.path, "thumbnail")
                                : null;

                              return (
                                <div
                                  key={`${cluster.id}-${p.id || p.originalId || "none"}-${pIdx}`}
                                  className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-white/5 group-hover:border-indigo-500/20 transition-all flex items-center justify-center"
                                >
                                  {isItemPdf ? (
                                    <FileText
                                      size={16}
                                      className="text-red-400"
                                    />
                                  ) : itemUrl ? (
                                    <img
                                      src={itemUrl}
                                      className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                                      referrerPolicy="no-referrer"
                                      alt=""
                                    />
                                  ) : null}
                                </div>
                              );
                            })}
                            {cluster.photos.length < 5 &&
                              Array.from({
                                length: 4 - (cluster.photos.length - 1),
                              }).map((_, i) => (
                                <div
                                  key={`${cluster.id}-${i}`}
                                  className="aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center"
                                >
                                  <Users size={12} className="text-slate-700" />
                                </div>
                              ))}
                          </div>

                          <button
                            onClick={() =>
                              renamePerson(cluster.id, cluster.name)
                            }
                            className="w-full py-3 bg-white/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center justify-center gap-2"
                          >
                            <Fingerprint size={14} /> {t("identifyIndividual")}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "trash" && (
              <TrashTab
                trashPhotos={trashPhotos}
                lastPurged={lastPurged}
                emptyTrash={emptyTrash}
                undoEmptyTrash={undoEmptyTrash}
                setModal={setModal}
                detectDuplicates={detectDuplicates}
                airGappedMode={airGappedMode}
                addNotification={addNotification}
              />
            )}
          </div>
        </main>

        <AnimatePresence>
          {showDiagnostics && (
            <DiagnosticsDashboard
              key="system-diagnostics-dashboard-overlay"
              onClose={() => setShowDiagnostics(false)}
              thermalThrottleActive={thermalThrottleActive}
              batteryStatus={batteryStatus}
            />
          )}
        </AnimatePresence>

        {/* Real-time Indexing Progress & Effects HUD */}
        <IndexingProgressHUD
          scanning={scanning}
          scanStats={scanStats}
          isPaused={isPaused}
          isStopped={isStopped}
          onPause={handlePauseScan}
          onResume={handleResumeScan}
          onStop={handleStopScanRequest}
          onSkipDeepScan={handleSkipDeepScan}
          onViewDuplicates={() => setActiveTab("duplicates")}
        />

        {/* Native-style Dialogs (Phase 15.1) */}
        {/* Real-time Notifications Overlay */}
        <div
          key="notifications-container"
          className="fixed bottom-20 lg:bottom-6 right-3 lg:right-6 left-3 sm:left-auto sm:max-w-md z-[9999] flex flex-col gap-2.5 pointer-events-none"
        >
          <AnimatePresence>
            {notifications.map((n, nIdx) => (
              <motion.div
                key={`${n.id}-${nIdx}`}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`pointer-events-auto w-full sm:min-w-[320px] p-3.5 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 transition-all ${
                  n.type === "success"
                    ? "bg-emerald-950/85 border-emerald-500/30 text-emerald-100 shadow-emerald-950/50"
                    : n.type === "warning"
                      ? "bg-amber-950/85 border-amber-500/30 text-amber-100 shadow-amber-950/50"
                      : n.type === "error"
                        ? "bg-rose-950/85 border-rose-500/30 text-rose-100 shadow-rose-950/50"
                        : "bg-slate-900/90 border-indigo-500/30 text-indigo-100 shadow-slate-950/50"
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    n.type === "success"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : n.type === "warning"
                        ? "bg-amber-500/20 text-amber-400"
                        : n.type === "error"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-indigo-500/20 text-indigo-400"
                  }`}
                >
                  {n.type === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : n.type === "warning" ? (
                    <AlertCircle size={18} />
                  ) : n.type === "error" ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <RefreshCw className="animate-spin" size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-wider mb-0.5 truncate">
                    {n.title}
                  </div>
                  <div className="text-[11px] sm:text-xs opacity-80 font-medium leading-relaxed">
                    {n.message}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.filter((notif) => notif.id !== n.id),
                    )
                  }
                  className="opacity-50 hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showScanSettings && (
            <div
              key="scan-settings-overlay"
              className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowScanSettings(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.25 }}
                className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] p-4 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col z-[501] overflow-hidden my-auto"
              >
                {/* Pinned Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={18}
                      className="text-indigo-400 animate-pulse"
                    />
                    <span className="text-sm font-black uppercase tracking-wider text-slate-100">
                      {language === "ko"
                        ? "스캔 설정 및 구성"
                        : "Scan Settings & Presets"}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowScanSettings(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 py-2 space-y-3.5 sm:space-y-4 min-h-0">
                  {/* Sub text */}
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {language === "ko"
                      ? "스캔 모드 및 탐색할 대상 파일 확장자들을 지정하세요. 선택한 프리셋과 확장자들만 분석 범위에 매핑되어 동작합니다."
                      : "Configure quick scan modes and file format filters. Selected options dictate scan analysis depth."}
                  </p>

                {/* Quick Scan Preset Selection Section */}
                <div className="flex flex-col gap-3 bg-slate-950/70 p-4 rounded-2xl border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-400 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                        {language === "ko" ? "Quick Scan (고속 스캔) 모드" : "Quick Scan Mode"}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${
                      quickScanMode
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10"
                        : "bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-purple-500/10"
                    }`}>
                      {quickScanMode
                        ? (language === "ko" ? "⚡ FAST MODE (고속 스캔 ON)" : "⚡ FAST MODE (Quick Scan)")
                        : (language === "ko" ? "🛡️ DEEP MODE (전수 검증)" : "🛡️ DEEP MODE (Full Parity)")}
                    </span>
                  </div>

                  {/* Visually Prominent Toggle Switch Bar */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
                    <div className="flex flex-col gap-0.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {language === "ko" ? "Quick Scan 스위치" : "Quick Scan Switch"}
                        </span>
                        <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded border ${
                          quickScanMode ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400" : "bg-purple-950/60 border-purple-500/30 text-purple-400"
                        }`}>
                          {quickScanMode ? "Fast Mode" : "Deep Mode"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {quickScanMode
                          ? (language === "ko" ? "무거운 비트롯 패리티 검사 생략 (최고 속도 색인)" : "Bypasses heavy bit-rot checks for ultra-fast scan speeds.")
                          : (language === "ko" ? "모든 데이터 블록 전수 패리티 무결성 검증 개시" : "Runs full parity verification & deep bit-rot integrity checks.")}
                      </p>
                    </div>

                    {/* Prominent Interactive Switch Button */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={quickScanMode}
                      onClick={() => {
                        const newMode = !quickScanMode;
                        setQuickScanMode(newMode);
                        addNotification(
                          language === "ko"
                            ? (newMode ? "⚡ Quick Scan: Fast Mode 활성화" : "🛡️ Quick Scan: Deep Mode 활성화")
                            : (newMode ? "⚡ Quick Scan: Fast Mode Enabled" : "🛡️ Quick Scan: Deep Mode Enabled"),
                          language === "ko"
                            ? (newMode ? "무거운 비트롯 패리티 검사를 생략하고 초고속으로 색인합니다." : "모든 데이터 블록의 이중 패리티 정합성 및 비트롯 손상을 전수 검증합니다.")
                            : (newMode ? "Heavy bit-rot checks skipped for ultra-fast scan speeds." : "Full parity verification & bit-rot integrity checks enabled."),
                          "info"
                        );
                      }}
                      className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                        quickScanMode
                          ? "bg-emerald-500 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/30"
                          : "bg-purple-600 shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/30"
                      }`}
                    >
                      <span className="sr-only">Toggle Quick Scan Mode</span>
                      <span
                        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-slate-950 shadow-md ring-1 ring-white/20 transition-all duration-300 ease-in-out flex items-center justify-center text-xs font-black ${
                          quickScanMode ? "translate-x-8 text-emerald-400" : "translate-x-0 text-purple-300"
                        }`}
                      >
                        {quickScanMode ? "⚡" : "🛡️"}
                      </span>
                    </button>
                  </div>

                  {/* Mode Card Selector grid */}
                  <div className="grid grid-cols-2 gap-2 mt-0.5">
                    {/* Fast Mode Toggle Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickScanMode(true);
                        addNotification(
                          language === "ko" ? "Quick Scan: Fast Mode 활성화" : "Quick Scan: Fast Mode Enabled",
                          language === "ko"
                            ? "무거운 비트롯 패리티 검사를 생략하고 초고속으로 색인합니다."
                            : "Heavy bit-rot checks skipped for ultra-fast scan speeds.",
                          "info"
                        );
                      }}
                      className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer ${
                        quickScanMode
                          ? "bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                          : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                          <Zap size={14} />
                          <span>Fast Mode</span>
                        </div>
                        {quickScanMode && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight">
                        {language === "ko"
                          ? "무거운 비트롯 검사 스킵으로 최상 속도 색인"
                          : "Skips heavy bit-rot checks for max scan speed."}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-300/80 bg-emerald-950/40 px-1.5 py-0.5 rounded w-max border border-emerald-500/20">
                        <span>⚡ Skip Bit-Rot</span>
                      </div>
                    </button>

                    {/* Deep Mode Toggle Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickScanMode(false);
                        addNotification(
                          language === "ko" ? "Quick Scan: Deep Mode 활성화" : "Quick Scan: Deep Mode Enabled",
                          language === "ko"
                            ? "모든 데이터 블록의 이중 패리티 정합성 및 비트롯 손상을 전수 검증합니다."
                            : "Full parity verification & bit-rot integrity checks enabled.",
                          "info"
                        );
                      }}
                      className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between gap-2 cursor-pointer ${
                        !quickScanMode
                          ? "bg-purple-500/15 border-purple-500/50 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30"
                          : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-purple-400">
                          <ShieldCheck size={14} />
                          <span>Deep Mode</span>
                        </div>
                        {!quickScanMode && <CheckCircle2 size={14} className="text-purple-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight">
                        {language === "ko"
                          ? "전수 이중 패리티 무결성 및 비트롯 정밀 검증"
                          : "Enables full parity & bit-rot verification."}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] font-mono text-purple-300/80 bg-purple-950/40 px-1.5 py-0.5 rounded w-max border border-purple-500/20">
                        <span>🛡️ Full Parity</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase pl-2">
                    {language === "ko" ? "일괄 조정" : "Bulk Adjust"}
                  </span>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() =>
                        setScanFormats([
                          "jpg",
                          "jpeg",
                          "png",
                          "webp",
                          "heic",
                          "avif",
                          "gif",
                          "mp4",
                          "mov",
                          "avi",
                          "mkv",
                          "webm",
                          "dng",
                          "cr2",
                          "cr3",
                          "nef",
                          "arw",
                          "orf",
                          "rw2"
                        ])
                      }
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-all cursor-pointer px-2.5 py-1 rounded-md hover:bg-white/5"
                    >
                      {language === "ko" ? "전체 선택" : "All"}
                    </button>
                    <span className="text-slate-700 text-[10px]">|</span>
                    <button
                      onClick={() => setScanFormats([])}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase transition-all cursor-pointer px-2.5 py-1 rounded-md hover:bg-white/5"
                    >
                      {language === "ko" ? "모두 해제" : "None"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Images Selection Group */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {language === "ko" ? "이미지 파일 (Images)" : "Images"}
                      </span>
                      <button
                        onClick={() => {
                          const imgs = [
                            "jpg",
                            "jpeg",
                            "png",
                            "webp",
                            "heic",
                            "avif",
                            "gif",
                          ];
                          const hasAllImgs = imgs.every((f) =>
                            scanFormats.includes(f),
                          );
                          if (hasAllImgs) {
                            setScanFormats(
                              scanFormats.filter((f) => !imgs.includes(f)),
                            );
                          } else {
                            setScanFormats([
                              ...new Set([...scanFormats, ...imgs]),
                            ]);
                          }
                        }}
                        className="text-[9px] text-slate-500 hover:text-slate-300 transition-all font-mono cursor-pointer"
                      >
                        Toggle
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        "jpg",
                        "jpeg",
                        "png",
                        "webp",
                        "heic",
                        "avif",
                        "gif",
                      ].map((ext) => {
                        const active = scanFormats.includes(ext);
                        return (
                          <button
                            key={ext}
                            onClick={() => {
                              if (active) {
                                setScanFormats(
                                  scanFormats.filter((f) => f !== ext),
                                );
                              } else {
                                setScanFormats([...scanFormats, ext]);
                              }
                            }}
                            className={`py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight uppercase transition-all border cursor-pointer ${
                              active
                                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400 shadow-sm shadow-indigo-500/10"
                                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            {ext}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Video Selection Group */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        {language === "ko" ? "동영상 파일 (Videos)" : "Videos"}
                      </span>
                      <button
                        onClick={() => {
                          const vids = ["mp4", "mov", "avi", "mkv", "webm"];
                          const hasAllVids = vids.every((f) =>
                            scanFormats.includes(f),
                          );
                          if (hasAllVids) {
                            setScanFormats(
                              scanFormats.filter((f) => !vids.includes(f)),
                            );
                          } else {
                            setScanFormats([
                              ...new Set([...scanFormats, ...vids]),
                            ]);
                          }
                        }}
                        className="text-[9px] text-slate-500 hover:text-slate-300 transition-all font-mono cursor-pointer"
                      >
                        Toggle
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {["mp4", "mov", "avi", "mkv", "webm"].map((ext) => {
                        const active = scanFormats.includes(ext);
                        return (
                          <button
                            key={ext}
                            onClick={() => {
                              if (active) {
                                setScanFormats(
                                  scanFormats.filter((f) => f !== ext),
                                );
                              } else {
                                setScanFormats([...scanFormats, ext]);
                              }
                            }}
                            className={`py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight uppercase transition-all border cursor-pointer ${
                              active
                                ? "bg-purple-600/20 border-purple-500/40 text-purple-400 shadow-sm shadow-purple-500/10"
                                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            {ext}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* RAW High-Res Group */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {language === "ko" ? "RAW 고화질 (RAW)" : "RAW Photo"}
                      </span>
                      <button
                        onClick={() => {
                          const raws = ["dng", "cr2", "cr3", "nef", "arw", "orf", "rw2"];
                          const hasAllRaws = raws.every((f) => scanFormats.includes(f));
                          if (hasAllRaws) {
                            setScanFormats(scanFormats.filter((f) => !raws.includes(f)));
                          } else {
                            setScanFormats([...new Set([...scanFormats, ...raws])]);
                          }
                        }}
                        className="text-[9px] text-slate-500 hover:text-slate-300 transition-all font-mono cursor-pointer"
                      >
                        Toggle
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["dng", "cr2", "cr3", "nef", "arw", "orf", "rw2"].map((ext) => {
                        const active = scanFormats.includes(ext);
                        return (
                          <button
                            key={ext}
                            onClick={() => {
                              if (active) {
                                setScanFormats(scanFormats.filter((f) => f !== ext));
                              } else {
                                setScanFormats([...scanFormats, ext]);
                              }
                            }}
                            className={`py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight uppercase transition-all border cursor-pointer ${
                              active
                                ? "bg-amber-600/20 border-amber-500/40 text-amber-400 shadow-sm shadow-amber-500/10"
                                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            {ext}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                </div>

                {/* Pinned Sticky Footer */}
                <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5 shrink-0 bg-slate-900 -mx-4 -mb-4 p-4 sm:-mx-6 sm:-mb-6 sm:p-6 rounded-b-3xl">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {language === "ko"
                        ? "스캔할 선택된 확장자 수:"
                        : "Selected format counts:"}
                    </span>
                    <span className="font-bold text-indigo-400 font-mono text-sm bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                      {scanFormats.length} / 19
                    </span>
                  </div>

                  {scanFormats.length === 0 ? (
                    <p className="text-[10.5px] text-rose-400 font-bold italic text-center">
                      {language === "ko"
                        ? "⚠️ 최소 한 개 이상의 파일 확장자를 지정하셔야 합니다."
                        : "⚠️ Select at least one file extension."}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center">
                      {language === "ko"
                        ? "* 선택하지 않는 파일형식은 분석 파일 검사에서 스킵됩니다."
                        : "* Unselected formats are fully skipped during analysis."}
                    </p>
                  )}

                  <button
                    onClick={() => setShowScanSettings(false)}
                    disabled={scanFormats.length === 0}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-2xl text-xs font-black uppercase text-white shadow-xl shadow-indigo-600/25 transition-all text-center cursor-pointer"
                  >
                    {language === "ko" ? "구성 설정 완료" : "Apply Filters"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {modal && (
            <div
              key="modal-overlay"
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-sm bg-[#1e293b]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl ring-1 ring-white/5"
              >
                {/* Native Modal Title Bar */}
                <div className="h-9 bg-white/5 border-b border-white/5 flex items-center px-4 justify-between bg-slate-900/50">
                  <div className="flex gap-1.5 grayscale opacity-50">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {modal.type === "organize" && language === "ko"
                      ? "필터 및 카테고리별 파일 정리"
                      : modal.title}
                  </span>
                  <div className="w-12" />
                </div>

                <div className="p-6 pt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`p-3 rounded-2xl ${
                        modal.type === "report"
                          ? "bg-indigo-500/10 text-indigo-400"
                          : modal.type === "confirm"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {modal.type === "report" ? (
                        <Activity size={24} />
                      ) : modal.type === "confirm" ? (
                        <AlertTriangle size={24} />
                      ) : (
                        <Info size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {modal.type === "organize" && language === "ko"
                          ? "필터 및 카테고리별 파일 정리"
                          : modal.title}
                      </h3>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ID:{" "}
                        {Math.random().toString(36).substr(2, 9).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs mb-6 leading-relaxed font-medium">
                    {modal.type === "organize" && language === "ko"
                      ? "선택한 사진들을 분류 기준에 맞는 하위 폴더로 자동 구성하여 정리합니다. 원하시는 폴더 구조를 선택하세요:"
                      : modal.message}
                  </p>

                  {modal.type === "report" && modal.data && (
                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center group hover:border-indigo-500/30 transition-colors">
                          <div className="text-[8px] text-slate-500 uppercase font-black mb-1">
                            {t("clustersAtomic")}
                          </div>
                          <div className="text-xl font-mono text-emerald-400 font-black">
                            {modal.data.clustersCompleted}
                          </div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center group hover:border-rose-500/30 transition-colors">
                          <div className="text-[8px] text-slate-500 uppercase font-black mb-1">
                            {t("clustersPartial")}
                          </div>
                          <div className="text-xl font-mono text-rose-400 font-black">
                            {modal.data.clustersPartial}
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 flex items-center gap-2">
                            <ShieldCheck
                              size={14}
                              className="text-emerald-500"
                            />{" "}
                            {t("integrityVerified")}
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">
                            VERIFIED
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 flex items-center gap-2">
                            <HardDrive size={14} className="text-indigo-500" />{" "}
                            {modal.data.isSimulation
                              ? "PROJECTED"
                              : "RECLAIMED"}
                          </span>
                          <span className="text-white font-mono font-bold">
                            {modal.data.reclaimedMB} MB
                          </span>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <div className="text-[7px] text-slate-500 uppercase font-bold mb-1 opacity-50 tracking-wider">
                            TARGET_SOURCE_VECTOR
                          </div>
                          <div className="text-[8px] font-mono text-slate-400 truncate bg-slate-950 p-2 rounded-lg border border-white/5">
                            {modal.data.target}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {modal.type === "organize" && modal.options ? (
                    <div className="space-y-4 mb-6">
                      <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
                        <button
                          onClick={() => setOrgMode("copy")}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${orgMode === "copy" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          {language === "ko" ? "복사 방식 (안전)" : "Copy"}
                        </button>
                        <button
                          onClick={() => setOrgMode("move")}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${orgMode === "move" ? "bg-rose-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          {language === "ko" ? "이동 방식 (정리)" : "Move"}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {modal.options.map((opt, i) => {
                          const localizedOpt =
                            language === "ko"
                              ? opt === "Category"
                                ? "카테고리(주제)별"
                                : opt === "Year"
                                  ? "촬영 연도/날짜별"
                                  : opt === "Camera"
                                    ? "카메라 기종별"
                                    : opt === "Format"
                                      ? "파일 포맷(확장자)별"
                                      : opt
                              : opt;
                          return (
                            <button
                              key={`${opt}-${i}`}
                              onClick={() => {
                                modal.onConfirm?.(opt, orgMode);
                                setModal(null);
                              }}
                              className="w-full text-left px-4 py-3 bg-slate-900/90 hover:bg-slate-800/90 border border-white/10 hover:border-indigo-500/50 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-between group cursor-pointer shadow-sm"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform" />
                                <span>{t("organizeBy", { option: localizedOpt })}</span>
                              </div>
                              <ArrowRight
                                size={14}
                                className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 text-indigo-400"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {modal.type === "confirm" && (
                        <button
                          onClick={() => setModal(null)}
                          className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5"
                        >
                          {t("cancel")}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          modal.onConfirm?.();
                          setModal(null);
                        }}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all uppercase tracking-widest"
                      >
                        {modal.type === "confirm" ? t("confirmTitle") : t("ok")}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Metadata Detail Pane (Side Pane) */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              ref={inspectorRef}
              key={`inspector-${selectedPhoto.id}`}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] z-[250] bg-slate-900/95 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  {t("metadataInspector")}
                </h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoId(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                  title={t("closeInspector")}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Preview */}
                <div className="aspect-square w-full rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center relative group">
                  {(() => {
                    const isPdf =
                      selectedPhoto.type === "application/pdf" ||
                      selectedPhoto.path?.toLowerCase().endsWith(".pdf");
                    const isVideo =
                      selectedPhoto.type?.startsWith("video/") ||
                      selectedPhoto.path
                        ?.toLowerCase()
                        .match(/\.(mp4|mov|avi|mkv|webm)$/);
                    const isAudio =
                      selectedPhoto.type?.startsWith("audio/") ||
                      selectedPhoto.path
                        ?.toLowerCase()
                        .match(/\.(mp3|wav|ogg|m4a|flac)$/);
                    const isDocText = selectedPhoto.path
                      ?.toLowerCase()
                      .match(/\.(txt|csv|json|md)$/);

                    if (isPdf) {
                      return (
                        <div className="flex flex-col items-center justify-center p-6 text-center select-none bg-slate-900 border border-white/5 absolute inset-0">
                          <FileText
                            size={64}
                            className="text-red-500 mb-3 animate-pulse"
                          />
                          <span className="text-xs font-black text-slate-300 uppercase tracking-widest block mb-2">
                            DOCUMENT (PDF)
                          </span>
                          {selectedPhoto.ocrText ? (
                            <div className="max-w-[80%] mx-auto mt-2 bg-black/40 p-4 rounded-xl border border-white/5 text-left max-h-[160px] overflow-y-auto w-full">
                              <p className="text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
                                {selectedPhoto.ocrText}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                              {t("noOcrTextAvailable") || "NO TEXT EXTRACTED"}
                            </span>
                          )}
                        </div>
                      );
                    }

                    if (isVideo) {
                      const fullUrl = SystemAPI.getImageUrl(
                        selectedPhoto.path,
                        "full",
                      );
                      return (
                        <div className="absolute inset-0 flex flex-col bg-slate-950 items-center justify-center">
                          {fullUrl ? (
                            <video
                              src={fullUrl}
                              controls
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error(
                                  "Video preview playback error:",
                                  e,
                                );
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-4">
                              <Video
                                size={48}
                                className="text-sky-400 mb-2 animate-bounce"
                              />
                              <span className="text-xs font-bold text-slate-300 block">
                                VIDEO ASSET
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono mt-1">
                                {selectedPhoto.path.split("/").pop()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (isAudio) {
                      const fullUrl = SystemAPI.getImageUrl(
                        selectedPhoto.path,
                        "full",
                      );
                      return (
                        <div className="absolute inset-0 flex flex-col bg-slate-950 items-center justify-center p-6 text-center select-none">
                          <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-3 relative">
                            <Music
                              className="text-fuchsia-400 animate-pulse"
                              size={32}
                            />
                          </div>
                          <span className="text-xs font-black text-fuchsia-400 uppercase tracking-widest block mb-1">
                            AUDIO TRACK
                          </span>
                          <span className="text-[11px] font-bold text-slate-300 block max-w-full truncate font-mono mb-4">
                            {selectedPhoto.path.split("/").pop()}
                          </span>
                          {fullUrl && (
                            <audio
                              src={fullUrl}
                              controls
                              className="w-full h-8 mt-1 scale-95"
                            />
                          )}
                        </div>
                      );
                    }

                    if (isDocText) {
                      return (
                        <div className="absolute inset-0 flex flex-col bg-slate-950 p-4 text-left">
                          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10 shrink-0">
                            <FileText size={16} className="text-emerald-400" />
                            <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                              TEXT DOCUMENT
                            </span>
                          </div>
                          <div className="flex-1 bg-black/40 p-3 rounded-xl border border-white/5 overflow-y-auto w-full">
                            <p className="text-[10.5px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
                              {selectedPhoto.ocrText ||
                                `No text extracted from ${selectedPhoto.path.split("/").pop()}`}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const getCategoryFallbackUrl = (
                      category?: string,
                    ): string => {
                      const cat = (category || "").toLowerCase();
                      let startColor = "#1e293b"; // slate-800
                      let endColor = "#0f172a"; // slate-900
                      let typeLabel = "PHOTO";
                      let iconMarkup = `
                        <circle cx="120" cy="90" r="30" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="2" />
                        <circle cx="120" cy="90" r="10" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" />
                        <path d="M120 60 L120 70 M120 110 L120 120 M90 90 L100 90 M140 90 L150 90 M99 69 L106 76 M134 104 L141 111 M99 111 L106 104 M134 76 L141 69" stroke="currentColor" stroke-opacity="0.4" stroke-width="2" stroke-linecap="round" />
                      `;

                      if (
                        cat.includes("nature") ||
                        cat.includes("scenic") ||
                        cat.includes("landscape")
                      ) {
                        startColor = "#064e3b"; // emerald-950
                        endColor = "#022c22";
                        typeLabel = "NATURE";
                        iconMarkup = `
                          <circle cx="120" cy="70" r="22" fill="#fef08a" opacity="0.1" />
                          <path d="M50 140 L100 85 L140 120 L180 75 L220 140 Z" fill="currentColor" opacity="0.35" />
                          <path d="M80 140 L130 95 L170 130 L200 140 Z" fill="currentColor" opacity="0.25" />
                        `;
                      } else if (
                        cat.includes("people") ||
                        cat.includes("portrait") ||
                        cat.includes("face") ||
                        cat.includes("smile") ||
                        cat.includes("group") ||
                        cat.includes("person")
                      ) {
                        startColor = "#1e1b4b"; // indigo-950
                        endColor = "#0f172a";
                        typeLabel = "PEOPLE";
                        iconMarkup = `
                          <circle cx="120" cy="73" r="18" fill="currentColor" opacity="0.3" />
                          <path d="M92 125 C92 105 148 105 148 125 Z" fill="currentColor" opacity="0.3" />
                          <circle cx="85" cy="85" r="14" fill="currentColor" opacity="0.2" />
                          <path d="M63 125 C63 110 107 110 107 125 Z" fill="currentColor" opacity="0.2" />
                          <circle cx="155" cy="85" r="14" fill="currentColor" opacity="0.15" />
                          <path d="M133 125 C133 110 177 110 177 125 Z" fill="currentColor" opacity="0.15" />
                        `;
                      } else if (
                        cat.includes("travel") ||
                        cat.includes("city") ||
                        cat.includes("architecture") ||
                        cat.includes("tourism")
                      ) {
                        startColor = "#1c1917"; // stone-900
                        endColor = "#0c0a09";
                        typeLabel = "TRAVEL";
                        iconMarkup = `
                          <rect x="50" y="80" width="25" height="60" fill="currentColor" opacity="0.2" />
                          <rect x="80" y="60" width="30" height="80" fill="currentColor" opacity="0.3" />
                          <rect x="115" y="40" width="20" height="100" fill="currentColor" opacity="0.4" />
                          <rect x="140" y="70" width="35" height="70" fill="currentColor" opacity="0.2" />
                          <rect x="180" y="55" width="25" height="85" fill="currentColor" opacity="0.1" />
                        `;
                      } else if (
                        cat.includes("work") ||
                        cat.includes("document") ||
                        cat.includes("receipt") ||
                        cat.includes("office") ||
                        cat.includes("computer")
                      ) {
                        startColor = "#172554"; // blue-950
                        endColor = "#0b1329";
                        typeLabel = "DOCUMENT";
                        iconMarkup = `
                          <rect x="85" y="50" width="70" height="80" rx="4" fill="none" stroke="currentColor" stroke-width="4" stroke-opacity="0.3" />
                          <line x1="97" y1="70" x2="143" y2="70" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-opacity="0.3" />
                          <line x1="97" y1="85" x2="143" y2="85" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-opacity="0.3" />
                          <line x1="97" y1="100" x2="125" y2="100" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-opacity="0.3" />
                        `;
                      } else if (
                        cat.includes("art") ||
                        cat.includes("abstract") ||
                        cat.includes("canvas") ||
                        cat.includes("pattern") ||
                        cat.includes("color")
                      ) {
                        startColor = "#4c0519"; // rose-950
                        endColor = "#2d0612";
                        typeLabel = "ABSTRACT";
                        iconMarkup = `
                          <path d="M70 110 C70 60 110 50 140 80 C170 110 130 140 100 130 C70 120 70 130 70 110 Z" fill="currentColor" opacity="0.35" />
                          <circle cx="150" cy="110" r="30" fill="currentColor" opacity="0.15" />
                          <circle cx="90" cy="70" r="25" fill="currentColor" opacity="0.1" />
                        `;
                      }

                      const gradId = `fallbackGrad-${cat.replace(/[^a-z]/g, "") || "gen"}`;
                      const svg = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="100%" height="100%" style="color: %236366f1;">
                          <defs>
                            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
                              <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
                            </linearGradient>
                          </defs>
                          <rect width="240" height="180" fill="url(%23${gradId})" />
                          <g opacity="0.8">
                            ${iconMarkup}
                          </g>
                          <text x="120" y="160" fill="white" opacity="0.3" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="8" text-anchor="middle" letter-spacing="2">
                            ${typeLabel} PREVIEW
                          </text>
                        </svg>
                      `
                        .replace(/\n/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();

                      return `data:image/svg+xml;utf8,${svg}`;
                    };

                    const fullBlobUrl =
                      selectedPhoto.blob && selectedPhoto.blob.size > 0
                        ? libraryManager.getBlobUrl(selectedPhoto.path, () =>
                            URL.createObjectURL(selectedPhoto.blob!),
                          )
                        : null;
                    const systemUrl = SystemAPI.isTauri()
                      ? SystemAPI.getImageUrl(selectedPhoto.path, "full")
                      : null;
                    const thumbUrl =
                      selectedPhoto.thumbnail &&
                      selectedPhoto.thumbnail.size > 0
                        ? libraryManager.getBlobUrl(selectedPhoto.path, () =>
                            URL.createObjectURL(selectedPhoto.thumbnail!),
                          )
                        : null;
                    const webSystemUrl = !SystemAPI.isTauri()
                      ? SystemAPI.getImageUrl(selectedPhoto.path, "full")
                      : null;
                    const finalUrl =
                      fullBlobUrl ||
                      systemUrl ||
                      thumbUrl ||
                      webSystemUrl ||
                      getCategoryFallbackUrl(selectedPhoto.category);

                    return (
                      <img
                        src={finalUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt={selectedPhoto.category || "Photo"}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const attempt = parseInt(
                            target.dataset.attempt || "0",
                            10,
                          );
                          if (attempt === 0) {
                            target.dataset.attempt = "1";
                            SystemAPI.getThumbnailData(selectedPhoto.path)
                              .then((url) => {
                                if (url) target.src = url;
                                else
                                  target.src = getCategoryFallbackUrl(
                                    selectedPhoto.category,
                                  );
                              })
                              .catch(() => {
                                target.src = getCategoryFallbackUrl(
                                  selectedPhoto.category,
                                );
                              });
                          } else if (attempt === 1) {
                            target.dataset.attempt = "2";
                            target.src = getCategoryFallbackUrl(
                              selectedPhoto.category,
                            );
                          } else {
                            target.style.display = "none";
                          }
                        }}
                      />
                    );
                  })()}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-[10px] text-white/50 font-mono truncate z-10 relative">
                      {selectedPhoto.path}
                    </p>
                  </div>
                </div>

                {/* Section: Technical */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Cpu size={12} /> {t("technicalSpecs")}
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        label: t("resolution"),
                        value:
                          selectedPhoto.width && selectedPhoto.height
                            ? `${selectedPhoto.width} x ${selectedPhoto.height}`
                            : "N/A",
                      },
                      {
                        label: t("dateCaptured"),
                        value: new Date(
                          selectedPhoto.dateTaken || selectedPhoto.lastModified,
                        ).toLocaleDateString(),
                      },
                      {
                        label: t("hardware"),
                        value: selectedPhoto.cameraModel || "Native Capture",
                      },
                      ...(selectedPhoto.frameCount
                        ? [
                            {
                              label: t("animationFrames") || "Frames",
                              value: selectedPhoto.frameCount.toString(),
                            },
                          ]
                        : []),
                      ...(selectedPhoto.durationMs
                        ? [
                            {
                              label: t("animationDuration") || "Duration",
                              value: `${(selectedPhoto.durationMs / 1000).toFixed(2)}s`,
                            },
                          ]
                        : []),
                      {
                        label: t("isoSpeed"),
                        value: selectedPhoto.iso
                          ? `ISO ${selectedPhoto.iso}`
                          : "Auto",
                      },
                      {
                        label: t("aperture"),
                        value: selectedPhoto.fNumber
                          ? `f/${selectedPhoto.fNumber}`
                          : "N/A",
                      },
                      {
                        label: t("exposure"),
                        value:
                          selectedPhoto.exposureTime &&
                          selectedPhoto.exposureTime > 0
                            ? selectedPhoto.exposureTime < 1
                              ? `1/${Math.round(1 / selectedPhoto.exposureTime)}s`
                              : `${selectedPhoto.exposureTime}s`
                            : "N/A",
                      },
                      {
                        label: t("focalLength"),
                        value: selectedPhoto.focalLength
                          ? `${Math.round(selectedPhoto.focalLength)}mm`
                          : "N/A",
                      },
                      {
                        label: t("fileSize"),
                        value: `${(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB`,
                      },
                    ].map((item, i) => (
                      <div
                        key={`${item.label}-${i}`}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-mono font-bold">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Phase 30.1: Geotag Visualizer */}
                  {selectedPhoto.latitude && selectedPhoto.longitude && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MapPin size={12} className="text-rose-500" />{" "}
                        {t("geolocation")}
                      </h4>
                      <div className="aspect-video w-full rounded-xl bg-slate-800/80 border border-white/10 relative overflow-hidden group cursor-crosshair">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#3b82f6_0%,transparent_50%)] animate-pulse" />
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "radial-gradient(#ffffff22 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }}
                        />

                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative">
                            <div className="absolute -inset-4 bg-rose-500/20 rounded-full animate-ping" />
                            <MapPin
                              size={24}
                              className="text-rose-500 relative z-10 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                            />
                          </div>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/5 flex justify-between items-center">
                          <div className="text-[9px] font-mono text-white/70">
                            {selectedPhoto.latitude.toFixed(4)},{" "}
                            {selectedPhoto.longitude.toFixed(4)}
                          </div>
                          <div className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter border border-rose-500/30">
                            GPS_FIXED
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 italic flex items-center gap-2">
                        <Navigation size={10} />{" "}
                        {selectedPhoto.locationName ||
                          "Estimated: Seoul Metropolitan Area"}
                      </div>
                    </div>
                  )}

                  {/* Integrated AI Photo Enhancement (화질 복원 모달 통합) */}
                  <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                    <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-950/70 via-purple-950/40 to-slate-900 border border-indigo-500/30 shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Sparkles size={16} className="animate-pulse" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-white uppercase tracking-wider block">
                              {language === "ko" ? "AI 화질 복원 & 4X 업스케일" : "AI Photo Enhancement"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {language === "ko" ? "초해상도 복원 및 노이즈 제거" : "Super Resolution & De-noising"}
                            </span>
                          </div>
                        </div>
                        {selectedPhoto.qualityTags?.includes("AI-Enhanced") && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-fade-in flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            {language === "ko" ? "복원완료" : "ENHANCED"}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                        {language === "ko"
                          ? "저해상도 및 흐릿한 사진을 고해상도로 4배 확대 복원하고 선명도와 다이내믹 레인지를 최적화합니다."
                          : "Upscales low-res assets 4X and sharpens micro-details with neural color restoration."}
                      </p>

                      <button
                        onClick={async () => {
                          await handleEnhance(selectedPhoto);
                        }}
                        className="w-full py-2.5 bg-linear-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Wand2 size={14} className="text-amber-300" />
                        <span>
                          {selectedPhoto.qualityTags?.includes("AI-Enhanced")
                            ? (language === "ko" ? "✨ 화질 복원 재실행" : "✨ Re-run AI Enhancement")
                            : (language === "ko" ? "✨ 원클릭 화질 복원 실행" : "✨ Enhance Photo Quality")}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2.5">
                    <button
                      onClick={() => setShowSocialExport(true)}
                      className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 italic"
                    >
                      <Instagram size={14} /> {t("exportForSocial")}
                    </button>
                    <button
                      onClick={() => setShowPrintOpt(true)}
                      className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 italic"
                    >
                      <Printer size={14} /> {t("masterForPrint")}
                    </button>
                    <button
                      onClick={() => setShowDeepRecovery(true)}
                      className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-400 font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 italic"
                    >
                      <Binary size={14} /> {t("deepForensicRecovery")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Command Palette (Phase 14.1 Extension) */}
        <AnimatePresence>
          {showCommandPalette && (
            <div
              key="command-palette-overlay"
              className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-md"
              onClick={() => setShowCommandPalette(false)}
            >
              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden shadow-black/80"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-slate-900/50">
                  <Search className="text-blue-500" size={24} />
                  <input
                    autoFocus
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    className="flex-1 bg-transparent border-none text-white text-lg focus:outline-hidden placeholder:text-slate-600 font-medium"
                    value={commandQuery}
                    onChange={(e) => setCommandQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Escape" && setShowCommandPalette(false)
                    }
                  />
                  <div className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-500 font-mono">
                    ESC
                  </div>
                </div>
                <div className="p-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                  {[
                    {
                      label: t("startGlobalScan"),
                      icon: Zap,
                      action: handleSelectDirectory,
                      shortcut: "S",
                    },
                    {
                      label: t("switchToDuplicates"),
                      icon: Trash2,
                      action: () => {
                        setActiveTab("duplicates");
                        setShowCommandPalette(false);
                      },
                      shortcut: "D",
                    },
                    {
                      label: language === "ko" ? "디지털 사진첩 열기" : "Open Digital Photobook",
                      icon: BookOpen,
                      action: () => {
                        setActiveTab("photobook");
                        setShowCommandPalette(false);
                      },
                      shortcut: "P",
                    },
                    {
                      label: t("launchSmartRepair"),
                      icon: Wand2,
                      action: () => {
                        setShowDeepRecovery(true);
                        setShowCommandPalette(false);
                      },
                    },
                    {
                      label: t("exportToHeritageCloud"),
                      icon: Share2,
                      action: () => {
                        setShowSocialExport(true);
                        setShowCommandPalette(false);
                      },
                    },
                    {
                      label: language === "ko" ? "사진 보관함 열기" : "Open Photo Library",
                      icon: ImageIcon,
                      action: () => {
                        setActiveTab("library");
                        setShowCommandPalette(false);
                      },
                      shortcut: "L",
                    },
                    {
                      label: "Toggle Watcher",
                      icon: Activity,
                      action: () => setIsWatcherEnabled(!isWatcherEnabled),
                    },
                  ]
                    .filter((item) =>
                      item.label
                        .toLowerCase()
                        .includes(commandQuery.toLowerCase()),
                    )
                    .map((item, idx) => (
                      <button
                        key={`${item.label}-${idx}`}
                        onClick={() => {
                          item.action();
                          setShowCommandPalette(false);
                        }}
                        className="w-full flex items-center justify-between p-3 hover:bg-blue-600 rounded-xl transition-all group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-white/20 transition-all">
                            <item.icon size={18} />
                          </div>
                          <span className="font-bold text-slate-300 group-hover:text-white uppercase tracking-wider text-xs">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/20 font-mono text-white">
                            ⌘
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/20 font-mono text-white">
                            {item.shortcut || idx + 1}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
                <div className="p-3 bg-slate-900/80 border-t border-white/5 flex justify-between items-center px-4">
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                    SnapClean_Kernel_v1.2.4_Command_Vector
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase font-bold">
                      <Navigation size={10} /> Navigate
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase font-bold">
                      <CheckCircle2 size={10} /> Execute
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {contextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-[9999] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[200px] overflow-hidden"
              style={{
                top: Math.min(contextMenu.y, window.innerHeight - 250),
                left: Math.min(contextMenu.x, window.innerWidth - 220),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-2 border-b border-white/5 mb-1.5 bg-white/5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate">
                  {contextMenu.photo.path.split("/").pop()}
                </p>
              </div>

              <button
                onClick={() => {
                  SystemAPI.openInDefaultApp(contextMenu.photo, addNotification);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors text-left group"
              >
                <ExternalLink
                  size={14}
                  className="text-emerald-400 group-hover:text-white transition-colors"
                />
                {language === 'ko' ? 'Windows 연결 프로그램으로 열기...' : 'Open with...'}
              </button>

              <button
                onClick={() => {
                  setSelectedPhotoId(contextMenu.photo.id!);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-600 text-white text-xs font-semibold transition-colors text-left group"
              >
                <ImageIcon
                  size={14}
                  className="text-blue-400 group-hover:text-white transition-colors"
                />
                View Metadata
              </button>

              {isAiConfigured && !contextMenu.photo.isEnhanced && (
                <button
                  onClick={() => {
                    handleEnhance(contextMenu.photo);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors text-left group"
                >
                  <Sparkles
                    size={14}
                    className="text-indigo-400 group-hover:text-white transition-colors"
                  />
                  AI Enhance
                </button>
              )}

              <div className="h-px bg-white/5 my-1.5" />

              <button
                onClick={() => {
                  deleteFromDisk([contextMenu.photo]);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-rose-600 text-white text-xs font-semibold transition-colors text-left group"
              >
                <Trash2
                  size={14}
                  className="text-rose-400 group-hover:text-white transition-colors"
                />
                Move to Trash
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeReel && (
            <CinematicReel
              event={activeReel.event}
              photos={activeReel.photos}
              onClose={() => setActiveReel(null)}
            />
          )}
          {showSocialExport && selectedPhoto && (
            <SocialExportModal
              photo={selectedPhoto}
              onClose={() => setShowSocialExport(false)}
            />
          )}
          {showCollabShare && (
            <CollabShareModal
              album={showCollabShare}
              onClose={() => setShowCollabShare(false)}
            />
          )}
          {showPrintOpt && selectedPhoto && (
            <PrintOptimizerModal
              photo={selectedPhoto}
              onClose={() => setShowPrintOpt(false)}
            />
          )}
          {showDeepRecovery && selectedPhoto && (
            <DeepRecoveryModal
              key="deep-recovery"
              photo={selectedPhoto}
              onClose={() => setShowDeepRecovery(false)}
            />
          )}
        </AnimatePresence>

        {/* Thumb-Friendly Mobile Bottom Navigation Bar */}
        <div className="lg:hidden fixed bottom-2 left-2 right-2 z-40 bg-slate-950/90 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl flex justify-around items-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
          {[
            {
              id: "duplicates",
              icon: Hash,
              label: language === "ko" ? "중복정리" : "Duplicates",
            },
            {
              id: "photobook",
              icon: BookOpen,
              label: language === "ko" ? "디지털 사진첩" : "Photobook",
            },
            {
              id: "library",
              icon: ImageIcon,
              label: language === "ko" ? "보관함" : "Library",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer flex-1 gap-1 min-h-[44px] ${
                  isActive
                    ? "text-white bg-indigo-600/30 font-bold border border-indigo-500/30 shadow-md shadow-indigo-500/10"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <tab.icon
                  size={18}
                  className={
                    isActive
                      ? "text-indigo-400 scale-110 transition-transform"
                      : "text-slate-400"
                  }
                />
                <span className="text-[10px] tracking-tight truncate font-sans font-medium max-w-[64px]">
                  {tab.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-400 hover:text-slate-200 border border-transparent flex-1 gap-1 cursor-pointer min-h-[44px]"
          >
            <Menu size={18} />
            <span className="text-[10px] tracking-tight font-sans font-medium">
              {language === "ko" ? "더 보기" : "More"}
            </span>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                key="mobile-nav-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                key="mobile-nav-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-white/10 z-[201] flex flex-col p-6 gap-6 lg:hidden shadow-2xl safe-area-pt"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Zap className="text-white fill-white" size={24} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">
                      {t("title")}
                    </h1>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                  {navItems.map((item, idx) => {
                    const isAiTab = Boolean(item.isAi);
                    const isActive = activeTab === item.id;

                    let buttonClass = "";
                    if (isActive) {
                      if (isAiTab && !isAiConfigured) {
                        buttonClass =
                          "bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-lg font-bold";
                      } else if (isAiTab && isAiConfigured) {
                        buttonClass =
                          "bg-purple-600 text-white border border-purple-400/40 shadow-lg font-bold";
                      } else {
                        buttonClass =
                          "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30";
                      }
                    } else {
                      if (isAiTab && !isAiConfigured) {
                        buttonClass =
                          "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300/90 border border-amber-500/25";
                      } else if (isAiTab && isAiConfigured) {
                        buttonClass =
                          "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20";
                      } else {
                        buttonClass =
                          "hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent";
                      }
                    }

                    return (
                      <button
                        key={`mobile-nav-${item.id}-${idx}`}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                          if (isAiTab && !isAiConfigured) {
                            setAiKeyFeatureName(item.label);
                            setIsAiKeyModalOpen(true);
                          }
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${buttonClass}`}
                      >
                        <item.icon
                          size={18}
                          className={
                            isAiTab
                              ? !isAiConfigured
                                ? "text-amber-400 shrink-0"
                                : "text-purple-400 shrink-0"
                              : isActive
                                ? "stroke-[2.5px]"
                                : "shrink-0"
                          }
                        />
                        <span className="font-medium truncate">{item.label}</span>

                        {isAiTab && (
                          <span
                            className={`ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                              !isAiConfigured
                                ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse"
                                : "bg-purple-500/25 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {!isAiConfigured ? (
                              <>
                                <Key size={10} className="text-amber-400 shrink-0" />
                                <span>{language === "ko" ? "Key 필요" : "Key Needed"}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={10} className="text-purple-300 shrink-0" />
                                <span>AI</span>
                              </>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-4">
                  <div className="glass p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12" />
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">
                      {t("memoryStatus")}
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">
                        {dbCount.toLocaleString()} {t("indexed")}
                      </span>
                      <Database size={14} className="text-blue-400" />
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-blue-500 w-1/3" />
                    </div>
                    <button
                      onClick={() => {
                        setModal({
                          type: "confirm",
                          title: "Factory Reset",
                          message: t("purgeConfirm"),
                          onConfirm: clearStorage,
                        });
                      }}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer flex w-full justify-between items-center"
                    >
                      {t("purgeIndex")}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Language
                    </span>
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                      <button
                        onClick={() => setLanguage("en")}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${language === "en" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setLanguage("ko")}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${language === "ko" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        KO
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {motionCreatorPhotos && (
          <MotionCreatorModal
            photos={motionCreatorPhotos}
            onClose={() => setMotionCreatorPhotos(null)}
            addNotification={addNotification}
            language={language}
          />
        )}

        {/* App Exit Confirmation Modal */}
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              key="app-exit-confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
              onClick={(e) => {
                e.stopPropagation();
                setShowExitConfirm(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center space-y-4 font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {language === "ko"
                      ? "SnapClean AI 종료"
                      : "Exit SnapClean AI"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {language === "ko"
                      ? "정말로 어플리케이션을 종료하시겠습니까? 진행 중이던 탐색 및 인덱싱 작업이 안전하게 중단됩니다."
                      : "Are you sure you want to exit SnapClean AI? Active folders indexing or background tasks will be safely paused."}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 hover:text-white border border-white/15 rounded-xl text-xs font-bold transition-all text-slate-300 cursor-pointer"
                  >
                    {language === "ko" ? "돌아가기" : "Cancel"}
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-950/30 cursor-pointer"
                  >
                    {language === "ko" ? "종료하기" : "Exit App"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPatchNotes && (
            <PatchNotesModal
              onClose={() => setShowPatchNotes(false)}
              addNotification={addNotification}
            />
          )}
        </AnimatePresence>

        <UpdateNotificationModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          currentVersion={APP_VERSION_INFO.version}
          latestVersion={latestVersion}
          release={latestRelease}
          isSimulated={isUpdateSimulated}
          onIgnoreVersion={ignoreCurrentVersion}
        />

        <AiApiKeyModal
          isOpen={isAiKeyModalOpen}
          onClose={() => setIsAiKeyModalOpen(false)}
          featureName={aiKeyFeatureName}
        />

        <ScanSourceModal
          isOpen={showScanSourceModal}
          onClose={() => setShowScanSourceModal(false)}
          onSelectFolder={handleSelectFolder}
          onSelectPhotos={handleSelectPhotos}
        />

        <MultiplatformInstallModal
          isOpen={showMultiplatformModal}
          onClose={() => setShowMultiplatformModal(false)}
          language={language as 'ko' | 'en'}
        />

        {/* Global Floating Tooltip Engine */}
        <GlobalTooltip />
      </div>
    </div>
  );
}
