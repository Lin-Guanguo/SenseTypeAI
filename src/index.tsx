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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Debouncer } from "./debounce";
import { callOpenRouter, isAbortError, isOpenRouterError, parsePrompts, Prompt } from "./openrouter";
import defaultPrompts from "./prompts.json";

interface Preferences {
  openrouterApiKey: string;
  model: string;
  prompts?: string;
}

const DEBOUNCE_MS = 400;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGoodOutput, setLastGoodOutput] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");

  // Refs for managing async state
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncerRef = useRef<Debouncer<(text: string, promptName: string) => void> | null>(null);

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
          apiKey: preferences.openrouterApiKey,
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
    [preferences.openrouterApiKey, model, getPromptContent, lastGoodOutput]
  );

  // Initialize debouncer
  useEffect(() => {
    debouncerRef.current = new Debouncer(processInput, DEBOUNCE_MS);
    return () => {
      debouncerRef.current?.cancel();
      abortControllerRef.current?.abort();
    };
  }, [processInput]);

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      debouncerRef.current?.call(text, selectedPrompt);
    },
    [selectedPrompt]
  );

  const handlePromptChange = useCallback(
    (value: string) => {
      setSelectedPrompt(value);
      // Re-process with new prompt if there's input
      if (input.trim()) {
        debouncerRef.current?.call(input, value);
      }
    },
    [input]
  );

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
      processInput(input, selectedPrompt);
    }
  }, [input, selectedPrompt, processInput]);

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
      <Form.Dropdown
        id="prompt"
        title="Prompt"
        value={selectedPrompt}
        onChange={handlePromptChange}
      >
        {prompts.map((p) => (
          <Form.Dropdown.Item key={p.name} value={p.name} title={p.name} />
        ))}
      </Form.Dropdown>
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
        title="Output (read-only)"
        placeholder="Transformed text will appear here..."
        value={output || (isLoading ? "Processing..." : "")}
        onChange={() => {}}
        info="This field is read-only. Use Cmd+C to copy."
      />
    </Form>
  );
}
