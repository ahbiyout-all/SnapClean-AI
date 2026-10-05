import React from 'react';
import { 
  Wand2, 
  Sparkles, 
  Layers, 
  Image as ImageIcon 
} from 'lucide-react';
import { db } from '../../services/db';
import { SystemAPI } from '../../services/systemApi';
import { useI18n } from '../../i18n/context';

interface EnhancementTabProps {
  setModal: (modal: any) => void;
}

export const EnhancementTab = ({ setModal }: EnhancementTabProps) => {
  const { t } = useI18n();

  const [uploadedImage, setUploadedImage] = React.useState<string | null>(null);
  const [processedImage, setProcessedImage] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [activeMode, setActiveMode] = React.useState<'upscale' | 'color' | null>(null);
  const [sliderPosition, setSliderPosition] = React.useState(50);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setProcessedImage(null);
        setActiveMode(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setProcessedImage(null);
        setActiveMode(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runSampleEnhance = (mode: 'upscale' | 'color') => {
    if (!uploadedImage) return;
    setIsProcessing(true);
    setActiveMode(mode);
    setTimeout(() => {
      setIsProcessing(false);
      setProcessedImage(uploadedImage);
    }, 1800);
  };

  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      handleSliderMove(e.clientX);
    }
  };

  return (
    <div className="space-y-8 flex flex-col h-full animate-in fade-in duration-500 text-white">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <Wand2 size={32} className="text-purple-500" />
            {t('aiEnhancementHub')}
          </h2>
          <p className="text-slate-400 font-medium">{t('aiEnhancementHubDesc')}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-[2.5rem] border-white/5 relative flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 border border-purple-500/20">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('superResolutionTitle')}</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t('superResolutionDesc')}
            </p>
          </div>
          <button
            onClick={async () => {
              if (uploadedImage) {
                runSampleEnhance('upscale');
                return;
              }
              const photos = await db.photos.limit(1).toArray();
              if (photos.length === 0) {
                setModal({ type: 'alert', title: 'Library Empty', message: 'Add photos or drag one below to use this feature.' });
                return;
              }
              const path = photos[0].path;
              const res = await SystemAPI.superResolutionOnnx(path);
              setModal({
                type: 'alert',
                title: t('superResolutionComplete'),
                message: t('superResolutionResult', { count: 1, model: res.model, original: res.originalResolution, newRes: res.newResolution, time: res.processingTimeMs })
              });
            }}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-purple-600/20 transition-all cursor-pointer"
          >
            {uploadedImage ? 'APPLY SUPER_RES ON CURRENT' : t('findLowResUpscale')}
          </button>
        </div>
        
        <div className="glass p-8 rounded-[2.5rem] border-white/5 relative flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 mb-6 border border-orange-500/20">
              <Layers size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('neuralColorCorrectionTitle')}</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t('neuralColorCorrectionDesc')}
            </p>
          </div>
          <button
            onClick={async () => {
              if (uploadedImage) {
                runSampleEnhance('color');
                return;
              }
              const photos = await db.photos.limit(1).toArray();
              if (photos.length === 0) {
                setModal({ type: 'alert', title: 'Library Empty', message: 'Add photos or drag one below to use this feature.' });
                return;
              }
              const path = photos[0].path;
              const res = await SystemAPI.colorCorrectionOnnx(path);
              setModal({
                type: 'alert',
                title: t('colorCorrectionComplete'),
                message: t('colorCorrectionResult', { count: 1, model: res.model, exposure: res.adjustments.exposure, whiteBalance: res.adjustments.whiteBalance, saturation: res.adjustments.saturation, time: res.processingTimeMs })
              });
            }}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all font-bold cursor-pointer"
          >
            {uploadedImage ? 'CORRECT EXPOSURE ON CURRENT' : t('balanceExposureColor')}
          </button>
        </div>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !uploadedImage && fileInputRef.current?.click()}
        className={`mt-4 glass p-8 rounded-[3rem] border-white/5 flex flex-col justify-center items-center text-center transition-all min-h-[380px] relative overflow-hidden select-none ${!uploadedImage ? 'cursor-pointer hover:border-purple-500/20 hover:bg-white/2' : ''}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {uploadedImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6">
            <div className="flex justify-between items-center w-full max-w-2xl px-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 border border-white/5 px-3 py-1 rounded-xl">
                  AI Sandbox Mode
                </span>
                {activeMode && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-xl animate-pulse">
                    Mode: {activeMode === 'upscale' ? 'ONNX super resolution' : 'Neural Color curves'}
                  </span>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadedImage(null);
                  setProcessedImage(null);
                  setActiveMode(null);
                }}
                className="text-[10px] font-black tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
              >
                RESET CANVAS
              </button>
            </div>

            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Sparkles size={40} className="text-purple-400 animate-spin" />
                <span className="text-xs font-mono font-black tracking-widest text-slate-500 uppercase">
                  Accelerating network model weights...
                </span>
              </div>
            ) : processedImage ? (
              <div 
                ref={containerRef}
                onMouseMove={onMouseMove}
                onTouchMove={onTouchMove}
                className="relative w-full max-w-2xl h-80 rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-indigo-500/10 select-none cursor-ew-resize"
              >
                {/* Before: Left Side (Original Image) */}
                <img 
                  src={uploadedImage} 
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
                  alt="original" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 z-10 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest">
                  Original
                </div>

                {/* After: Right Side (Processed Image) with filter or styles applied dynamically */}
                <div 
                  className="absolute inset-y-0 right-0 overflow-hidden" 
                  style={{ left: `${sliderPosition}%` }}
                >
                  <img 
                    src={processedImage} 
                    className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none max-w-none ${
                      activeMode === 'upscale' ? 'scale-[1.02] contrast-105 saturate-105 blur-[0.1px]' : 'saturate-125 contrast-110 brightness-110 border-blue-500 shadow-2xl'
                    }`} 
                    style={{ 
                      width: containerRef.current?.getBoundingClientRect().width || '100%',
                      transform: `translateX(-${sliderPosition}%)`
                    }}
                    alt="processed" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 z-10 bg-purple-600/90 px-2.5 py-1 rounded-lg border border-purple-500 text-[9px] font-black uppercase tracking-widest">
                    AI Enhanced
                  </div>
                </div>

                {/* Divider Line */}
                <div 
                  className="absolute inset-y-0 w-1 bg-white hover:bg-indigo-400 cursor-ew-resize flex items-center justify-center shadow-lg"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-white flex items-center justify-center text-xs shadow-2xl text-slate-300 font-bold whitespace-nowrap">
                    ↔
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 items-center">
                <img 
                  src={uploadedImage} 
                  className="w-48 h-32 object-cover rounded-xl border border-white/10 shadow-lg" 
                  alt="preview" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-md font-bold text-white mb-1">Image loaded securely</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Select Super-Res or Color correction from the cards above to proceed
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="w-24 h-24 border-4 border-dashed border-white/10 rounded-full flex items-center justify-center text-slate-500 mb-4 pointer-events-none">
              <ImageIcon size={40} />
            </div>
            <h4 className="text-lg font-bold mb-2">{t('dragPhotoHere')}</h4>
            <p className="text-sm text-slate-400 max-w-sm">
              {t('dragPhotoDesc')}
            </p>
            <div className="mt-6 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              BROWSE FILE...
            </div>
          </>
        )}
      </div>
    </div>
  );
};
