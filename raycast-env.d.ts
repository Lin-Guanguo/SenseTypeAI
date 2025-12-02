/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - API key for the AI service */
  "apiKey": string,
  /** API Base URL - OpenAI-compatible API endpoint */
  "apiBaseUrl": string,
  /** Model - Model ID (e.g. google/gemini-2.5-flash, gpt-4o) */
  "model": string,
  /** Custom Prompts (JSON) - Add custom prompts (shown before defaults). JSON array: [{"name": "Name", "prompt": "..."}] */
  "prompts": string
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

