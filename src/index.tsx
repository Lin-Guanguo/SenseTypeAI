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
import { callOpenRouter, isAbortError, isOpenRouterError, parseTemplates } from "./openrouter";

interface Preferences {
  openrouterApiKey: string;
  model: string;
  customModel?: string;
  templates?: string;
}

const DEBOUNCE_MS = 400;
const NONE_TEMPLATE_VALUE = "__none__";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGoodOutput, setLastGoodOutput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Refs for managing async state
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncerRef = useRef<Debouncer<(text: string, template: string) => void> | null>(null);

  // Parse templates from preferences once
  const { templates, templateError } = useMemo(() => {
    const result = parseTemplates(preferences.templates || "");
    return { templates: result.templates, templateError: result.error };
  }, [preferences.templates]);

  // Show template parse error on mount
  useEffect(() => {
    if (templateError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Template Parse Error",
        message: templateError,
      });
    }
  }, [templateError]);

  // Set default template (first one, or __none__ if no templates)
  useEffect(() => {
    if (!selectedTemplate) {
      setSelectedTemplate(templates.length > 0 ? templates[0].name : NONE_TEMPLATE_VALUE);
    }
  }, [templates, selectedTemplate]);

  // Get effective model (customModel overrides dropdown)
  const effectiveModel = useMemo(() => {
    return preferences.customModel?.trim() || preferences.model;
  }, [preferences.customModel, preferences.model]);

  // Get current template prompt
  const getTemplatePrompt = useCallback(
    (templateName: string): string | undefined => {
      if (templateName === NONE_TEMPLATE_VALUE) {
        return undefined;
      }
      const template = templates.find((t) => t.name === templateName);
      return template?.prompt;
    },
    [templates]
  );

  const processInput = useCallback(
    async (text: string, templateName: string) => {
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
          model: effectiveModel,
          signal: abortController.signal,
          templatePrompt: getTemplatePrompt(templateName),
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
    [preferences.openrouterApiKey, effectiveModel, getTemplatePrompt, lastGoodOutput]
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
      debouncerRef.current?.call(text, selectedTemplate);
    },
    [selectedTemplate]
  );

  const handleTemplateChange = useCallback(
    (value: string) => {
      setSelectedTemplate(value);
      // Re-process with new template if there's input
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
      processInput(input, selectedTemplate);
    }
  }, [input, selectedTemplate, processInput]);

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
        id="template"
        title="Template"
        value={selectedTemplate}
        onChange={handleTemplateChange}
      >
        {templates.map((t) => (
          <Form.Dropdown.Item key={t.name} value={t.name} title={t.name} />
        ))}
        <Form.Dropdown.Item
          key={NONE_TEMPLATE_VALUE}
          value={NONE_TEMPLATE_VALUE}
          title="None (Default)"
        />
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
