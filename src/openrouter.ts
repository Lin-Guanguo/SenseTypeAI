/**
 * OpenRouter API client with abort support.
 * Returns normalized { text, meta } responses.
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export interface OpenRouterMeta {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  finishReason?: string;
}

export interface OpenRouterResponse {
  text: string;
  meta: OpenRouterMeta;
}

export interface OpenRouterError {
  message: string;
  code?: string;
  status?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  apiKey: string;
  model?: string;
  signal?: AbortSignal;
  systemPrompt?: string;
  referer?: string;
}

interface OpenRouterAPIResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterAPIError {
  error: {
    message: string;
    code?: string;
    type?: string;
  };
}

const DEFAULT_REFERER = "http://localhost";

/**
 * Call OpenRouter chat completion API with abort support.
 */
export async function callOpenRouter(
  input: string,
  options: OpenRouterOptions
): Promise<OpenRouterResponse> {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    signal,
    systemPrompt,
    referer = DEFAULT_REFERER,
  } = options;

  if (!apiKey) {
    throw createError("API key is required", "missing_api_key", 401);
  }

  if (!input.trim()) {
    throw createError("Input text is required", "empty_input", 400);
  }

  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: input });

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "SenseType AI",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
    signal,
  });

  if (!response.ok) {
    await handleAPIError(response);
  }

  const data = (await response.json()) as OpenRouterAPIResponse;

  return parseResponse(data, model);
}

function parseResponse(data: OpenRouterAPIResponse, requestedModel: string): OpenRouterResponse {
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw createError("Invalid response: missing content", "invalid_response", 500);
  }

  return {
    text: choice.message.content,
    meta: {
      model: data.model || requestedModel,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      finishReason: choice.finish_reason,
    },
  };
}

async function handleAPIError(response: Response): Promise<never> {
  let message = `HTTP ${response.status}: ${response.statusText}`;
  let code: string | undefined;

  try {
    const errorData = (await response.json()) as OpenRouterAPIError;
    if (errorData.error?.message) {
      message = errorData.error.message;
      code = errorData.error.code || errorData.error.type;
    }
  } catch {
    // Use default message if JSON parsing fails
  }

  // Provide user-friendly messages for common errors
  if (response.status === 401) {
    message = "Invalid API key. Please check your OpenRouter API key in preferences.";
    code = "invalid_api_key";
  } else if (response.status === 429) {
    message = "Rate limit exceeded. Please wait a moment and try again.";
    code = "rate_limit";
  } else if (response.status === 404) {
    message = "Model not found. Please check the model name in preferences.";
    code = "model_not_found";
  }

  throw createError(message, code, response.status);
}

function createError(message: string, code?: string, status?: number): OpenRouterError {
  const error: OpenRouterError = { message };
  if (code) error.code = code;
  if (status) error.status = status;
  return error;
}

/**
 * Type guard to check if an error is an OpenRouterError
 */
export function isOpenRouterError(error: unknown): error is OpenRouterError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as OpenRouterError).message === "string"
  );
}

/**
 * Check if the error is due to request cancellation
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
