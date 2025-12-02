Last Updated: 2025-12-02

# 📚 SenseType AI — References & Resources

This directory contains detailed summaries and architectural analysis of external resources relevant to SenseType AI.

## 📖 **Core Documentation**

*   [**Raycast Developer Docs**](./raycast-developer-docs.md)
    *   *Overview of UI components (`Form`, `Detail`) and Manifest configuration.*
*   [**Raycast Store Guidelines: AI Extensions**](./raycast-store-guidelines-ai.md)
    *   *Crucial constraints on binary size and API key security.*

## 🛠️ **Technical Patterns & Libraries**

*   [**NPM: @raycast/utils**](./npm-raycast-utils.md)
    *   *Guide to `useExec` and `usePromise` hooks. The modern replacement for raw `child_process`.*
*   [**Advanced Development Tips**](./advanced-tips.md)
    *   *Internal guide on Performance (Spawn vs Daemon) and Debugging techniques.*
*   [**OpenRouter Quickstart**](./openrouter-quickstart.md)
    *   *Base URL, required headers, env key handling, and chat completion body schema.*

## 🌍 **Codebase Examples (GitHub)**

*   [**Raycast Extensions Repository**](./github-raycast-extensions.md)
    *   *The main "Monorepo". How to search it for real-world examples.*
*   [**Swift Tools for Raycast**](./github-raycast-extensions-swift-tools.md)
    *   ***Gold Standard* for bundling binaries.** Use this as your blueprint for the build system.
*   [**Raycast Process List**](./github-raycast-process-list.md)
    *   *Reference for high-frequency system updates and List UI.*
*   [**Everything Search (Windows)**](./github-raycast-extensions-everything.md)
    *   *Reference for wrapping external CLI tools and handling latency.*

---

## 🚀 **Quick Start Guide for SenseType Developers**

1.  **Architecture**: Read [Swift Tools](./github-raycast-extensions-swift-tools.md) to understand how to bundle your Go/Rust binary.
2.  **Frontend**: Use patterns from [@raycast/utils](./npm-raycast-utils.md) to call that binary.
3.  **Performance**: If typing is laggy, consult [Advanced Tips](./advanced-tips.md) for the "Long-Running Worker" pattern.
