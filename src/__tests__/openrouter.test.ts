import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  callOpenRouter,
  isOpenRouterError,
  isAbortError,
  parseTemplates,
  DEFAULT_PROMPT,
} from "../openrouter";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("callOpenRouter", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return text and meta on successful response", async () => {
    const mockResponse = {
      id: "test-id",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hello, improved!" },
          finish_reason: "stop",
        },
      ],
      model: "google/gemini-2.5-flash",
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await callOpenRouter("Hello", {
      apiKey: "test-key",
      model: "google/gemini-2.5-flash",
    });

    expect(result.text).toBe("Hello, improved!");
    expect(result.meta.model).toBe("google/gemini-2.5-flash");
    expect(result.meta.totalTokens).toBe(15);
    expect(result.meta.finishReason).toBe("stop");
  });

  it("should include correct headers in request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "test" }, finish_reason: "stop" }],
          model: "test-model",
        }),
    });

    await callOpenRouter("Test input", { apiKey: "my-api-key" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer my-api-key",
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "SenseType AI",
        }),
      })
    );
  });

  it("should use DEFAULT_PROMPT when no templatePrompt provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "test" }, finish_reason: "stop" }],
          model: "test-model",
        }),
    });

    await callOpenRouter("User input", { apiKey: "test-key" });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: "system", content: DEFAULT_PROMPT });
    expect(body.messages[1]).toEqual({ role: "user", content: "User input" });
  });

  it("should use templatePrompt when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "test" }, finish_reason: "stop" }],
          model: "test-model",
        }),
    });

    await callOpenRouter("User input", {
      apiKey: "test-key",
      templatePrompt: "Fix grammar only",
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: "system", content: "Fix grammar only" });
    expect(body.messages[1]).toEqual({ role: "user", content: "User input" });
  });

  it("should throw error for missing API key", async () => {
    await expect(callOpenRouter("test", { apiKey: "" })).rejects.toMatchObject({
      message: "API key is required",
      code: "missing_api_key",
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should throw error for empty input", async () => {
    await expect(callOpenRouter("   ", { apiKey: "test-key" })).rejects.toMatchObject({
      message: "Input text is required",
      code: "empty_input",
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle 401 unauthorized error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ error: { message: "Invalid token" } }),
    });

    await expect(callOpenRouter("test", { apiKey: "bad-key" })).rejects.toMatchObject({
      message: "Invalid API key. Please check your OpenRouter API key in preferences.",
      code: "invalid_api_key",
      status: 401,
    });
  });

  it("should handle 429 rate limit error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: () => Promise.resolve({ error: { message: "Rate limited" } }),
    });

    await expect(callOpenRouter("test", { apiKey: "test-key" })).rejects.toMatchObject({
      message: "Rate limit exceeded. Please wait a moment and try again.",
      code: "rate_limit",
      status: 429,
    });
  });

  it("should handle 404 model not found error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: { message: "Model not found" } }),
    });

    await expect(
      callOpenRouter("test", { apiKey: "test-key", model: "bad-model" })
    ).rejects.toMatchObject({
      message: "Model not found. Please check the model name in preferences.",
      code: "model_not_found",
      status: 404,
    });
  });

  it("should handle invalid response structure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    });

    await expect(callOpenRouter("test", { apiKey: "test-key" })).rejects.toMatchObject({
      message: "Invalid response: missing content",
      code: "invalid_response",
    });
  });

  it("should support AbortController signal", async () => {
    const abortController = new AbortController();

    mockFetch.mockImplementationOnce((_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const promise = callOpenRouter("test", {
      apiKey: "test-key",
      signal: abortController.signal,
    });

    abortController.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("parseTemplates", () => {
  it("should parse valid JSON array of templates", () => {
    const json = '[{"name":"Fix Grammar","prompt":"Fix grammar errors"}]';
    const result = parseTemplates(json);

    expect(result.templates).toHaveLength(1);
    expect(result.templates[0]).toEqual({ name: "Fix Grammar", prompt: "Fix grammar errors" });
    expect(result.error).toBeUndefined();
  });

  it("should parse multiple templates", () => {
    const json = '[{"name":"A","prompt":"Prompt A"},{"name":"B","prompt":"Prompt B"}]';
    const result = parseTemplates(json);

    expect(result.templates).toHaveLength(2);
    expect(result.templates[0].name).toBe("A");
    expect(result.templates[1].name).toBe("B");
  });

  it("should return empty array for empty string", () => {
    const result = parseTemplates("");
    expect(result.templates).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("should return empty array for whitespace-only string", () => {
    const result = parseTemplates("   ");
    expect(result.templates).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("should return error for invalid JSON", () => {
    const result = parseTemplates("not valid json");
    expect(result.templates).toHaveLength(0);
    expect(result.error).toContain("Invalid JSON");
  });

  it("should return error for non-array JSON", () => {
    const result = parseTemplates('{"name":"Test"}');
    expect(result.templates).toHaveLength(0);
    expect(result.error).toBe("Templates must be a JSON array");
  });

  it("should skip invalid template objects", () => {
    const json =
      '[{"name":"Valid","prompt":"OK"},{"invalid":"object"},{"name":"Also Valid","prompt":"OK2"}]';
    const result = parseTemplates(json);

    expect(result.templates).toHaveLength(2);
    expect(result.templates[0].name).toBe("Valid");
    expect(result.templates[1].name).toBe("Also Valid");
  });

  it("should skip templates with missing name", () => {
    const json = '[{"prompt":"No name"}]';
    const result = parseTemplates(json);
    expect(result.templates).toHaveLength(0);
  });

  it("should skip templates with missing prompt", () => {
    const json = '[{"name":"No prompt"}]';
    const result = parseTemplates(json);
    expect(result.templates).toHaveLength(0);
  });
});

describe("isOpenRouterError", () => {
  it("should return true for OpenRouterError objects", () => {
    expect(isOpenRouterError({ message: "test error" })).toBe(true);
    expect(isOpenRouterError({ message: "test", code: "123" })).toBe(true);
  });

  it("should return false for non-error objects", () => {
    expect(isOpenRouterError(null)).toBe(false);
    expect(isOpenRouterError(undefined)).toBe(false);
    expect(isOpenRouterError("string")).toBe(false);
    expect(isOpenRouterError({ code: "123" })).toBe(false);
  });
});

describe("isAbortError", () => {
  it("should return true for AbortError", () => {
    const error = new Error("Aborted");
    error.name = "AbortError";
    expect(isAbortError(error)).toBe(true);
  });

  it("should return false for other errors", () => {
    expect(isAbortError(new Error("test"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError({ name: "AbortError" })).toBe(false);
  });
});
