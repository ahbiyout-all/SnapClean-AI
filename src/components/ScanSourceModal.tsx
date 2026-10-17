import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderSearch, Images, ShieldCheck, Info, X, ChevronRight, HardDrive } from 'lucide-react';
import { useI18n } from '../i18n/context';

interface ScanSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: () => void;
  onSelectPhotos: () => void;
}

export const ScanSourceModal: React.FC<ScanSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
  onSelectPhotos,
}) => {
  const { language } = useI18n();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto custom-scrollbar bg-slate-900/95 border border-slate-700/60 rounded-3xl p-5 sm:p-7 shadow-2xl text-white z-10 my-auto"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FolderSearch size={22} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                {language === 'ko' ? '검색할 대상 선택' : 'Select Scan Target'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ko'
                  ? '모든 분석은 기기 내에서 100% 로컬로 안전하게 진행됩니다'
                  : 'All scanning & deduplication runs 100% locally on device'}
              </p>
            </div>
          </div>

          {/* Options Grid */}
          <div className="mt-5 flex flex-col gap-3">
            {/* Option 1: Folder Scan */}
            <button
              onClick={() => {
                onSelectFolder();
                onClose();
              }}
              className="w-full text-left p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all group flex items-start justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-500/25 transition-colors shrink-0 mt-0.5">
                  <HardDrive size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white group-hover:text-indigo-300 transition-colors">
                      {language === 'ko' ? '📂 PC 폴더 전체 선택 (DCIM / 내 사진)' : '📂 PC Folder Scan (DCIM, etc.)'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {language === 'ko' ? 'PC/컴퓨터 권장' : 'Desktop Full Scan'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {language === 'ko'
                      ? '컴퓨터 하드디스크나 외장 드라이브의 특정 폴더(하위 사진 전체)를 통째로 지정하여 검사합니다.'
                      : 'Scan all photos & videos inside a selected directory on your PC/Mac.'}
                  </p>
                  <p className="text-[11px] text-amber-300/90 mt-1.5 leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    {language === 'ko'
                      ? '※ 스마트폰(모바일) 브라우저는 OS 보안상 폴더 통째 접근이 제한되어, 아래 [갤러리/사진 직접 선택]을 이용하셔야 정상 동작합니다.'
                      : '※ Mobile browsers restrict direct folder picking. Please use [Gallery / Photos Direct] below on smartphones.'}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors shrink-0 mt-3" />
            </button>

            {/* Option 2: Direct Gallery Selection */}
            <button
              onClick={() => {
                onSelectPhotos();
                onClose();
              }}
              className="w-full text-left p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 transition-all group flex items-start justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/25 transition-colors shrink-0 mt-0.5">
                  <Images size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-300 transition-colors">
                      {language === 'ko' ? '🖼️ 갤러리 / 사진 직접 선택' : '🖼️ Gallery / Photos Direct'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {language === 'ko' ? '스마트폰(모바일) 권장' : 'Mobile Recommended'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {language === 'ko'
                      ? '스마트폰 갤러리나 파일 목록에서 원하는 사진/동영상을 여러 장(또는 전체 선택) 골라 바로 검사합니다.'
                      : 'Select multiple photos directly from your photo gallery without folder permission restrictions.'}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors shrink-0 mt-3" />
            </button>
          </div>

          {/* Chrome Browser Security Guide Box (Solves the exact user question in screenshot) */}
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-slate-300 flex items-start gap-2.5">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-amber-300 block mb-0.5">
                {language === 'ko' ? '💡 크롬(Chrome) 브라우저 팝업 안내' : '💡 Chrome Browser Notice'}
              </span>
              {language === 'ko' ? (
                <>
                  폴더 선택 시 브라우저에서 <strong className="text-white font-semibold">"파일 N개를 이 사이트에 업로드하시겠습니까?"</strong>라는 시스템 확인창이 뜨면 <strong className="text-emerald-400 font-bold">[업로드]</strong>를 눌러주세요.
                  <br />
                  이는 브라우저가 폴더 접근 권한을 묻는 <strong className="text-slate-200">자체 표준 문구</strong>일 뿐이며, <strong className="text-indigo-300">실제 서버로 전송(업로드)되지 않고 기기 내에서 100% 직접 검색</strong>됩니다.
                </>
              ) : (
                <>
                  If Chrome asks <strong className="text-white">"Upload files to this site?"</strong>, please click <strong className="text-emerald-400">[Upload]</strong>.
                  This is Chrome's default phrasing for granting local folder read access. <strong className="text-indigo-300">Files are never sent to any server</strong> and stay 100% on your device.
                </>
              )}
            </div>
          </div>

          {/* Privacy Footnote */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>
              {language === 'ko'
                ? '100% 온디바이스(On-Device) 로컬 처리 · 클라우드 전송 없음'
                : '100% On-Device Local Processing · Zero Cloud Transmission'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
