import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  getSelectedText,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  callOpenRouter,
  isAbortError,
  isOpenRouterError,
  parsePrompts,
  Prompt,
} from "./openrouter";
import defaultPrompts from "./prompts.json";
import { useAutoProcessor } from "./useAutoProcessor";

interface ClipboardItem {
  text: string;
  offset: number;
}

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
  const [selectedPrompt, setSelectedPrompt] = useState<string>(presetPrompt || "");
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function loadSelectedText() {
      try {
        const text = await getSelectedText();
        if (active && text.trim()) {
          setInput((current) => current || text);
        }
      } catch {
        // Some apps do not expose selected text; manual input remains available.
      }
    }

    loadSelectedText();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    async function loadClipboardHistory() {
      const items: ClipboardItem[] = [];

      for (let offset = 0; offset <= 5; offset++) {
        try {
          const text = await Clipboard.readText({ offset });
          if (text?.trim()) {
            items.push({ text, offset });
          }
        } catch {
          // Ignore unavailable clipboard history items.
        }
      }

      setClipboardHistory(items);
    }

    loadClipboardHistory();
  }, []);

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
    [getPromptContent, model, preferences.apiBaseUrl, preferences.apiKey]
  );

  const handleProcessError = useCallback(async (error: unknown) => {
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
  }, []);

  const { isLoading, isOutputFresh, requestProcess } = useAutoProcessor({
    input,
    promptName: selectedPrompt,
    process: processInput,
    onResult: setOutput,
    onError: handleProcessError,
    onReset: () => setOutput(""),
  });

  const copyAndExit = useCallback(async () => {
    if (!output) {
      requestProcess(true);
      return;
    }
    await Clipboard.copy(output);
    await Clipboard.paste(output);
    await closeMainWindow();
  }, [output, requestProcess]);

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

  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedItemId(id ?? undefined);
  }, []);

  const markdown = output
    ? `${output}${isOutputFresh ? "" : "\n\n*Processing...*"}`
    : isLoading
      ? "*Processing...*"
      : "*Type to start*";

  // Filter prompts: show only preset prompt if preset, otherwise show all
  const displayPrompts = presetPrompt ? prompts.filter((p) => p.name === presetPrompt) : prompts;
  const firstPromptItemId = displayPrompts[0] ? `prompt-${displayPrompts[0].name}` : undefined;

  useEffect(() => {
    if (!selectedItemId && firstPromptItemId) {
      setSelectedItemId(firstPromptItemId);
    }
  }, [firstPromptItemId, selectedItemId]);

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);

      if (firstPromptItemId) {
        setSelectedItemId(firstPromptItemId);
      }

      if (!text.trim()) {
        setOutput("");
      }
    },
    [firstPromptItemId]
  );

  const appendAndGoToFirst = useCallback(
    (text: string) => {
      setInput((prev) => prev + text);

      if (firstPromptItemId) {
        setSelectedItemId(firstPromptItemId);
      }
    },
    [firstPromptItemId]
  );

  const pasteClipboardItem = useCallback(async (text: string) => {
    await Clipboard.paste(text);
    await closeMainWindow();
  }, []);

  const truncateText = (text: string, maxLength = 50) => {
    const singleLine = text.replace(/\n/g, " ").trim();
    return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength)}...` : singleLine;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={input}
      onSearchTextChange={handleInputChange}
      searchBarPlaceholder="Type pinyin or text..."
      filtering={false}
      isShowingDetail
      selectedItemId={selectedItemId}
      onSelectionChange={handleSelectionChange}
    >
      <List.Section title="Translate">
        {displayPrompts.map((p) => (
          <List.Item
            id={`prompt-${p.name}`}
            key={p.name}
            title={p.name}
            icon={Icon.Text}
            detail={
              <List.Item.Detail
                markdown={selectedPrompt === p.name ? markdown : `*Select to use ${p.name}*`}
              />
            }
            actions={
              <ActionPanel>
                {presetPrompt ? (
                  <Action title="Process" onAction={() => requestProcess(true)} />
                ) : (
                  <Action
                    title="Select Prompt"
                    onAction={() => {
                      setSelectedPrompt(p.name);
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
      </List.Section>
      <List.Section title="Clipboard History">
        {clipboardHistory.map((item, index) => (
          <List.Item
            id={`clipboard-${item.offset}`}
            key={`clipboard-${item.offset}`}
            title={truncateText(item.text)}
            subtitle={index === 0 ? "Latest" : undefined}
            icon={Icon.Clipboard}
            detail={<List.Item.Detail markdown={`\`\`\`\n${item.text}\n\`\`\``} />}
            actions={
              <ActionPanel>
                <Action title="Append to Input" onAction={() => appendAndGoToFirst(item.text)} />
                <Action
                  title="Paste and Exit"
                  onAction={() => pasteClipboardItem(item.text)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action
                  title="Copy"
                  onAction={async () => {
                    await Clipboard.copy(item.text);
                    await showToast({ style: Toast.Style.Success, title: "Copied" });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
