import React, { useState, useMemo } from "react";
import {
  Folder,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Star,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Video,
  Image as ImageIcon,
  HardDrive,
  Calendar,
  Camera,
  Layers,
} from "lucide-react";
import { PhotoRecord } from "../services/db";
import { SystemAPI } from "../services/systemApi";
import { libraryManager } from "../services/PhotoLibraryManager";

export interface DuplicateExplorerTableProps {
  photos: PhotoRecord[];
  bestPhotoId?: number;
  bestSize: number;
  toKeepIds: number[];
  onToggleKeep: (id: number) => void;
  onKeepOnlyThis: (id: number) => void;
  onSelectPhoto?: (id: number | null) => void;
  selectedPhotoId?: number | null;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  language: string;
  foldersList: string[];
  isMultiFolder: boolean;
}

type SortColumn =
  | "name"
  | "folder"
  | "size"
  | "dateModified"
  | "dateTaken"
  | "type"
  | "resolution"
  | "status";

function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getFolderPath(filePath?: string): string {
  if (!filePath) return "\\";
  const normalized = filePath.replace(/\//g, "\\");
  const lastSlash = normalized.lastIndexOf("\\");
  if (lastSlash === -1) return "\\";
  return normalized.substring(0, lastSlash + 1);
}

function getFileName(filePath?: string): string {
  if (!filePath) return "Asset";
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.split("/").pop() || filePath;
}

function getFileExtension(filePath?: string): string {
  if (!filePath) return "";
  const name = getFileName(filePath);
  const dot = name.lastIndexOf(".");
  return dot !== -1 ? name.substring(dot + 1).toUpperCase() : "";
}

export const DuplicateExplorerTable: React.FC<DuplicateExplorerTableProps> = ({
  photos,
  bestPhotoId,
  bestSize,
  toKeepIds,
  onToggleKeep,
  onKeepOnlyThis,
  onSelectPhoto,
  selectedPhotoId,
  addNotification,
  language,
  foldersList,
  isMultiFolder,
}) => {
  const [sortCol, setSortCol] = useState<SortColumn>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [copiedPathId, setCopiedPathId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    photo: PhotoRecord;
  } | null>(null);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" || col === "folder" ? "asc" : "desc");
    }
  };

  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortCol) {
        case "name":
          valA = getFileName(a.path).toLowerCase();
          valB = getFileName(b.path).toLowerCase();
          break;
        case "folder":
          valA = getFolderPath(a.path).toLowerCase();
          valB = getFolderPath(b.path).toLowerCase();
          break;
        case "size":
          valA = a.size || 0;
          valB = b.size || 0;
          break;
        case "dateModified":
          valA = a.lastModified || 0;
          valB = b.lastModified || 0;
          break;
        case "dateTaken":
          valA = a.dateTaken || a.lastModified || 0;
          valB = b.dateTaken || b.lastModified || 0;
          break;
        case "type":
          valA = getFileExtension(a.path).toLowerCase();
          valB = getFileExtension(b.path).toLowerCase();
          break;
        case "resolution":
          valA = (a.width || 0) * (a.height || 0);
          valB = (b.width || 0) * (b.height || 0);
          break;
        case "status":
          // Best first, then kept, then purge
          valA = (a.id === bestPhotoId ? 2 : 0) + (toKeepIds.includes(a.id!) ? 1 : 0);
          valB = (b.id === bestPhotoId ? 2 : 0) + (toKeepIds.includes(b.id!) ? 1 : 0);
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [photos, sortCol, sortDir, bestPhotoId, toKeepIds]);

  const handleCopyPath = (e: React.MouseEvent, photo: PhotoRecord) => {
    e.stopPropagation();
    navigator.clipboard.writeText(photo.path);
    if (photo.id) setCopiedPathId(photo.id);
    addNotification(
      language === "ko" ? "경로 복사 완료" : "Path Copied",
      photo.path,
      "info",
    );
    setTimeout(() => setCopiedPathId(null), 2000);
  };

  const handleContextMenu = (e: React.MouseEvent, photo: PhotoRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      photo,
    });
  };

  // Close context menu on outside click
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const renderSortIndicator = (col: SortColumn) => {
    if (sortCol !== col) {
      return <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-100" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-indigo-400 font-bold" />
    ) : (
      <ArrowDown size={12} className="text-indigo-400 font-bold" />
    );
  };

  const folderColorClasses = [
    "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    "bg-amber-500/10 text-amber-300 border-amber-500/20",
    "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
  ];

  return (
    <div className="relative rounded-2xl border border-white/10 bg-slate-950/70 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto select-none">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header like Windows Explorer Details */}
          <thead>
            <tr className="bg-slate-900/90 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[11px] backdrop-blur-md sticky top-0 z-20">
              {/* Checkbox & Status */}
              <th
                onClick={() => handleSort("status")}
                className="p-3 w-28 cursor-pointer hover:text-white transition-colors group"
                title={language === "ko" ? "보존/삭제 상태별 정렬" : "Sort by Keep/Delete status"}
              >
                <div className="flex items-center gap-1.5">
                  <span>{language === "ko" ? "상태" : "Status"}</span>
                  {renderSortIndicator("status")}
                </div>
              </th>

              {/* Thumbnail & File Name */}
              <th
                onClick={() => handleSort("name")}
                className="p-3 min-w-[220px] cursor-pointer hover:text-white transition-colors group"
                title={language === "ko" ? "파일명 기준 정렬" : "Sort by file name"}
              >
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={12} className="text-indigo-400" />
                  <span>{language === "ko" ? "이름" : "Name"}</span>
                  {renderSortIndicator("name")}
                </div>
              </th>

              {/* Folder Path */}
              <th
                onClick={() => handleSort("folder")}
                className="p-3 min-w-[240px] cursor-pointer hover:text-white transition-colors group"
                title={language === "ko" ? "폴더 위치 기준 정렬" : "Sort by folder location"}
              >
                <div className="flex items-center gap-1.5">
                  <Folder size={12} className="text-amber-400" />
                  <span>{language === "ko" ? "폴더 위치" : "Folder Path"}</span>
                  {renderSortIndicator("folder")}
                </div>
              </th>

              {/* File Size */}
              <th
                onClick={() => handleSort("size")}
                className="p-3 min-w-[130px] cursor-pointer hover:text-white transition-colors group"
                title={language === "ko" ? "용량 기준 정렬" : "Sort by file size"}
              >
                <div className="flex items-center gap-1.5">
                  <HardDrive size={12} className="text-emerald-400" />
                  <span>{language === "ko" ? "크기" : "Size"}</span>
                  {renderSortIndicator("size")}
                </div>
              </th>

              {/* Date Modified */}
              <th
                onClick={() => handleSort("dateModified")}
                className="p-3 min-w-[150px] cursor-pointer hover:text-white transition-colors group hidden md:table-cell"
                title={language === "ko" ? "파일 수정일자 기준 정렬" : "Sort by modified date"}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-sky-400" />
                  <span>{language === "ko" ? "수정 일자" : "Date Modified"}</span>
                  {renderSortIndicator("dateModified")}
                </div>
              </th>

              {/* Date Taken (EXIF) */}
              <th
                onClick={() => handleSort("dateTaken")}
                className="p-3 min-w-[150px] cursor-pointer hover:text-white transition-colors group hidden lg:table-cell"
                title={language === "ko" ? "EXIF 원본 촬영일자 기준 정렬" : "Sort by EXIF date"}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-amber-400" />
                  <span>{language === "ko" ? "촬영 일자" : "Date Taken"}</span>
                  {renderSortIndicator("dateTaken")}
                </div>
              </th>

              {/* File Type */}
              <th
                onClick={() => handleSort("type")}
                className="p-3 w-20 cursor-pointer hover:text-white transition-colors group text-center"
                title={language === "ko" ? "파일 형식/확장자 기준 정렬" : "Sort by format"}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>{language === "ko" ? "유형" : "Type"}</span>
                  {renderSortIndicator("type")}
                </div>
              </th>

              {/* Dimensions / MP */}
              <th
                onClick={() => handleSort("resolution")}
                className="p-3 min-w-[130px] cursor-pointer hover:text-white transition-colors group hidden sm:table-cell"
                title={language === "ko" ? "해상도/규격 기준 정렬" : "Sort by dimensions"}
              >
                <div className="flex items-center gap-1.5">
                  <Camera size={12} className="text-cyan-400" />
                  <span>{language === "ko" ? "해상도" : "Dimensions"}</span>
                  {renderSortIndicator("resolution")}
                </div>
              </th>

              {/* Camera Model */}
              <th className="p-3 min-w-[120px] hidden xl:table-cell">
                <span className="text-slate-400">{language === "ko" ? "기종/카메라" : "Device"}</span>
              </th>

              {/* Action Buttons */}
              <th className="p-3 w-40 text-right pr-4">
                <span>{language === "ko" ? "작업" : "Actions"}</span>
              </th>
            </tr>
          </thead>

          {/* Table Body (Rows) */}
          <tbody className="divide-y divide-white/5 font-mono">
            {sortedPhotos.map((photo, idx) => {
              const isBest = photo.id === bestPhotoId;
              const isKept = photo.id ? toKeepIds.includes(photo.id) : false;
              const isSelected = selectedPhotoId === photo.id;
              const fileName = getFileName(photo.path);
              const folderPath = getFolderPath(photo.path);
              const ext = getFileExtension(photo.path);
              const isPdf =
                photo.type === "application/pdf" ||
                photo.path?.toLowerCase().endsWith(".pdf");
              const isVideo = photo.type?.startsWith("video/");
              const sizeDiff = photo.size - bestSize;

              const folderIndex = foldersList.indexOf(folderPath);
              const currentFolderColor =
                folderColorClasses[
                  (folderIndex >= 0 ? folderIndex : 0) % folderColorClasses.length
                ];

              const thumbUrl = !isPdf
                ? photo.thumbnail && photo.thumbnail.size > 0
                  ? libraryManager.getBlobUrl(photo.path, () =>
                      URL.createObjectURL(photo.thumbnail!),
                    )
                  : photo.blob && photo.blob.size > 0
                  ? libraryManager.getBlobUrl(photo.path, () =>
                      URL.createObjectURL(photo.blob!),
                    )
                  : SystemAPI.getImageUrl(photo.path, "thumbnail")
                : null;

              return (
                <tr
                  key={`explorer-row-${photo.id || idx}`}
                  onClick={() => onSelectPhoto?.(photo.id || null)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    SystemAPI.openInDefaultApp(photo, addNotification);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, photo)}
                  className={`group transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/25 ring-1 ring-inset ring-indigo-500"
                      : isKept
                      ? "bg-emerald-950/15 hover:bg-emerald-900/25"
                      : "bg-rose-950/10 hover:bg-rose-900/20 opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* Status & Checkbox */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.id) onToggleKeep(photo.id);
                        }}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                          isKept
                            ? "bg-emerald-500 border-emerald-400 text-white shadow-sm"
                            : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
                        }`}
                        title={
                          isKept
                            ? language === "ko"
                              ? "보존 중 (클릭 시 삭제 대상으로 전환)"
                              : "Kept (Click to mark for deletion)"
                            : language === "ko"
                              ? "삭제 대상 (클릭 시 보존으로 전환)"
                              : "Delete (Click to keep)"
                        }
                      >
                        {isKept && <Check size={12} className="stroke-[3]" />}
                      </button>

                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider shrink-0 ${
                          isKept
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {isKept ? "KEEP" : "DEL"}
                      </span>
                    </div>
                  </td>

                  {/* Thumbnail & File Name */}
                  <td className="p-3 font-sans">
                    <div className="flex items-center gap-3">
                      {/* Mini Thumbnail */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          SystemAPI.openInDefaultApp(photo, addNotification);
                        }}
                        className="w-9 h-9 rounded-lg bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow relative group/thumb cursor-pointer hover:border-indigo-400 transition-colors"
                        title={
                          language === "ko"
                            ? "더블클릭 또는 클릭하여 Windows 연결 프로그램으로 열기"
                            : "Double-click to open in Windows default application"
                        }
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : isPdf ? (
                          <FileText size={16} className="text-red-400" />
                        ) : isVideo ? (
                          <Video size={16} className="text-sky-400" />
                        ) : (
                          <ImageIcon size={16} className="text-slate-600" />
                        )}

                        {isBest && (
                          <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-400 rounded-full shadow" />
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ExternalLink size={10} />
                        </div>
                      </div>

                      {/* Name and AI Best Tag */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-bold text-slate-200 hover:text-indigo-300 transition-colors truncate text-xs sm:text-sm font-sans"
                            title={fileName}
                          >
                            {fileName}
                          </span>
                          {isBest && (
                            <span
                              className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shrink-0"
                              title={
                                language === "ko"
                                  ? "AI 분석 추천 최적 원본 (품질/해상도 기준)"
                                  : "AI Recommended Best Shot"
                              }
                            >
                              <Star size={8} className="fill-amber-400" />
                              <span>{language === "ko" ? "추천" : "BEST"}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Folder Path + Copy button */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] truncate max-w-[280px] ${currentFolderColor}`}
                        title={photo.path}
                      >
                        <Folder size={11} className="shrink-0" />
                        <span className="truncate">{folderPath}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleCopyPath(e, photo)}
                        className="p-1 text-slate-400 hover:text-white rounded-md bg-white/5 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                        title={language === "ko" ? "전체 파일 경로 복사" : "Copy full path"}
                      >
                        {copiedPathId === photo.id ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* File Size & Difference */}
                  <td className="p-3">
                    <div className="font-bold text-slate-200 text-xs">
                      {formatBytes(photo.size)}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>({photo.size.toLocaleString()} B)</span>
                      {sizeDiff > 0 ? (
                        <span className="text-amber-400 font-bold">
                          +{formatBytes(sizeDiff)}
                        </span>
                      ) : sizeDiff < 0 ? (
                        <span className="text-slate-400">
                          -{formatBytes(Math.abs(sizeDiff))}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Date Modified */}
                  <td className="p-3 text-slate-300 text-[11px] hidden md:table-cell">
                    <div title={formatDate(photo.lastModified)}>
                      {formatDate(photo.lastModified)}
                    </div>
                  </td>

                  {/* Date Taken (EXIF) */}
                  <td className="p-3 text-slate-300 text-[11px] hidden lg:table-cell">
                    <div title={formatDate(photo.dateTaken || photo.lastModified)}>
                      {photo.dateTaken ? (
                        <span className="text-amber-300/90 font-bold">
                          {formatDate(photo.dateTaken)}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {formatDate(photo.lastModified)} (수정일)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* File Type Extension */}
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded font-black text-[10px] text-slate-300 uppercase">
                      {ext || "FILE"}
                    </span>
                  </td>

                  {/* Dimensions */}
                  <td className="p-3 text-slate-300 text-[11px] hidden sm:table-cell">
                    {photo.width && photo.height ? (
                      <div>
                        <span>
                          {photo.width} × {photo.height}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {((photo.width * photo.height) / 1000000).toFixed(1)} MP
                        </span>
                      </div>
                    ) : photo.durationMs ? (
                      <span className="text-sky-300">
                        {Math.round(photo.durationMs / 1000)}s 비디오
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Camera Model */}
                  <td className="p-3 text-slate-400 text-[10px] font-sans truncate max-w-[120px] hidden xl:table-cell" title={photo.cameraModel || "Standard"}>
                    {photo.cameraModel || "-"}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right pr-4 font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          SystemAPI.openInDefaultApp(photo, addNotification);
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-white/5"
                        title={
                          language === "ko"
                            ? "Windows 연결 프로그램으로 열기 (더블클릭 가능)"
                            : "Open with Windows default application"
                        }
                      >
                        <ExternalLink size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.id) onKeepOnlyThis(photo.id);
                        }}
                        className="px-2 py-1 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        title={
                          language === "ko"
                            ? "이 파일만 보존하고 나머지는 삭제"
                            : "Keep only this item"
                        }
                      >
                        {language === "ko" ? "이것만" : "Only"}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.id) onToggleKeep(photo.id);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          isKept
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30"
                        }`}
                      >
                        {isKept ? "KEEP" : "DEL"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explorer Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-900 border border-white/15 rounded-xl shadow-2xl p-1.5 min-w-[220px] text-xs font-sans text-slate-200 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 240),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 truncate">
            {getFileName(contextMenu.photo.path)}
          </div>

          <button
            type="button"
            onClick={() => {
              SystemAPI.openInDefaultApp(contextMenu.photo, addNotification);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-indigo-600 hover:text-white rounded-lg text-left transition-colors cursor-pointer mt-1 font-bold"
          >
            <ExternalLink size={14} />
            <span>
              {language === "ko"
                ? "Windows 연결 프로그램으로 열기"
                : "Open in Windows App"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.photo.path);
              addNotification(
                language === "ko" ? "경로 복사 완료" : "Path Copied",
                contextMenu.photo.path,
                "info",
              );
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/10 rounded-lg text-left transition-colors cursor-pointer"
          >
            <Copy size={14} />
            <span>
              {language === "ko" ? "전체 파일 경로 복사" : "Copy Full Path"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              const folder = getFolderPath(contextMenu.photo.path);
              navigator.clipboard.writeText(folder);
              addNotification(
                language === "ko" ? "폴더 경로 복사" : "Folder Copied",
                folder,
                "info",
              );
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/10 rounded-lg text-left transition-colors cursor-pointer"
          >
            <Folder size={14} />
            <span>
              {language === "ko" ? "폴더 경로만 복사" : "Copy Folder Path"}
            </span>
          </button>

          <div className="h-px bg-white/10 my-1" />

          {contextMenu.photo.id && (
            <>
              <button
                type="button"
                onClick={() => {
                  onKeepOnlyThis(contextMenu.photo.id!);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-emerald-600/20 hover:text-emerald-300 rounded-lg text-left transition-colors cursor-pointer text-emerald-400 font-bold"
              >
                <CheckCircle2 size={14} />
                <span>
                  {language === "ko"
                    ? "이 파일만 보존 (다른 파일 삭제)"
                    : "Keep Only This Item"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleKeep(contextMenu.photo.id!);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-rose-600/20 hover:text-rose-300 rounded-lg text-left transition-colors cursor-pointer text-rose-400"
              >
                <Trash2 size={14} />
                <span>
                  {toKeepIds.includes(contextMenu.photo.id)
                    ? language === "ko"
                      ? "삭제 대상으로 변경"
                      : "Mark for Purge"
                    : language === "ko"
                      ? "보존 대상으로 변경"
                      : "Mark to Keep"}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
