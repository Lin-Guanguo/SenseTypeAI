import { createElement, type ComponentType, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Action, Clipboard, closeMainWindow, Form, List, showToast } from "@raycast/api";
import QuickSense from "../quick";
import DeepSense from "../deep";
import { callOpenRouter, type OpenRouterResponse } from "../openrouter";

vi.mock("@raycast/api", async () => {
  const { createElement } = await import("react");
  const component = (name: string) =>
    function MockComponent({
      children,
      actions,
      ...props
    }: {
      children?: ReactNode;
      actions?: ReactNode;
    }) {
      return createElement(name, props, children, actions);
    };

  return {
    Action: component("action"),
    ActionPanel: component("actions"),
    Clipboard: {
      copy: vi.fn().mockResolvedValue(undefined),
      paste: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(undefined),
    },
    closeMainWindow: vi.fn().mockResolvedValue(undefined),
    environment: { commandName: "quick-type-english" },
    getPreferenceValues: () => ({ apiKey: "test-key", model: "test-model" }),
    getSelectedText: vi.fn().mockResolvedValue(""),
    PopToRootType: { Immediate: "immediate" },
    Icon: { Text: "text", Clipboard: "clipboard" },
    List: Object.assign(component("list"), {
      Section: component("section"),
      Item: Object.assign(component("item"), { Detail: component("detail") }),
    }),
    Form: Object.assign(component("form"), {
      Dropdown: Object.assign(component("dropdown"), { Item: component("option") }),
      TextArea: component("textarea"),
      Separator: component("separator"),
    }),
    showToast: vi.fn().mockResolvedValue(undefined),
    Toast: { Style: { Failure: "failure", Success: "success" } },
  };
});

vi.mock("../openrouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../openrouter")>()),
  callOpenRouter: vi.fn(),
}));

