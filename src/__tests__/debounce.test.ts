import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce, Debouncer } from "../debounce";

describe("debounce function", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should delay function execution", () => {
    const fn = vi.fn();
    const [debouncedFn] = debounce(fn, 300);

    debouncedFn("test");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith("test");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should cancel previous calls when called multiple times", () => {
    const fn = vi.fn();
    const [debouncedFn] = debounce(fn, 300);

    debouncedFn("first");
    vi.advanceTimersByTime(100);
    debouncedFn("second");
    vi.advanceTimersByTime(100);
    debouncedFn("third");

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("should allow manual cancellation", () => {
    const fn = vi.fn();
    const [debouncedFn, cancel] = debounce(fn, 300);

    debouncedFn("test");
    vi.advanceTimersByTime(100);
    cancel();
    vi.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();
  });

  it("should handle multiple arguments", () => {
    const fn = vi.fn();
    const [debouncedFn] = debounce(fn, 300);

    debouncedFn("arg1", "arg2", "arg3");
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledWith("arg1", "arg2", "arg3");
  });
});

describe("Debouncer class", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should delay function execution", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 300);

    debouncer.call("test");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith("test");
  });

  it("should cancel previous calls on new invocations", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 300);

    debouncer.call("first");
    vi.advanceTimersByTime(200);
    debouncer.call("second");
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("should support manual cancellation", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 300);

    debouncer.call("test");
    debouncer.cancel();
    vi.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });

  it("should work correctly after cancellation", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 300);

    debouncer.call("first");
    debouncer.cancel();
    debouncer.call("second");
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("should have stable method references", () => {
    const fn = vi.fn();
    const debouncer = new Debouncer(fn, 300);

    const callRef1 = debouncer.call;
    const callRef2 = debouncer.call;
    const cancelRef1 = debouncer.cancel;
    const cancelRef2 = debouncer.cancel;

    expect(callRef1).toBe(callRef2);
    expect(cancelRef1).toBe(cancelRef2);
  });
});
