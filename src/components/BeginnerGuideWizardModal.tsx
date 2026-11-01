import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Trash2, 
  BookOpen, 
  Image as ImageIcon, 
  FolderSearch, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Baby, 
  Film, 
  HelpCircle, 
  Zap, 
  Search, 
  Check, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  FileQuestion,
  Users,
  HardDrive
} from 'lucide-react';
import { useI18n } from '../i18n/context';

export interface BeginnerWizardResult {
  actionType: 
    | 'clean-auto' 
    | 'clean-manual' 
    | 'clean-junk'
    | 'photobook-family'
    | 'photobook-flipbook'
    | 'photobook-theater'
    | 'photobook-create'
    | 'browse-timeline'
    | 'browse-people'
    | 'browse-search'
    | 'import-folder'
    | 'import-files'
    | 'import-demo';
  targetTab: string;
  payload?: any;
}

interface BeginnerGuideWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (result: BeginnerWizardResult) => void;
  photoCount?: number;
}

export const BeginnerGuideWizardModal: React.FC<BeginnerGuideWizardModalProps> = ({
  isOpen,
  onClose,
  onExecute,
  photoCount = 0,
}) => {
  const { language } = useI18n();

  // Step 1: Main Goal, Step 2: Detail Option, Step 3: Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedGoal, setSelectedGoal] = useState<'duplicates' | 'photobook' | 'browse' | 'import'>('duplicates');
  const [selectedOption, setSelectedOption] = useState<string>('clean-auto');

  if (!isOpen) return null;

  // Question 1: Goals configuration
  const goals = [
    {
      id: 'duplicates',
      icon: Trash2,
      color: 'from-amber-500 to-rose-500',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      title: language === 'ko' ? '용량 비우기 & 사진 정리' : 'Clean Duplicates & Free Space',
      subtitle: language === 'ko' 
        ? '똑같은 사진, 흔들린 컷, 영수증·스크린샷을 솎아내어 저장 공간을 늘리고 싶어요.' 
        : 'Remove exact duplicates, blurry shots, and receipts to reclaim storage.',
      defaultOption: 'clean-auto'
    },
    {
      id: 'photobook',
      icon: BookOpen,
      color: 'from-indigo-600 to-purple-600',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      title: language === 'ko' ? '디지털 사진첩 & 앨범 만들기' : 'Make Photobook & Family Album',
      subtitle: language === 'ko' 
        ? '가족·아이 성장 앨범, 여행 추억을 3D 플립북이나 넓은 와이드 화면으로 감상하고 싶어요.' 
        : 'Turn your best moments into a 3D flipbook or spacious family scrapbook.',
      defaultOption: 'photobook-family'
    },
    {
      id: 'browse',
      icon: Search,
      color: 'from-blue-600 to-cyan-500',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      title: language === 'ko' ? '원하는 사진 찾기 & 감상' : 'Browse & Search Photos',
      subtitle: language === 'ko' 
        ? '월별 순서대로 보거나, 같은 사람 얼굴별로 모아보거나, 특정 사진을 찾고 싶어요.' 
        : 'Explore photos by month, person faces, or search by keywords.',
      defaultOption: 'browse-timeline'
    },
    {
      id: 'import',
      icon: FolderSearch,
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      title: language === 'ko' ? '새 사진 폴더 가져와서 등록' : 'Import & Scan New Photos',
      subtitle: language === 'ko' 
        ? '내 컴퓨터나 스마트폰에서 새로운 사진 폴더를 가져와 분석하고 싶어요.' 
        : 'Bring new photo folders from your device to index and organize.',
      defaultOption: 'import-folder'
    }
  ];

  // Question 2: Follow-up options based on selectedGoal
  const getDetailOptions = () => {
    switch (selectedGoal) {
      case 'duplicates':
        return [
          {
            id: 'clean-auto',
            icon: Zap,
            recommended: true,
            title: language === 'ko' ? '⚡ 최고 화질 원본만 남기고 자동 정리' : '⚡ Auto-Keep Best Quality & Clean Rest',
            desc: language === 'ko' 
              ? 'AI가 가장 선명하고 해상도 높은 원본 사진 1장만 안전하게 남기고, 중복 복사본을 휴지통으로 이동합니다.' 
              : 'Automatically keeps the sharpest original photo in each group and moves redundants to trash.'
          },
          {
            id: 'clean-manual',
            icon: Layers,
            title: language === 'ko' ? '👀 비슷한 연속 촬영(연사) 컷 직접 비교' : '👀 Compare Burst Shots Manually',
            desc: language === 'ko' 
              ? '비슷하게 연속 촬영된 사진들을 나란히 띄워두고 표정과 구도를 직접 비교하며 선택합니다.' 
              : 'View visually similar burst sequences side-by-side and choose your favorites.'
          },
          {
            id: 'clean-junk',
            icon: Trash2,
            title: language === 'ko' ? '🧾 영수증, 스크린샷, 흐릿한 무의미 사진만 청소' : '🧾 Clean Junk (Receipts & Screenshots)',
            desc: language === 'ko' 
              ? '메모용으로 찍어둔 영수증, 계좌 캡처, 심하게 흔들린 사진들만 쏙 골라내어 먼저 삭제합니다.' 
              : 'Target and purge low-value assets like screenshots, receipts, and blurry photos.'
          }
        ];
      case 'photobook':
        return [
          {
            id: 'photobook-family',
            icon: Baby,
            recommended: true,
            title: language === 'ko' ? '🍼 패밀리 앨범 와이드 뷰' : '🍼 Family Album Monthly Wide View',
            desc: language === 'ko' 
              ? '아이 성장 기록과 가족 사진을 캘린더 월별로 넓은 화면에서 스크랩북처럼 따뜻하게 감상합니다.' 
              : 'Browse child milestones and family moments organized by month in a spacious wide layout.'
          },
          {
            id: 'photobook-flipbook',
            icon: BookOpen,
            title: language === 'ko' ? '📖 3D 양장본 인터랙티브 플립북' : '📖 3D Interactive Hardcover Book',
            desc: language === 'ko' 
              ? '실제 양장본 책장을 손으로 넘기는 듯한 3D 입체 애니메이션과 AI 감성 캡션으로 추억을 봅니다.' 
              : 'Flip through realistic 3D pages with ambient lighting, paper physics, and poetic stories.'
          },
          {
            id: 'photobook-theater',
            icon: Film,
            title: language === 'ko' ? '🎬 극장 모드 자동 슬라이드쇼' : '🎬 Theater Mode Slideshow',
            desc: language === 'ko' 
              ? '배경음악과 부드러운 화면 전환 효과와 함께 편안하게 영화처럼 전신 감상합니다.' 
              : 'Enjoy an automated full-screen slideshow with soothing background music.'
          },
          {
            id: 'photobook-create',
            icon: Calendar,
            title: language === 'ko' ? '📅 기간 지정 새 사진첩 맞춤 제작' : '📅 Create New Album by Date Range',
            desc: language === 'ko' 
              ? '최근 1달이나 특정 휴가 기간 사진만 모아 AI가 무의미한 사진을 거르고 새 책을 만듭니다.' 
              : 'Filter out meaningless photos and bind chosen date range into a new masterpiece.'
          }
        ];
      case 'browse':
        return [
          {
            id: 'browse-timeline',
            icon: Calendar,
            recommended: true,
            title: language === 'ko' ? '📅 날짜 & 월별 타임라인으로 감상' : '📅 Chronological Monthly Timeline',
            desc: language === 'ko' 
              ? '최근 찍은 순서대로 시간 흐름을 따라 편안하게 사진을 둘러봅니다.' 
              : 'Scroll through all your preserved memories in smooth chronological order.'
          },
          {
            id: 'browse-people',
            icon: Users,
            title: language === 'ko' ? '👤 인물(얼굴)별 자동 모아보기' : '👤 Person & Faces Gallery',
            desc: language === 'ko' 
              ? '가족, 친구 등 동일한 인물 얼굴 벡터로 분류된 사진들을 모아서 확인합니다.' 
              : 'See photos grouped by individuals and family members using on-device face analysis.'
          },
          {
            id: 'browse-search',
            icon: Search,
            title: language === 'ko' ? '🔍 키워드나 조건으로 빠르게 검색' : '🔍 Smart Search & Filter',
            desc: language === 'ko' 
              ? '음식, 여행, 풍경, 카메라 모델 또는 텍스트 검색으로 원하는 사진을 즉시 찾습니다.' 
              : 'Quickly find photos by category, tags, camera model, or search terms.'
          }
        ];
      case 'import':
        return [
          {
            id: 'import-folder',
            icon: FolderSearch,
            recommended: true,
            title: language === 'ko' ? '📂 컴퓨터 사진 폴더 통째로 선택' : '📂 Select PC Folder (Full Scan)',
            desc: language === 'ko' 
              ? '내 컴퓨터나 외장하드의 사진 폴더를 지정하여 기기 안에서 100% 안전하게 색인합니다.' 
              : 'Point to a local pictures folder on your computer to index all media safely on-device.'
          },
          {
            id: 'import-files',
            icon: ImageIcon,
            title: language === 'ko' ? '🖼️ 원하는 개별 사진 파일만 선택' : '🖼️ Pick Specific Photo Files',
            desc: language === 'ko' 
              ? '스마트폰 갤러리나 탐색기에서 원하는 사진들만 골라서 바로 등록합니다.' 
              : 'Select individual image or video files directly from your device.'
          },
          {
            id: 'import-demo',
            icon: Sparkles,
            title: language === 'ko' ? '🌟 샘플 데모 사진으로 먼저 둘러보기' : '🌟 Load Demo Sample Photos',
            desc: language === 'ko' 
              ? '내 사진이 준비되지 않아도 앱의 중복 정리, 3D 사진첩 등 모든 기능을 미리 체험해봅니다.' 
              : 'Explore all features immediately using pre-loaded high quality sample photos.'
          }
        ];
      default:
        return [];
    }
  };

  const detailOptions = getDetailOptions();

  // Handle final start action
  const handleStartAction = () => {
    let targetTab = 'duplicates';
    if (selectedGoal === 'duplicates') targetTab = 'duplicates';
    if (selectedGoal === 'photobook') targetTab = 'photobook';
    if (selectedGoal === 'browse') {
      if (selectedOption === 'browse-people') targetTab = 'people';
      else targetTab = 'library';
    }
    if (selectedGoal === 'import') targetTab = 'library';

    onExecute({
      actionType: selectedOption as any,
      targetTab,
      payload: { goal: selectedGoal }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[92dvh] bg-slate-900 border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col text-slate-100 overflow-hidden my-auto"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {language === 'ko' ? '초보자 맞춤 도우미 마법사' : 'Easy Beginner Guide Wizard'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {language === 'ko' ? '초보자 환영' : 'Beginner Friendly'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ko'
                  ? '복잡한 메뉴 대신 질문 2가지에 답변하시면 원하는 화면으로 즉시 연결해 드립니다.'
                  : 'Answer 2 quick questions to be guided directly to the right tool.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center justify-between py-3 px-1 shrink-0 text-xs text-slate-400 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {step > 1 ? <Check size={12} /> : '1'}
            </span>
            <span className={step === 1 ? 'font-bold text-white' : 'text-slate-400'}>
              {language === 'ko' ? '목적 선택' : 'Choose Goal'}
            </span>
          </div>

          <div className="h-px w-8 sm:w-16 bg-white/10" />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              step === 2 ? 'bg-indigo-600 text-white' : step > 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-slate-400'
            }`}>
              {step > 2 ? <Check size={12} /> : '2'}
            </span>
            <span className={step === 2 ? 'font-bold text-white' : 'text-slate-400'}>
              {language === 'ko' ? '세부 방식' : 'Preferences'}
            </span>
          </div>

          <div className="h-px w-8 sm:w-16 bg-white/10" />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              step === 3 ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-400'
            }`}>
              3
            </span>
            <span className={step === 3 ? 'font-bold text-white' : 'text-slate-400'}>
              {language === 'ko' ? '추천 완료' : 'Recommendation'}
            </span>
          </div>
        </div>

        {/* Scrollable Question Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 py-4 space-y-4 min-h-0">
          {/* STEP 1: Main Goal Question */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="text-amber-400">Q1.</span>
                  <span>{language === 'ko' ? '오늘 어떤 작업을 가장 먼저 하고 싶으신가요?' : 'What would you like to accomplish today?'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'ko' ? '아래에서 원하시는 목적을 하나 골라주세요.' : 'Select one primary goal from the options below.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {goals.map((g) => {
                  const isSelected = selectedGoal === g.id;
                  const Icon = g.icon;

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setSelectedGoal(g.id as any);
                        setSelectedOption(g.defaultOption);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? 'bg-slate-800/95 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                          : 'bg-slate-950/60 hover:bg-slate-800/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${g.color} text-white shadow-md`}>
                          <Icon size={20} />
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-white/20'
                        }`}>
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-sm text-white group-hover:text-amber-200 transition-colors">
                          {g.title}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {g.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Detail Options Question */}
          {step === 2 && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span className="text-amber-400">Q2.</span>
                  <span>{language === 'ko' ? '어떤 방식으로 진행하고 싶으신가요?' : 'How would you prefer to handle this?'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'ko' ? '가장 마음에 드는 추천 방식을 선택해 주세요.' : 'Choose the best method tailored to your preferences.'}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {detailOptions.map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  const Icon = opt.icon;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOption(opt.id)}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer relative ${
                        isSelected
                          ? 'bg-slate-800/95 border-indigo-400 ring-2 ring-indigo-400/30 shadow-lg'
                          : 'bg-slate-950/60 hover:bg-slate-800/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-300 border border-white/10'
                      }`}>
                        <Icon size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">
                            {opt.title}
                          </span>
                          {opt.recommended && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                              {language === 'ko' ? '추천 코스' : 'Recommended'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>

                      <div className={`w-5 h-5 rounded-full border shrink-0 mt-1 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-white/20'
                      }`}>
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Summary & 1-Click Launch */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <Sparkles size={14} />
                  <span>{language === 'ko' ? '회원님을 위한 맞춤 추천 솔루션' : 'Personalized Recommended Action'}</span>
                </div>

                <div className="bg-slate-900/90 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span>
                      {detailOptions.find(o => o.id === selectedOption)?.title || goals.find(g => g.id === selectedGoal)?.title}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-6">
                    {detailOptions.find(o => o.id === selectedOption)?.desc}
                  </p>
                </div>

                <div className="space-y-2 pt-1 text-xs text-slate-300">
                  <div className="font-semibold text-slate-200">
                    {language === 'ko' ? '📌 아래 [지금 바로 시작하기]를 누르시면:' : '📌 What happens when you click Start:'}
                  </div>
                  <ul className="space-y-1.5 pl-4 list-disc text-slate-400">
                    {selectedGoal === 'duplicates' && (
                      <>
                        <li>{language === 'ko' ? '복잡한 설정 없이 중복 사진 정리 화면으로 즉시 이동합니다.' : 'Instantly switches to the Duplicates Clean tab with optimal presets.'}</li>
                        <li>{language === 'ko' ? '안전하게 사진을 휴지통에 보관하므로 언제든 복원할 수 있습니다.' : 'Files are safely moved to Trash where they can be restored anytime.'}</li>
                      </>
                    )}
                    {selectedGoal === 'photobook' && (
                      <>
                        <li>{language === 'ko' ? '디지털 사진첩 탭으로 이동하여 선택하신 뷰 모드를 즉시 활성화합니다.' : 'Opens Photobook tab and activates your chosen viewing experience.'}</li>
                        <li>{language === 'ko' ? 'AI 의미 없는 사진 필터링이 켜져 있어 깔끔한 베스트 컷만 모아집니다.' : 'AI relevance filtering ensures only your best photos are showcased.'}</li>
                      </>
                    )}
                    {selectedGoal === 'browse' && (
                      <>
                        <li>{language === 'ko' ? '사진 보관함으로 이동하여 선택하신 타임라인 또는 인물 뷰가 열립니다.' : 'Navigates to the library or people hub tailored to your view preference.'}</li>
                      </>
                    )}
                    {selectedGoal === 'import' && (
                      <>
                        <li>{language === 'ko' ? '사진 선택 창이 즉시 열려 원하는 폴더나 파일을 쉽게 지정할 수 있습니다.' : 'Directly triggers the file or folder picker for seamless indexing.'}</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {photoCount === 0 && selectedGoal !== 'import' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-200">
                  <span>
                    {language === 'ko' ? '💡 아직 등록된 사진이 없다면 먼저 샘플 데모를 불러와 테스트해 보세요!' : '💡 No photos indexed yet? You can try sample demo photos first!'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoal('import');
                      setSelectedOption('import-demo');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all shrink-0 ml-2"
                  >
                    {language === 'ko' ? '데모로 변경' : 'Switch to Demo'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 shrink-0 gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{language === 'ko' ? '이전 질문' : 'Back'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              {language === 'ko' ? '나중에 하기' : 'Cancel'}
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as any)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <span>{language === 'ko' ? '다음 단계' : 'Next'}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartAction}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-black transition-all flex items-center gap-2 shadow-xl shadow-emerald-600/30 cursor-pointer animate-pulse"
            >
              <Zap size={14} className="fill-current" />
              <span>{language === 'ko' ? '지금 바로 시작하기' : 'Start Now'}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
