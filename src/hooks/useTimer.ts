import { useState, useCallback, useRef, useEffect } from "react";

interface TimerState {
  accumulatedElapsed: number;
  startTsMs: number | null;
  running: boolean;
}

export interface UseTimerReturn {
  start: () => void;
  pause: () => void;
  reset: () => void;
  setInitialElapsed: (ms: number) => void;
  getElapsedMs: () => number;
  isRunning: boolean;
  displayTime: number;
}

const nowMonotonic = (): number => {
  return typeof performance !== "undefined" && performance.now 
    ? performance.now() 
    : Date.now();
};

export const useTimer = (initialElapsed: number = 0): UseTimerReturn => {
  const [state, setState] = useState<TimerState>({
    accumulatedElapsed: initialElapsed,
    startTsMs: null,
    running: false,
  });
  
  const [displayTime, setDisplayTime] = useState(Math.floor(initialElapsed / 1000));
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);

  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const getElapsedMs = useCallback((): number => {
    const current = stateRef.current;
    if (current.running && current.startTsMs !== null) {
      return current.accumulatedElapsed + (nowMonotonic() - current.startTsMs);
    }
    return current.accumulatedElapsed;
  }, []);

  const start = useCallback(() => {
    setState((prev) => {
      if (prev.running) return prev;
      return {
        ...prev,
        startTsMs: nowMonotonic(),
        running: true,
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev.running) return prev;
      const elapsed = prev.startTsMs !== null 
        ? prev.accumulatedElapsed + (nowMonotonic() - prev.startTsMs)
        : prev.accumulatedElapsed;
      return {
        accumulatedElapsed: elapsed,
        startTsMs: null,
        running: false,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      accumulatedElapsed: 0,
      startTsMs: null,
      running: false,
    });
  }, []);

  const setInitialElapsed = useCallback((ms: number) => {
    setState((prev) => ({
      ...prev,
      accumulatedElapsed: ms,
    }));
  }, []);

  // Update display time using RAF for smooth rendering
  useEffect(() => {
    if (state.running && state.startTsMs !== null) {
      const updateDisplay = () => {
        const elapsed = getElapsedMs();
        setDisplayTime(Math.floor(elapsed / 1000));
        rafRef.current = requestAnimationFrame(updateDisplay);
      };
      rafRef.current = requestAnimationFrame(updateDisplay);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDisplayTime(Math.floor(state.accumulatedElapsed / 1000));
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state.running, state.startTsMs, state.accumulatedElapsed, getElapsedMs]);

  return {
    start,
    pause,
    reset,
    setInitialElapsed,
    getElapsedMs,
    isRunning: state.running,
    displayTime,
  };
};
