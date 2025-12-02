/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OpenRouter API Key - Your OpenRouter API key for accessing AI models */
  "openrouterApiKey": string,
  /** Model - The AI model to use for text transformation */
  "model": "google/gemini-2.5-flash" | "google/gemini-2.5-pro" | "openai/gpt-4o" | "openai/gpt-4o-mini" | "anthropic/claude-3.5-sonnet" | "anthropic/claude-3.5-haiku" | "meta-llama/llama-3.3-70b-instruct" | "deepseek/deepseek-chat" | "qwen/qwen-2.5-72b-instruct" | "openrouter/auto",
  /** Custom Model - Override model with a custom model ID (leave empty to use dropdown selection) */
  "customModel": string,
  /** Templates (JSON) - JSON array of templates: [{"name": "Name", "prompt": "..."}]. First template is default. */
  "templates": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}

