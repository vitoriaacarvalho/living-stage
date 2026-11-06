import { useEffect, useEffectEvent } from 'react';

// iPhone Safari has no full screen API, so presentation mode then just fills the page.
export function enterFullScreen() {
  document.documentElement.requestFullscreen?.().catch(() => {});
}

export function leaveFullScreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// The browser's own Escape leaves full screen without a keydown reaching the page.
export function useFullScreenExit(onExit: () => void) {
  const exit = useEffectEvent(onExit);
  useEffect(() => {
    function onChange() {
      if (!document.fullscreenElement) exit();
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
}
