# 📦 **NPM: @raycast/utils**

**URL**: https://www.npmjs.com/package/@raycast/utils

## **Overview**
This is the official "Standard Library" for Raycast extensions. It provides high-level React hooks that abstract away the boilerplate of async tasks, state management, and CLI execution.

## **Critical Hooks for SenseType**

### **1. `useExec`**
*   **Purpose**: Replaces manual `child_process.spawn`.
*   **Why use it**:
    *   Automatic `isLoading` state.
    *   Automatic error handling.
    *   Built-in `AbortController` support (cancels old spawns when input changes).
*   **Usage**:
    ```typescript
    import { useExec } from "@raycast/utils";
    
    // Inside component
    const { isLoading, data } = useExec("path/to/binary", ["arg"], {
      execute: input.length > 0, // Conditional execution
    });
    ```

### **2. `usePromise`**
*   **Purpose**: General async wrapper. Use this if you wrap your `spawn` logic in a custom function (e.g., if you need to parse JSON output manually).

### **3. `useCachedState`**
*   **Purpose**: Persist state (like "Last used prompt") across extension restarts without manual `LocalStorage` calls.

## **Recommendation**
**Start with `useExec`**. It is designed exactly for "Run CLI -> Show Result". Only drop down to raw `spawn` if you need streaming tokens (real-time typing effect). `useExec` buffers output until exit.
