# 🚀 **SenseType AI — Advanced Development Tips**

This document consolidates advanced patterns for performance, debugging, and security, specifically tailored for the "SenseType" architecture (React UI + Binary Backend).

## ⚡ **1. Performance Strategy: Spawn vs. Daemon**

### **The Challenge**
SenseType aims for "real-time" typing feedback.
*   **`child_process.spawn` Latency**: Node.js `spawn` can take ~50-100ms just to start. Doing this on every keystroke (even with debounce) creates noticeable lag.
*   **CPU/Memory**: Spawning thousands of short-lived processes is resource-heavy.

### **Recommended Solution: Hybrid Approach**
1.  **Quick Tasks (Standard)**: For simple logic, just use `useExec` (wraps `spawn`).
2.  **High Frequency (Typing)**: If latency is too high, implement a **Long-Running Worker** pattern.

#### **Long-Running Worker Pattern**
Instead of `spawn` per keypress, start the binary *once* when the React component mounts, and keep it alive via `stdin`/`stdout` streaming.

*   **React Side**:
    ```typescript
    import { spawn } from "child_process";
    import { useEffect, useRef } from "react";

    export function useBackendSession() {
      const processRef = useRef<ChildProcess | null>(null);

      useEffect(() => {
        // 1. Start binary ONCE
        const child = spawn(pathToBinary, ["interactive-mode"]);
        processRef.current = child;

        child.stdout.on("data", (data) => {
          // Handle real-time stream results
        });

        return () => {
          // Cleanup on unmount
          child.kill();
        };
      }, []);

      const sendInput = (text: string) => {
        // 2. Write to stdin instead of respawning
        processRef.current?.stdin.write(text + "\n");
      };

      return { sendInput };
    }
    ```
*   **Binary Side (Go/Rust)**:
    *   Must support an "interactive mode" that reads from `stdin` loop and prints JSON to `stdout`.

> **MVP Advice**: Start with standard `spawn` (debounce 300ms). Only optimize to "Worker" if you feel the lag.

---

## 🐞 **2. Debugging the Backend**

Raycast runs extensions in a hidden Node environment, making it hard to see `stderr` from your binary.

### **Technique A: `console.log` Proxy**
When running `npx ray develop`, the terminal *will* show logs from the extension.
*   **Action**: Ensure your React code captures `child.stderr` and pipes it to `console.error`.

### **Technique B: File Logging (The "Panic" Button)**
If the binary crashes before React can catch it, have the binary write to a temp file.
*   **Go Example**:
    ```go
    f, _ := os.OpenFile("/tmp/sensetype-debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    log.SetOutput(f)
    ```
*   **Tail it**: `tail -f /tmp/sensetype-debug.log` in a separate terminal.

---

## 🔐 **3. Security & API Keys**

If SenseType uses OpenAI/Anthropic:
1.  **Manifest (`package.json`)**:
    ```json
    "preferences": [
      {
        "name": "apiKey",
        "type": "password",
        "title": "OpenAI API Key",
        "description": "Your secure key",
        "required": true
      }
    ]
    ```
2.  **React Access**:
    ```typescript
    import { getPreferenceValues } from "@raycast/api";
const { apiKey } = getPreferenceValues<Preferences>();
    ```
    *   *Note*: Raycast automatically stores `password` types in the macOS Keychain.

---

## 🧹 **4. Background Maintenance (Optional)**

If you need to clean up cache or update local models periodically:
*   Use **Background Commands** in `package.json`:
    ```json
    "background": {
      "interval": "1h",
      "activated": true
    }
    ```
*   *Use Case*: Check for new prompt template updates every hour without slowing down the typing UI.
