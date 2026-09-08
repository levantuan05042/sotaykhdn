import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import UnsavedChangesModal from '../components/ui/UnsavedChangesModal';

export const useUnsavedChangesGuard = (when: boolean) => {
  const skipRef = useRef(false);
  const [reloadArmed, setReloadArmed] = useState(false);

  const allowLeave = useCallback(() => {
    skipRef.current = true;
  }, []);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!when || skipRef.current) return false;
    return currentLocation.pathname !== nextLocation.pathname
      || currentLocation.search !== nextLocation.search;
  });

  useEffect(() => {
    if (!when && blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [when, blocker]);

  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (skipRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (skipRef.current) return;
      const isReload = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r');
      if (!isReload) return;
      e.preventDefault();
      setReloadArmed(true);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [when]);

  const handleStay = () => {
    setReloadArmed(false);
    if (blocker.state === 'blocked') blocker.reset();
  };

  const handleLeave = () => {
    if (reloadArmed) {
      skipRef.current = true;
      setReloadArmed(false);
      window.location.reload();
      return;
    }
    if (blocker.state === 'blocked') blocker.proceed();
  };

  const dialog = (
    <UnsavedChangesModal
      isOpen={reloadArmed || blocker.state === 'blocked'}
      onStay={handleStay}
      onLeave={handleLeave}
    />
  );

  return { allowLeave, dialog };
};
