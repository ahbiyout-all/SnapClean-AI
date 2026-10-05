import { useState, useEffect } from "react";
import {
  getEffectiveApiKey,
  getCustomApiKey,
  setCustomApiKey,
  removeCustomApiKey,
  hasAiApiKey,
  API_KEY_CHANGE_EVENT
} from "../services/geminiService";

export function useAiApiKey() {
  const [apiKey, setApiKey] = useState<string>(() => getCustomApiKey());
  const [isConfigured, setIsConfigured] = useState<boolean>(() => hasAiApiKey());

  useEffect(() => {
    const handleUpdate = () => {
      setApiKey(getCustomApiKey());
      setIsConfigured(hasAiApiKey());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(API_KEY_CHANGE_EVENT, handleUpdate);
      window.addEventListener("storage", handleUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(API_KEY_CHANGE_EVENT, handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      }
    };
  }, []);

  const saveKey = (key: string) => {
    setCustomApiKey(key);
  };

  const clearKey = () => {
    removeCustomApiKey();
  };

  return {
    apiKey,
    effectiveKey: getEffectiveApiKey(),
    isConfigured,
    saveKey,
    clearKey
  };
}
