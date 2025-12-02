# 🔍 **GitHub: Everything Search (Windows)**

**URL**: https://github.com/raycast/extensions/tree/main/extensions/everything

## **Overview**
This extension integrates the popular "Everything" search tool on Windows (via Raycast for Windows, presumably, or a similar pattern). It demonstrates the "External CLI Wrapper" pattern.

## **Key Pattern: The Wrapper**

### **1. Dependency Management**
*   Unlike bundling a binary, this extension likely assumes the user *already has* the `es.exe` (Everything CLI) installed, or it points to it.
*   **SenseType Contrast**: We are **bundling** our binary. This is safer because we control the version. However, if your binary is huge (>50MB), you might adopt this "Download/Install" pattern instead.

### **2. Latency Management**
*   Search tools need to be fast. This extension likely debounces user input before calling the CLI.
*   **Search Strategy**: Check how they handle "stale" requests. If I type "A", then "AB", the "A" request might return *after* "AB" starts.
*   **Fix**: In React, ensure you ignore results from old requests. `usePromise` in Raycast handles this automatically (abort controller).

## **Takeaway**
Use this as a reference for **Debounce** logic and handling **Race Conditions** in CLI calls.
