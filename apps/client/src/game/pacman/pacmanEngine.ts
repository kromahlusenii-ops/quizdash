/**
 * TypeScript wrapper for the vanilla JS Pac-Man engine.
 *
 * The vendor code is concatenated into pacman-bundle.js (loaded as a script tag
 * or via dynamic import). It exposes window.__pacman with control functions.
 */

declare global {
  interface Window {
    __pacman?: {
      initPacman: (canvas: HTMLCanvasElement, options?: PacManOptions) => void;
      executive: {
        start: () => void;
        stop: () => void;
        setPaused: (val: boolean) => void;
        togglePause: () => void;
        isPaused: () => boolean;
        destroy: () => void;
      };
      energizer: {
        activate: () => void;
        isActive: () => boolean;
      };
      getScore: () => number;
      cleanupInput: () => void;
      audio: {
        silence: (noResetTime?: boolean) => void;
      };
    };
  }
}

interface PacManOptions {
  onGameOver?: () => void;
}

export interface PacManController {
  start: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
  getScore: () => number;
  triggerEnergizer: () => void;
  onGameOver: (cb: () => void) => void;
}

let scriptLoaded = false;

function loadPacManScript(): Promise<void> {
  if (scriptLoaded && window.__pacman) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/pacman/pacman-bundle.js';
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Pac-Man engine'));
    document.head.appendChild(script);
  });
}

export async function createPacManGame(
  canvas: HTMLCanvasElement,
  options?: PacManOptions
): Promise<PacManController> {
  await loadPacManScript();

  const pm = window.__pacman!;
  let gameOverCallback = options?.onGameOver || null;

  pm.initPacman(canvas, {
    onGameOver: () => {
      if (gameOverCallback) gameOverCallback();
    },
  });

  return {
    start() {
      pm.executive.start();
    },
    pause() {
      pm.executive.setPaused(true);
    },
    resume() {
      pm.executive.setPaused(false);
    },
    destroy() {
      pm.audio.silence();
      pm.executive.destroy();
      pm.cleanupInput();
    },
    getScore() {
      return pm.getScore();
    },
    triggerEnergizer() {
      pm.energizer.activate();
    },
    onGameOver(cb: () => void) {
      gameOverCallback = cb;
    },
  };
}
