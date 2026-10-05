import { useState, useEffect, useCallback } from 'react';
import {
  updateChecker,
  UpdateCheckResult,
  GITHUB_REPO_CONFIG,
} from '../services/updateChecker';
import { APP_VERSION_INFO } from '../version';

export function useUpdateChecker() {
  const [result, setResult] = useState<UpdateCheckResult>(() => {
    return (
      updateChecker.getLastResult() || {
        status: 'idle',
        hasUpdate: false,
        currentVersion: APP_VERSION_INFO.version,
        latestVersion: APP_VERSION_INFO.version,
        checkedAt: new Date().toISOString(),
      }
    );
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoCheck, setAutoCheckState] = useState(() => updateChecker.isAutoCheckEnabled());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<UpdateCheckResult>).detail;
      if (detail) {
        setResult(detail);
      }
    };

    const handleAvailable = (e: Event) => {
      const detail = (e as CustomEvent<UpdateCheckResult>).detail;
      if (detail && detail.hasUpdate) {
        // Automatically pop modal if not previously dismissed for this version
        const ignored = updateChecker.getIgnoredVersion();
        if (ignored !== detail.latestVersion) {
          setIsModalOpen(true);
        }
      }
    };

    window.addEventListener('snapclean-update-check', handleUpdate);
    window.addEventListener('snapclean-update-available', handleAvailable);

    return () => {
      window.removeEventListener('snapclean-update-check', handleUpdate);
      window.removeEventListener('snapclean-update-available', handleAvailable);
    };
  }, []);

  const checkForUpdates = useCallback(async (force: boolean = true) => {
    return await updateChecker.checkForUpdates(force);
  }, []);

  const simulateUpdate = useCallback((fakeVersion: string = '2.5.0') => {
    const sim = updateChecker.simulateNewRelease(fakeVersion);
    setIsModalOpen(true);
    return sim;
  }, []);

  const setAutoCheck = useCallback((enabled: boolean) => {
    updateChecker.setAutoCheckEnabled(enabled);
    setAutoCheckState(enabled);
  }, []);

  const ignoreCurrentVersion = useCallback(() => {
    if (result.latestVersion) {
      updateChecker.setIgnoredVersion(result.latestVersion);
      setIsModalOpen(false);
    }
  }, [result.latestVersion]);

  return {
    status: result.status,
    hasUpdate: result.hasUpdate,
    currentVersion: result.currentVersion,
    latestVersion: result.latestVersion,
    release: result.release,
    checkedAt: result.checkedAt,
    errorMessage: result.errorMessage,
    isSimulated: result.isSimulated,
    isChecking: result.status === 'checking',
    isModalOpen,
    setIsModalOpen,
    autoCheck,
    setAutoCheck,
    checkForUpdates,
    simulateUpdate,
    ignoreCurrentVersion,
    repoConfig: GITHUB_REPO_CONFIG,
  };
}
