import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Sparkles, 
  X, 
  Download, 
  Play, 
  Pause, 
  Clock, 
  Maximize, 
  Smartphone,
  AlertCircle,
  Wand2,
  Settings
} from 'lucide-react';
import { PhotoRecord } from '../services/db';
import { animateImageIntoVideo } from '../services/geminiService';
import { SystemAPI } from '../services/systemApi';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = (reader.result as string) || '';
      resolve(dataUrl.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface AiVideoGeneratorModalProps {
  photo: PhotoRecord;
  onClose: () => void;
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  language?: string;
}

export const AiVideoGeneratorModal: React.FC<AiVideoGeneratorModalProps> = ({
  photo,
  onClose,
  addNotification,
  language = 'en'
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = SystemAPI.getImageUrl(photo.path, 'full');
    if (url) {
      setImgSrc(url);
    } else if (photo.blob) {
      const blobUrl = URL.createObjectURL(photo.blob);
      setImgSrc(blobUrl);
      return () => URL.revokeObjectURL(blobUrl);
    } else if (photo.thumbnail) {
      const blobUrl = URL.createObjectURL(photo.thumbnail);
      setImgSrc(blobUrl);
      return () => URL.revokeObjectURL(blobUrl);
    }
  }, [photo.path, photo.blob, photo.thumbnail]);

  const handleGenerate = async () => {
    if (isGenerating) return;

    // Trigger paid model flow UI if available in environment
    try {
      if (typeof (window as any).show_aistudio_ui === 'function') {
        (window as any).show_aistudio_ui({ ui_type: 'paid_model_flow' });
      }
    } catch {
      // Ignored
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedVideoUrl(null);

    // Progress simulation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 2;
      });
    }, 2000);

    try {
      let base64 = '';
      if (photo.blob) {
        base64 = await blobToBase64(photo.blob);
      } else if (photo.thumbnail) {
        base64 = await blobToBase64(photo.thumbnail);
      } else if (imgSrc) {
        try {
          const resp = await fetch(imgSrc);
          const b = await resp.blob();
          base64 = await blobToBase64(b);
        } catch {
          base64 = '';
        }
      }
      
      const result = await animateImageIntoVideo(base64 || photo.path, prompt, aspectRatio);
      
      if (result && result.videoData) {
        const videoBlob = await (await fetch(`data:${result.mimeType};base64,${result.videoData}`)).blob();
        const url = URL.createObjectURL(videoBlob);
        setGeneratedVideoUrl(url);
        setProgress(100);
        addNotification(
          language === 'ko' ? 'AI 비디오 생성 완료' : 'AI Video Generated',
          language === 'ko' ? '사진이 생동감 넘치는 영상으로 변환되었습니다.' : 'Your photo has been transformed into a motion video.',
          'success'
        );
      } else {
        throw new Error('No video data returned');
      }
    } catch (err) {
      console.error(err);
      addNotification(
        language === 'ko' ? '생성 실패' : 'Generation Failed',
        language === 'ko' ? 'AI 비디오 생성 중 오류가 발생했습니다.' : 'Failed to generate AI video. Please try again.',
        'error'
      );
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideoUrl) return;
    const a = document.createElement('a');
    a.href = generatedVideoUrl;
    a.download = `snapclean_ai_motion_${photo.id || Date.now()}.mp4`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Preview */}
        <div className="flex-1 bg-black relative flex items-center justify-center min-h-[300px] md:min-h-0">
          <AnimatePresence mode="wait">
            {!generatedVideoUrl ? (
              <motion.div 
                key="image-preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full relative"
              >
                {imgSrc ? (
                  <img src={imgSrc} className="w-full h-full object-contain" alt="Source" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <Clock className="animate-spin mr-2" /> Loading Source...
                  </div>
                )}
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-full max-w-xs space-y-4">
                      <div className="flex justify-between text-xs font-mono text-blue-400 mb-1">
                        <span>AI_OMNI_ANIMATION_ENGINE</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          className="h-full bg-linear-to-r from-blue-500 via-purple-500 to-amber-500"
                          animate={{ width: `${progress}%` }}
                          transition={{ type: 'spring', damping: 20 }}
                        />
                      </div>
                      <p className="text-sm font-bold text-white animate-pulse">
                        {language === 'ko' ? 'AI가 사진의 움직임을 상상하는 중...' : 'Gemini Omni is imagining the motion...'}
                      </p>
                      <p className="text-[10px] text-slate-400 italic">
                        {language === 'ko' ? '최대 1~3분 정도 소요될 수 있습니다.' : 'This may take up to 1-3 minutes.'}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="video-preview"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full"
              >
                <video 
                  src={generatedVideoUrl} 
                  className="w-full h-full object-contain" 
                  controls 
                  autoPlay 
                  loop 
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg flex items-center gap-1">
                    <Sparkles size={12} /> AI GENERATED
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-80 p-6 md:p-8 flex flex-col border-t md:border-t-0 md:border-l border-white/10 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Video size={20} />
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">AI Motion</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">
                {language === 'ko' ? '모션 프롬프트 (선택 사항)' : 'Motion Prompt (Optional)'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={language === 'ko' ? '예: 부드럽게 일렁이는 파도, 웃고 있는 얼굴...' : 'e.g. gentle waves, smiling face, wind blowing through hair...'}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 min-h-[100px] resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">
                {language === 'ko' ? '화면 비율' : 'Aspect Ratio'}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    aspectRatio === '16:9' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Maximize size={14} /> 16:9
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    aspectRatio === '9:16' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Smartphone size={14} /> 9:16
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {!generatedVideoUrl ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Wand2 size={18} className={isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'} />
                <span>{isGenerating ? (language === 'ko' ? 'AI 엔진 가동 중...' : 'Generating...') : (language === 'ko' ? 'AI 모션 비디오 생성' : 'Generate AI Video')}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleDownload}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  <span>{language === 'ko' ? '비디오 다운로드' : 'Download Video'}</span>
                </button>
                <button
                  onClick={() => setGeneratedVideoUrl(null)}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  <span>{language === 'ko' ? '다시 생성' : 'Regenerate'}</span>
                </button>
              </>
            )}
          </div>

          <div className="mt-auto bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-200/80 leading-relaxed">
              {language === 'ko' 
                ? 'Gemini Omni 모델을 사용하여 정지된 사진에 생동감을 불어넣습니다. 유료 티어 기능이며 생성에 수 분이 소요될 수 있습니다.' 
                : 'Using Gemini Omni model to animate your photo. This is a pro feature and generation can take several minutes.'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RotateCcw = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);
