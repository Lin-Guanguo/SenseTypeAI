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
  /** Model - Model ID (e.g. google/gemini-2.5-flash-lite, gpt-4o) */
  "model": string,
  /** Custom Prompts (JSON) - Add custom prompts (shown before defaults). JSON array: [{"name": "Name", "prompt": "..."}] */
  "prompts": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `deep` command */
  export type Deep = ExtensionPreferences & {}
  /** Preferences accessible in the `quick` command */
  export type Quick = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-type-english` command */
  export type QuickTypeEnglish = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-type-chinese` command */
  export type QuickTypeChinese = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-improve-writing` command */
  export type QuickImproveWriting = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `deep` command */
  export type Deep = {}
  /** Arguments passed to the `quick` command */
  export type Quick = {}
  /** Arguments passed to the `quick-type-english` command */
  export type QuickTypeEnglish = {}
  /** Arguments passed to the `quick-type-chinese` command */
  export type QuickTypeChinese = {}
  /** Arguments passed to the `quick-improve-writing` command */
  export type QuickImproveWriting = {}
}

