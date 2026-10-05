import React, { useState } from "react";
import { Sparkles, Key, Eye, EyeOff, Check, Trash2, ExternalLink, X, AlertCircle } from "lucide-react";
import { useAiApiKey } from "../hooks/useAiApiKey";
import { useI18n } from "../i18n/context";

interface AiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  featureName?: string;
}

export const AiApiKeyModal: React.FC<AiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  featureName
}) => {
  const { apiKey, isConfigured, saveKey, clearKey } = useAiApiKey();
  const { language } = useI18n();
  const [inputKey, setInputKey] = useState<string>(apiKey || "");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setInputKey(apiKey || "");
      setSavedSuccess(false);
    }
  }, [isOpen, apiKey]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    saveKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSuccess?.();
      onClose();
    }, 800);
  };

  const handleRemove = () => {
    clearKey();
    setInputKey("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      <div className="glass p-6 md:p-8 rounded-[2.5rem] border border-white/10 w-full max-w-lg shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shrink-0">
            <Sparkles size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white tracking-tight">
                {language === "ko" ? "Gemini AI API 키 설정" : "Gemini AI API Key Setup"}
              </h3>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  isConfigured
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                }`}
              >
                {isConfigured
                  ? language === "ko" ? "AI 활성화됨" : "AI ACTIVE"
                  : language === "ko" ? "키 필요" : "KEY REQUIRED"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {featureName
                ? language === "ko"
                  ? `'${featureName}' 기능을 사용하려면 AI API 키가 필요합니다.`
                  : `AI API key is required to use '${featureName}'.`
                : language === "ko"
                  ? "본인의 Gemini API Key를 입력하여 모든 AI 기능을 활성화하세요."
                  : "Input your Gemini API Key to activate all AI features."}
            </p>
          </div>
        </div>

        {savedSuccess ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center my-4 animate-scale-up">
            <Check size={36} className="text-emerald-400 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white">
              {language === "ko" ? "AI API 키가 저장되었습니다!" : "AI API Key Saved!"}
            </h4>
            <p className="text-xs text-emerald-300 mt-1">
              {language === "ko" ? "이제 모든 AI 기능이 활성화되었습니다." : "All AI features are now enabled."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                {language === "ko" ? "Gemini API 키 (Google GenAI)" : "Gemini API Key (Google GenAI)"}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex items-start gap-3 text-xs text-slate-400">
              <AlertCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span>
                  {language === "ko"
                    ? "API 키는 브라우저 보안 영역에 저장되며 external 서버로 전송되지 않습니다."
                    : "Your API key is stored securely in your local environment."}
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold ml-1.5 underline"
                >
                  {language === "ko" ? "Google AI Studio에서 무료 키 발급" : "Get a free key from Google AI Studio"}
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {apiKey ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  {language === "ko" ? "키 삭제" : "Remove Key"}
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {language === "ko" ? "취소" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!inputKey.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Key size={14} />
                  {language === "ko" ? "저장 및 AI 활성화" : "Save & Activate AI"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
