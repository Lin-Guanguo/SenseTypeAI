import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  List,
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

const presetMap: Record<string, string> = {
  "quick-type-english": "Type English",
  "quick-type-chinese": "Type Chinese",
  "quick-improve-writing": "Improve Writing",
};

export default function QuickSense() {
  const preferences = getPreferenceValues<Preferences>();
  const presetPrompt = presetMap[environment.commandName];

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>(presetPrompt || "");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Parse prompts
  const { prompts, promptError } = useMemo(() => {
    const basePrompts = defaultPrompts as Prompt[];
    if (preferences.prompts?.trim()) {
      const result = parsePrompts(preferences.prompts);
      const userNames = new Set(result.prompts.map((p) => p.name));
      const filteredDefaults = basePrompts.filter((p) => !userNames.has(p.name));
      return { prompts: [...result.prompts, ...filteredDefaults], promptError: result.error };
    }
    return { prompts: basePrompts, promptError: undefined };
  }, [preferences.prompts]);

  useEffect(() => {
    if (promptError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Prompt Parse Error",
        message: promptError,
      });
    }
  }, [promptError]);

  // Set default prompt if not preset
  useEffect(() => {
    if (!selectedPrompt && prompts.length > 0) {
      setSelectedPrompt(prompts[0].name);
    }
  }, [prompts, selectedPrompt]);

  const model = preferences.model;

  const getPromptContent = useCallback(
    (promptName: string): string | undefined => {
      const prompt = prompts.find((p) => p.name === promptName);
      return prompt?.prompt;
    },
    [prompts]
  );

  const processInput = useCallback(
    async (text: string, promptName: string) => {
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

        if (!abortController.signal.aborted) {
          setOutput(response.text);
          setIsLoading(false);
        }
      } catch (error) {
        if (isAbortError(error)) {
          setIsLoading(false);
          return;
        }

        console.error("OpenRouter error:", error);
        const message = isOpenRouterError(error) ? error.message : "An unexpected error occurred";

        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message,
        });

        setIsLoading(false);
      }
    },
    [preferences.apiKey, preferences.apiBaseUrl, model, getPromptContent]
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleProcess = useCallback(() => {
    if (input.trim() && selectedPrompt) {
      processInput(input, selectedPrompt);
    }
  }, [input, selectedPrompt, processInput]);

  const copyAndExit = useCallback(async () => {
    if (!output) {
      // No output yet, trigger process instead
      if (input.trim() && selectedPrompt) {
        processInput(input, selectedPrompt);
      }
      return;
    }
    await Clipboard.copy(output);
    await Clipboard.paste(output);
    await closeMainWindow();
  }, [output, input, selectedPrompt, processInput]);

  const copyOutput = useCallback(async () => {
    if (output) {
      await Clipboard.copy(output);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
      });
    }
  }, [output]);

  // Copy on exit
  useEffect(() => {
    return () => {
      if (output) {
        Clipboard.copy(output);
      }
    };
  }, [output]);

  const markdown = output || (isLoading ? "*Processing...*" : "*Type to start*");

  // Filter prompts: show only preset prompt if preset, otherwise show all
  const displayPrompts = presetPrompt
    ? prompts.filter((p) => p.name === presetPrompt)
    : prompts;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setInput}
      searchBarPlaceholder="Type here, Enter to process..."
      filtering={false}
      isShowingDetail
    >
      {displayPrompts.map((p) => (
        <List.Item
          key={p.name}
          title={p.name}
          detail={<List.Item.Detail markdown={selectedPrompt === p.name ? markdown : `*Select to use ${p.name}*`} />}
          actions={
            <ActionPanel>
              {presetPrompt ? (
                <Action title="Process" onAction={handleProcess} />
              ) : (
                <Action
                  title="Select Prompt"
                  onAction={() => {
                    setSelectedPrompt(p.name);
                    if (input.trim()) {
                      processInput(input, p.name);
                    }
                  }}
                />
              )}
              <Action
                title="Copy, Paste and Exit"
                onAction={copyAndExit}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
              <Action
                title="Copy Output"
                onAction={copyOutput}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
