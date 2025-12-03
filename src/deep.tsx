import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callOpenRouter, isAbortError, isOpenRouterError, parsePrompts, Prompt } from "./openrouter";
import defaultPrompts from "./prompts.json";

interface Preferences {
  apiKey: string;
  apiBaseUrl?: string;
  model: string;
  prompts?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGoodOutput, setLastGoodOutput] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");

  // Refs for managing async state
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProcessedTextRef = useRef<string>("");

  // Parse prompts: user prompts are added to defaults
  const { prompts, promptError } = useMemo(() => {
    const basePrompts = defaultPrompts as Prompt[];
    if (preferences.prompts?.trim()) {
      const result = parsePrompts(preferences.prompts);
      // Merge: user prompts first, then defaults (skip duplicates by name)
      const userNames = new Set(result.prompts.map((p) => p.name));
      const filteredDefaults = basePrompts.filter((p) => !userNames.has(p.name));
      return { prompts: [...result.prompts, ...filteredDefaults], promptError: result.error };
    }
    return { prompts: basePrompts, promptError: undefined };
  }, [preferences.prompts]);

  // Show prompt parse error on mount
  useEffect(() => {
    if (promptError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Prompt Parse Error",
        message: promptError,
      });
    }
  }, [promptError]);

  // Set default prompt (first one)
  useEffect(() => {
    if (!selectedPrompt && prompts.length > 0) {
      setSelectedPrompt(prompts[0].name);
    }
  }, [prompts, selectedPrompt]);

  // Get model from preferences
  const model = preferences.model || "google/gemini-2.5-flash";

  // Get current prompt content
  const getPromptContent = useCallback(
    (promptName: string): string | undefined => {
      const prompt = prompts.find((p) => p.name === promptName);
      return prompt?.prompt;
    },
    [prompts]
  );

  const processInput = useCallback(
    async (text: string, promptName: string) => {
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
          apiKey: preferences.apiKey,
          baseUrl: preferences.apiBaseUrl,
          model,
          signal: abortController.signal,
          templatePrompt: getPromptContent(promptName),
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
    [preferences.apiKey, preferences.apiBaseUrl, model, getPromptContent, lastGoodOutput]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      // Detect Enter key by checking for new newline at end
      if (text.endsWith("\n") && !input.endsWith("\n")) {
        const trimmedText = text.trim();
        // Only process if text changed after trim
        if (trimmedText && trimmedText !== lastProcessedTextRef.current) {
          lastProcessedTextRef.current = trimmedText;
          processInput(trimmedText, selectedPrompt);
        }
      }
    },
    [input, selectedPrompt, processInput]
  );

  const handlePromptChange = useCallback((value: string) => {
    setSelectedPrompt(value);
  }, []);

  // Enter key - trigger processing
  const handleSubmit = useCallback(() => {
    if (input.trim()) {
      processInput(input, selectedPrompt);
    }
  }, [input, selectedPrompt, processInput]);

  const copyAndExit = useCallback(async () => {
    const textToCopy = output || lastGoodOutput;
    if (textToCopy) {
      await Clipboard.copy(textToCopy);
      await Clipboard.paste(textToCopy);
    }
    await closeMainWindow();
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
            title="Copy, Paste and Exit"
            onAction={copyAndExit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action title="Process" onAction={handleSubmit} />
          <Action
            title="Copy Output"
            onAction={copyOutput}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="prompt" value={selectedPrompt} onChange={handlePromptChange}>
        {prompts.map((p) => (
          <Form.Dropdown.Item key={p.name} value={p.name} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="input"
        placeholder="Enter to process, Cmd+Enter to copy and exit"
        value={input}
        onChange={handleInputChange}
        enableMarkdown
        autoFocus
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        placeholder="Output"
        value={output || (isLoading ? "Processing..." : "")}
        onChange={() => {}}
        enableMarkdown
      />
    </Form>
  );
}
