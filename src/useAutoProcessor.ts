import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_IDLE_MS = 700;
const DEFAULT_MAX_WAIT_MS = 5000;

export interface AutoProcessRequest {
  text: string;
  promptName: string;
  requestKey: string;
}

interface AutoProcessResult {
  requestKey: string;
  result?: string;
}

interface UseAutoProcessorOptions {
  input: string;
  promptName: string;
  process: (text: string, promptName: string, signal: AbortSignal) => Promise<string>;
  onResult: (result: string, request: AutoProcessRequest) => void;
  onError?: (error: unknown) => void | Promise<void>;
  onReset?: () => void;
  idleMs?: number;
  maxWaitMs?: number;
}

export function buildRequestKey(text: string, promptName: string) {
  return `${promptName}\0${text.trim()}`;
}

export function useAutoProcessor({
  input,
  promptName,
  process,
  onResult,
  onError,
  onReset,
  idleMs = DEFAULT_IDLE_MS,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
}: UseAutoProcessorOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [outputKey, setOutputKey] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestInputRef = useRef(input);
  const latestPromptRef = useRef(promptName);
  const lastInputAtRef = useRef(0);
  const burstStartAtRef = useRef(0);
  const activeProcessRef = useRef<Promise<AutoProcessResult | undefined> | null>(null);
  const queuedRef = useRef(false);
  const queuedForceRef = useRef(false);
  const lastCompletedKeyRef = useRef("");
  const lastCompletedOutputRef = useRef("");
  const unmountedRef = useRef(false);
  const processRef = useRef(process);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onResetRef = useRef(onReset);
  const runProcessRef = useRef<(force?: boolean) => void>(() => {});

  useEffect(() => {
    processRef.current = process;
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    onResetRef.current = onReset;
  }, [onError, onReset, onResult, process]);

  const clearScheduledProcess = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
  }, []);

  const scheduleProcess = useCallback(() => {
    clearScheduledProcess();

    if (!latestInputRef.current.trim() || !latestPromptRef.current) {
      return;
    }

    if (activeProcessRef.current) {
      queuedRef.current = true;
      return;
    }

    const now = Date.now();
    if (!burstStartAtRef.current) {
      burstStartAtRef.current = now;
    }

    const idleDelay = Math.max(idleMs - (now - lastInputAtRef.current), 0);
    const maxWaitDelay = Math.max(maxWaitMs - (now - burstStartAtRef.current), 0);

    idleTimerRef.current = setTimeout(() => runProcessRef.current(false), idleDelay);
    maxWaitTimerRef.current = setTimeout(() => runProcessRef.current(false), maxWaitDelay);
  }, [clearScheduledProcess, idleMs, maxWaitMs]);

  const runLatestInput = useCallback(
    (force = false): Promise<AutoProcessResult | undefined> => {
      clearScheduledProcess();

      if (activeProcessRef.current) {
        queuedRef.current = true;
        queuedForceRef.current = queuedForceRef.current || force;
        return activeProcessRef.current;
      }

      const text = latestInputRef.current.trim();
      const activePromptName = latestPromptRef.current;

      if (!text || !activePromptName || unmountedRef.current) {
        return Promise.resolve(undefined);
      }

      const requestKey = buildRequestKey(text, activePromptName);
      if (!force && requestKey === lastCompletedKeyRef.current) {
        return Promise.resolve({ requestKey, result: lastCompletedOutputRef.current });
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      queuedRef.current = false;
      queuedForceRef.current = false;
      burstStartAtRef.current = 0;
      lastCompletedKeyRef.current = "";
      setOutputKey("");
      setIsLoading(true);

      const activeProcess = Promise.resolve().then(async () => {
        try {
          const result = await processRef.current(text, activePromptName, abortController.signal);

          if (!abortController.signal.aborted && !unmountedRef.current) {
            onResultRef.current(result, { text, promptName: activePromptName, requestKey });
            lastCompletedKeyRef.current = requestKey;
            lastCompletedOutputRef.current = result;
            setOutputKey(requestKey);
            return { requestKey, result };
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            await onErrorRef.current?.(error);
          }
          return { requestKey };
        } finally {
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null;
          }

          activeProcessRef.current = null;
          if (!unmountedRef.current) {
            setIsLoading(false);
          }

          if (!unmountedRef.current) {
            const latestKey = buildRequestKey(latestInputRef.current, latestPromptRef.current);
            const hasLatestInput = Boolean(
              latestInputRef.current.trim() && latestPromptRef.current
            );
            const shouldRunQueued =
              hasLatestInput &&
              (queuedForceRef.current ||
                (queuedRef.current && latestKey !== lastCompletedKeyRef.current));
            const shouldRunChanged =
              hasLatestInput &&
              latestKey !== requestKey &&
              latestKey !== lastCompletedKeyRef.current;

            if (shouldRunQueued || shouldRunChanged) {
              const forceNext = queuedForceRef.current;
              queuedRef.current = false;
              queuedForceRef.current = false;
              lastInputAtRef.current = Date.now();
              burstStartAtRef.current = lastInputAtRef.current;

              if (forceNext) {
                runProcessRef.current(true);
              } else {
                scheduleProcess();
              }
            } else {
              queuedRef.current = false;
              queuedForceRef.current = false;
            }
          }
        }
      });
      activeProcessRef.current = activeProcess;
      return activeProcess;
    },
    [clearScheduledProcess, scheduleProcess]
  );

  useEffect(() => {
    runProcessRef.current = runLatestInput;
  }, [runLatestInput]);

  useEffect(() => {
    latestInputRef.current = input;
    latestPromptRef.current = promptName;

    const requestKey = buildRequestKey(input, promptName);

    if (!input.trim()) {
      clearScheduledProcess();
      queuedRef.current = false;
      queuedForceRef.current = false;
      burstStartAtRef.current = 0;
      lastCompletedKeyRef.current = "";
      setOutputKey("");
      onResetRef.current?.();
      return;
    }

    if (!promptName) {
      return;
    }

    if (requestKey !== lastCompletedKeyRef.current) {
      setOutputKey("");
    }

    lastInputAtRef.current = Date.now();
    if (!burstStartAtRef.current) {
      burstStartAtRef.current = lastInputAtRef.current;
    }

    scheduleProcess();
  }, [clearScheduledProcess, input, promptName, scheduleProcess]);

  useEffect(() => {
    unmountedRef.current = false;

    return () => {
      unmountedRef.current = true;
      clearScheduledProcess();
      abortControllerRef.current?.abort();
    };
  }, [clearScheduledProcess]);

  const requestProcess = useCallback(
    (force = true) => {
      latestInputRef.current = input;
      latestPromptRef.current = promptName;
      runProcessRef.current(force);
    },
    [input, promptName]
  );

  const ensureLatestResult = useCallback(async () => {
    latestInputRef.current = input;
    latestPromptRef.current = promptName;
    clearScheduledProcess();

    while (!unmountedRef.current && latestInputRef.current.trim() && latestPromptRef.current) {
      const completed = await (activeProcessRef.current ?? runLatestInput());
      if (unmountedRef.current || !completed) {
        return;
      }

      const latestKey = buildRequestKey(latestInputRef.current, latestPromptRef.current);
      if (!activeProcessRef.current && completed.requestKey === latestKey) {
        return completed.result;
      }
    }
  }, [clearScheduledProcess, input, promptName, runLatestInput]);

  const currentKey = useMemo(() => buildRequestKey(input, promptName), [input, promptName]);

  return {
    currentKey,
    ensureLatestResult,
    isLoading,
    isOutputFresh: Boolean(outputKey) && outputKey === currentKey,
    outputKey,
    requestProcess,
  };
}
