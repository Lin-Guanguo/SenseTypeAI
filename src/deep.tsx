import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  callOpenRouter,
  isAbortError,
  isOpenRouterError,
  parsePrompts,
  Prompt,
} from "./openrouter";
import defaultPrompts from "./prompts.json";
import { useAutoProcessor } from "./useAutoProcessor";

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
  const [lastGoodOutput, setLastGoodOutput] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const isExitingRef = useRef(false);

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
  const model = preferences.model;

  // Get current prompt content
  const getPromptContent = useCallback(
    (promptName: string): string | undefined => {
      const prompt = prompts.find((p) => p.name === promptName);
      return prompt?.prompt;
    },
    [prompts]
  );

  const processInput = useCallback(
    async (text: string, promptName: string, signal: AbortSignal) => {
      const response = await callOpenRouter(text, {
        apiKey: preferences.apiKey,
        baseUrl: preferences.apiBaseUrl,
        model,
        signal,
        templatePrompt: getPromptContent(promptName),
      });
      return response.text;
    },
    [preferences.apiKey, preferences.apiBaseUrl, model, getPromptContent]
  );

  const handleProcessResult = useCallback((text: string) => {
    setOutput(text);
    setLastGoodOutput(text);
  }, []);

  const handleProcessError = useCallback(
    async (error: unknown) => {
      if (isAbortError(error)) {
        return;
      }

      console.error("OpenRouter error:", error);
      const message = isOpenRouterError(error) ? error.message : "An unexpected error occurred";

      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });

      if (lastGoodOutput) {
        setOutput(lastGoodOutput);
      }
    },
    [lastGoodOutput]
  );

  const { isLoading, isOutputFresh, requestProcess, ensureLatestResult } = useAutoProcessor({
    input,
    promptName: selectedPrompt,
    process: processInput,
    onResult: handleProcessResult,
    onError: handleProcessError,
    onReset: () => setOutput(""),
  });

  const handleInputChange = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handlePromptChange = useCallback((value: string) => {
    setSelectedPrompt(value);
  }, []);

  // Manual trigger; automatic processing is handled by useAutoProcessor.
  const handleSubmit = useCallback(() => {
    if (input.trim()) {
      requestProcess(true);
    }
  }, [input, requestProcess]);

  const handleExit = useCallback(
    async (paste = false) => {
      if (isExitingRef.current) {
        return;
      }
      isExitingRef.current = true;

      try {
        const result = await ensureLatestResult();
        if (!result) {
          return;
        }
        await Clipboard.copy(result);
        if (paste) {
          await Clipboard.paste(result);
        }
        await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      } finally {
        isExitingRef.current = false;
      }
    },
    [ensureLatestResult]
  );

  const outputDisplay = output
    ? `${output}${isOutputFresh ? "" : "\n\nProcessing..."}`
    : isLoading
      ? "Processing..."
      : "";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Copy, Paste and Exit"
            onAction={() => handleExit(true)}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action title="Process" onAction={handleSubmit} />
          <Action
            title="Copy and Exit"
            onAction={() => handleExit()}
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
        placeholder="Type multiple lines; processing starts after you pause"
        value={input}
        onChange={handleInputChange}
        enableMarkdown
        autoFocus
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        placeholder="Output"
        value={outputDisplay}
        onChange={() => {}}
        enableMarkdown
      />
    </Form>
  );
}