describe.each([
  ["QuickSense", QuickSense],
  ["DeepSense", DeepSense],
] as const)("%s exit actions", (name, Command: ComponentType) => {
  let renderer: ReactTestRenderer;
  let requests: { resolve: (text: string) => void; reject: (error: Error) => void }[];

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const logError = console.error;
    vi.spyOn(console, "error").mockImplementation((...args) => {
      if (String(args[0]).startsWith("react-test-renderer is deprecated")) {
        return;
      }
      logError(...args);
    });
    requests = [];
    vi.mocked(callOpenRouter).mockImplementation(
      () =>
        new Promise<OpenRouterResponse>((resolve, reject) => {
          requests.push({
            resolve: (text) => resolve({ text, meta: { model: "test-model" } }),
            reject,
          });
        })
    );
    await act(async () => {
      renderer = create(createElement(Command));
    });
  });

  afterEach(async () => {
    await act(async () => renderer.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function typeInput(text: string) {
    await act(async () => {
      if (name === "QuickSense") {
        renderer.root.findByType(List).props.onSearchTextChange(text);
      } else {
        renderer.root.findByProps({ id: "input" }).props.onChange(text);
      }
    });
  }

  function action(key: "return" | "c") {
    return renderer.root.findAllByType(Action).find((item) => item.props.shortcut?.key === key)!
      .props.onAction as () => Promise<void>;
  }

  async function startAutomaticTranslation() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
  }

  function expectNoExit() {
    expect(Clipboard.copy).not.toHaveBeenCalled();
    expect(Clipboard.paste).not.toHaveBeenCalled();
    expect(closeMainWindow).not.toHaveBeenCalled();
  }

  function expectExit(key: "return" | "c", text: string) {
    expect(vi.mocked(Clipboard.copy).mock.calls).toEqual([[text]]);
    if (key === "return") {
      expect(vi.mocked(Clipboard.paste).mock.calls).toEqual([[text]]);
    } else {
      expect(Clipboard.paste).not.toHaveBeenCalled();
    }
    expect(vi.mocked(closeMainWindow).mock.calls).toEqual([[{ popToRootType: "immediate" }]]);
  }

  it.each(["return", "c"] as const)(
    "Cmd+%s immediately translates pending input instead of copying the previous result",
    async (key) => {
      await typeInput("partial input");
      await startAutomaticTranslation();
      await act(async () => requests[0].resolve("partial translation"));
      await typeInput("complete input");

      let exit: Promise<void>;
      await act(async () => {
        exit = action(key)();
      });
      expect(callOpenRouter).toHaveBeenLastCalledWith("complete input", expect.any(Object));
      expectNoExit();

      await act(async () => {
        requests[1].resolve("complete translation");
        await exit;
      });
      expectExit(key, "complete translation");
    }
  );

  it.each(["return", "c"] as const)(
    "Cmd+%s waits for an active translation without starting a duplicate",
    async (key) => {
      await typeInput("complete input");
      await startAutomaticTranslation();
      let exit: Promise<void>;
      await act(async () => {
        exit = action(key)();
      });
      expect(callOpenRouter).toHaveBeenCalledTimes(1);
      expectNoExit();

      await act(async () => {
        requests[0].resolve("complete translation");
        await exit;
      });
      expectExit(key, "complete translation");
    }
  );

  it.each(["return", "c"] as const)(
    "Cmd+%s follows input edits until the latest translation finishes",
    async (key) => {
      await typeInput("first");
      await startAutomaticTranslation();
      await typeInput("second");
      let exit: Promise<void>;
      await act(async () => {
        exit = action(key)();
      });
      await act(async () => requests[0].resolve("first translation"));
      expect(callOpenRouter).toHaveBeenLastCalledWith("second", expect.any(Object));
      expectNoExit();

      await typeInput("final");
      await act(async () => requests[1].resolve("second translation"));
      expect(callOpenRouter).toHaveBeenLastCalledWith("final", expect.any(Object));
      expectNoExit();

      await act(async () => {
        requests[2].resolve("final translation");
        await exit;
      });
      expectExit(key, "final translation");
    }
  );

  it("copies an already completed translation without another request", async () => {
    await typeInput("complete input");
    await startAutomaticTranslation();
    await act(async () => requests[0].resolve("complete translation"));
    await act(async () => action("c")());
    expect(callOpenRouter).toHaveBeenCalledTimes(1);
    expectExit("c", "complete translation");
  });

  it("keeps the command open after failure and permits retrying the exit action", async () => {
    await typeInput("old input");
    await startAutomaticTranslation();
    await act(async () => requests[0].resolve("old translation"));
    await typeInput("latest input");
    let exit: Promise<void>;
    await act(async () => {
      exit = action("return")();
    });
    await act(async () => {
      requests[1].reject(new Error("Translation failed"));
      await exit;
    });
    expectNoExit();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure" }));

    await act(async () => {
      exit = action("return")();
    });
    await act(async () => {
      requests[2].resolve("latest translation");
      await exit;
    });
    expectExit("return", "latest translation");
  });

  it("does not copy old output when the input is cleared", async () => {
    await typeInput("old input");
    await startAutomaticTranslation();
    await act(async () => requests[0].resolve("old translation"));
    await typeInput("");
    await act(async () => action("return")());
    expectNoExit();
    expect(callOpenRouter).toHaveBeenCalledTimes(1);
  });

  it("executes only the first exit action when shortcuts are pressed repeatedly", async () => {
    await typeInput("complete input");
    let exit: Promise<void>;
    await act(async () => {
      exit = action("return")();
      await action("return")();
      await action("c")();
    });
    expectNoExit();
    expect(callOpenRouter).toHaveBeenCalledTimes(1);
    await act(async () => {
      requests[0].resolve("complete translation");
      await exit;
    });
    expectExit("return", "complete translation");
  });

  it("does not copy or paste if the command is unmounted while waiting", async () => {
    await typeInput("complete input");
    let exit: Promise<void>;
    await act(async () => {
      exit = action("return")();
    });
    await act(async () => renderer.unmount());
    expect(vi.mocked(callOpenRouter).mock.calls[0][1].signal?.aborted).toBe(true);
    await act(async () => {
      requests[0].resolve("complete translation");
      await exit;
    });
    expectNoExit();
  });

  it("waits for a manual retranslation even when the input has not changed", async () => {
    await typeInput("same input");
    await startAutomaticTranslation();
    await act(async () => requests[0].resolve("first translation"));
    await act(async () => {
      renderer.root
        .findAllByType(Action)
        .find((item) => item.props.title === "Process")!
        .props.onAction();
    });
    let exit: Promise<void>;
    await act(async () => {
      exit = action("return")();
    });
    expectNoExit();
    expect(callOpenRouter).toHaveBeenCalledTimes(2);
    await act(async () => {
      requests[1].resolve("revised translation");
      await exit;
    });
    expectExit("return", "revised translation");
  });

  it("waits for a queued manual retranslation and stays open if it fails", async () => {
    await typeInput("same input");
    await startAutomaticTranslation();
    await act(async () => {
      renderer.root
        .findAllByType(Action)
        .find((item) => item.props.title === "Process")!
        .props.onAction();
    });
    let exit: Promise<void>;
    await act(async () => {
      exit = action("c")();
    });
    await act(async () => requests[0].resolve("first translation"));
    expect(callOpenRouter).toHaveBeenCalledTimes(2);
    expectNoExit();
    await act(async () => {
      requests[1].reject(new Error("Retranslation failed"));
      await exit;
    });
    expectNoExit();
  });

  if (name === "DeepSense") {
    it("waits for the newly selected prompt when it changes during translation", async () => {
      await typeInput("same input");
      await startAutomaticTranslation();
      const originalPrompt = vi.mocked(callOpenRouter).mock.calls[0][1].templatePrompt;
      let exit: Promise<void>;
      await act(async () => {
        exit = action("return")();
      });
      await act(async () => {
        renderer.root.findByType(Form.Dropdown).props.onChange("Type Chinese");
      });
      await act(async () => requests[0].resolve("old prompt translation"));
      expect(callOpenRouter).toHaveBeenCalledTimes(2);
      expect(vi.mocked(callOpenRouter).mock.calls[1][1].templatePrompt).not.toBe(originalPrompt);
      expectNoExit();
      await act(async () => {
        requests[1].resolve("new prompt translation");
        await exit;
      });
      expectExit("return", "new prompt translation");
    });
  }
});
