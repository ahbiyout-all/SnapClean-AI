import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  CheckCircle2,
  Zap,
  Wrench,
  Shield,
  Copy,
  Check,
  X,
  Tag,
  Calendar,
  Layers,
  FileText,
  ExternalLink,
} from "lucide-react";
import { APP_VERSION_INFO, PatchNoteItem } from "../version";
import { useI18n } from "../i18n/context";

interface PatchNotesModalProps {
  onClose: () => void;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
}

export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({
  onClose,
  addNotification,
}) => {
  const { language } = useI18n();
  const [selectedVersion, setSelectedVersion] = useState<string>(
    APP_VERSION_INFO.version,
  );
  const [copied, setCopied] = useState(false);

  const activePatchNote: PatchNoteItem =
    APP_VERSION_INFO.patchNotes.find((p) => p.version === selectedVersion) ||
    APP_VERSION_INFO.patchNotes[0];

  const handleCopyVersionInfo = () => {
    const info = `SnapClean AI v${APP_VERSION_INFO.version} (Build: ${APP_VERSION_INFO.buildNumber}, Engine: ${APP_VERSION_INFO.engineVersion})`;
    navigator.clipboard.writeText(info);
    setCopied(true);
    addNotification(
      language === "ko" ? "버전 정보 복사 완료" : "Version Info Copied",
      info,
      "info",
    );
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/50 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                  {language === "ko"
                    ? "SnapClean AI 공식 패치노트"
                    : "SnapClean AI Official Patch Notes"}
                </h3>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black rounded-full uppercase">
                  v{APP_VERSION_INFO.version}
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold rounded-md">
                  STABLE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === "ko"
                  ? "최신 업데이트 내역, 기능 개선 사항 및 자동 빌드 버전 기록"
                  : "Release changelog, feature enhancements, and build records"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyVersionInfo}
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/5"
              title={language === "ko" ? "빌드 정보 복사" : "Copy Build Info"}
            >
              {copied ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
              <span className="hidden sm:inline text-[11px]">
                {copied ? "복사됨" : "버전 복사"}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body: Left Version Nav + Right Patch Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Version Selector Tabs */}
          <div className="w-full md:w-56 p-4 bg-slate-950/50 border-b md:border-b-0 md:border-r border-white/5 shrink-0 overflow-y-auto space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1">
              <Tag size={12} />
              <span>{language === "ko" ? "릴리스 버전 목록" : "Release History"}</span>
            </div>

            {APP_VERSION_INFO.patchNotes.map((note) => {
              const isSelected = note.version === selectedVersion;
              return (
                <button
                  key={note.version}
                  type="button"
                  onClick={() => setSelectedVersion(note.version)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500/40 text-white shadow-md"
                      : "bg-white/2 hover:bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm">
                      v{note.version}
                    </span>
                    {note.isLatest && (
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold rounded">
                        LATEST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                    <Calendar size={10} />
                    <span>{note.releaseDate}</span>
                  </div>
                </button>
              );
            })}

            {/* Build metadata footer widget */}
            <div className="pt-4 mt-4 border-t border-white/5 text-[10px] text-slate-400 space-y-1.5 px-1 font-mono">
              <div className="flex justify-between">
                <span>Build No:</span>
                <span className="text-slate-300 font-bold">
                  {APP_VERSION_INFO.buildNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Engine:</span>
                <span className="text-indigo-400 font-bold">
                  {APP_VERSION_INFO.engineVersion}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Active Patch Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Version Header Banner */}
            <div className="p-4 bg-black/30 border border-white/5 rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white font-mono">
                    v{activePatchNote.version}
                  </span>
                  {activePatchNote.isLatest && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-md">
                      {language === "ko" ? "현재 최신 버전" : "Current Release"}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Calendar size={12} /> {activePatchNote.releaseDate}
                </span>
              </div>
              <p className="text-sm font-bold text-indigo-300 mt-2">
                📌 {activePatchNote.theme}
              </p>
            </div>

            {/* Section 1: New Features */}
            {activePatchNote.features && activePatchNote.features.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-emerald-400" />
                  <span>
                    {language === "ko" ? "새로운 기능 (New Features)" : "New Features"}
                  </span>
                </h4>
                <div className="space-y-2">
                  {activePatchNote.features.map((feat, idx) => (
                    <div
                      key={`feat-${idx}`}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-white/3 border border-white/5 text-xs text-slate-200"
                    >
                      <CheckCircle2
                        size={15}
                        className="text-emerald-400 shrink-0 mt-0.5"
                      />
                      <span className="leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Improvements */}
            {activePatchNote.improvements && activePatchNote.improvements.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-400" />
                  <span>
                    {language === "ko" ? "개선 사항 (Improvements)" : "Improvements"}
                  </span>
                </h4>
                <div className="space-y-2">
                  {activePatchNote.improvements.map((imp, idx) => (
                    <div
                      key={`imp-${idx}`}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-white/3 border border-white/5 text-xs text-slate-300"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Fixes */}
            {activePatchNote.fixes && activePatchNote.fixes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Wrench size={14} className="text-amber-400" />
                  <span>
                    {language === "ko" ? "오류 수정 (Fixes)" : "Bug Fixes"}
                  </span>
                </h4>
                <div className="space-y-2">
                  {activePatchNote.fixes.map((fix, idx) => (
                    <div
                      key={`fix-${idx}`}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-white/3 border border-white/5 text-xs text-slate-300"
                    >
                      <Shield
                        size={14}
                        className="text-amber-400 shrink-0 mt-0.5"
                      />
                      <span className="leading-relaxed">{fix}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <FileText size={13} className="text-indigo-400" />
            <span>
              {language === "ko"
                ? "상세 설계 및 API 명세: docs/ARCHITECTURE.md, docs/PATCHNOTES.md 참조"
                : "Full specs available in docs/ARCHITECTURE.md & docs/PATCHNOTES.md"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            {language === "ko" ? "확인 및 닫기" : "Close"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
