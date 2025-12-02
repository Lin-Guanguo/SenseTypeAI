import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Debouncer } from "./debounce";
import { callOpenRouter, isAbortError, isOpenRouterError } from "./openrouter";

interface Preferences {
  openrouterApiKey: string;
  model?: string;
}

const DEBOUNCE_MS = 400;

const SYSTEM_PROMPT = `You are SenseType AI, an intelligent writing assistant. Your role is to:
- Improve grammar and spelling
- Enhance clarity and readability
- Fix punctuation
- Maintain the original meaning and tone

Return ONLY the improved text without explanations or comments.`;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGoodOutput, setLastGoodOutput] = useState("");

  // Refs for managing async state
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncerRef = useRef<Debouncer<(text: string) => void> | null>(null);

  const processInput = useCallback(
    async (text: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!text.trim()) {
        setOutput("");
        setIsLoading(false);
        return;
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      try {
        const response = await callOpenRouter(text, {
          apiKey: preferences.openrouterApiKey,
          model: preferences.model,
          signal: abortController.signal,
          systemPrompt: SYSTEM_PROMPT,
        });

        // Only update if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setOutput(response.text);
          setLastGoodOutput(response.text);
          setIsLoading(false);
        }
      } catch (error) {
        // Ignore abort errors - they're expected when cancelling stale requests
        if (isAbortError(error)) {
          setIsLoading(false);
          return;
        }

        // Log error for debugging
        console.error("OpenRouter error:", error);

        // Show toast with error message
        const message = isOpenRouterError(error) ? error.message : "An unexpected error occurred";

        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message,
        });

        // Keep last good output on error
        if (lastGoodOutput) {
          setOutput(lastGoodOutput);
        }

        setIsLoading(false);
      }
    },
    [preferences.openrouterApiKey, preferences.model, lastGoodOutput]
  );

  // Initialize debouncer
  useEffect(() => {
    debouncerRef.current = new Debouncer(processInput, DEBOUNCE_MS);
    return () => {
      debouncerRef.current?.cancel();
      abortControllerRef.current?.abort();
    };
  }, [processInput]);

  const handleInputChange = useCallback((text: string) => {
    setInput(text);
    debouncerRef.current?.call(text);
  }, []);

  const copyAndExit = useCallback(async () => {
    const textToCopy = output || lastGoodOutput;
    if (textToCopy) {
      await Clipboard.copy(textToCopy);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
      });
    }
    await popToRoot();
  }, [output, lastGoodOutput]);

  const copyOutput = useCallback(async () => {
    const textToCopy = output || lastGoodOutput;
    if (textToCopy) {
      await Clipboard.copy(textToCopy);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
      });
    }
  }, [output, lastGoodOutput]);

  const regenerate = useCallback(() => {
    if (input.trim()) {
      processInput(input);
    }
  }, [input, processInput]);

  // Copy on exit (when component unmounts with output)
  useEffect(() => {
    return () => {
      const textToCopy = output || lastGoodOutput;
      if (textToCopy) {
        Clipboard.copy(textToCopy);
      }
    };
  }, [output, lastGoodOutput]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Copy and Exit"
            onAction={copyAndExit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Copy Output"
            onAction={copyOutput}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Regenerate"
            onAction={regenerate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Type or paste your text here..."
        value={input}
        onChange={handleInputChange}
        autoFocus
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Output"
        placeholder="Start typing above..."
        value={output || (isLoading ? "Processing..." : "")}
        onChange={() => {}}
      />
    </Form>
  );
}
