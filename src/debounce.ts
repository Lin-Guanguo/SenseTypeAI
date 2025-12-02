/**
 * Creates a debounced function that delays invoking `fn` until after `wait` milliseconds
 * have elapsed since the last invocation. Returns a tuple with the debounced function
 * and a cancel function.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  wait: number
): [(...args: Parameters<T>) => void, () => void] {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, wait);
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return [debouncedFn, cancel];
}

/**
 * React hook-friendly debounce that returns a stable reference.
 * Use with useCallback or wrap in useMemo.
 */
export class Debouncer<T extends (...args: Parameters<T>) => void> {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly wait: number;
  private readonly fn: T;

  constructor(fn: T, wait: number) {
    this.fn = fn;
    this.wait = wait;
  }

  call = (...args: Parameters<T>) => {
    this.cancel();
    this.timeoutId = setTimeout(() => {
      this.fn(...args);
      this.timeoutId = null;
    }, this.wait);
  };

  cancel = () => {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };
}
