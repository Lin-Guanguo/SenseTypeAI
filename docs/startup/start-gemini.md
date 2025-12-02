# 🛠️ **SenseType AI — Gemini Technical Supplement**

This document complements `start.md` with specific implementation details gathered for the Raycast environment. It focuses on the "How-To" of the architecture described in the project vision.

## 📂 **1. Executing Local Binaries (The Backend)**

Since the core logic will reside in a compiled binary (Go/Rust) or script, we need a way to bundle and execute it.

### **Bundling**
*   Place your compiled binary (e.g., `processor`) inside the `assets/` folder of the extension.
*   Ensure the binary has executable permissions before bundling/committing (`chmod +x assets/processor`).

### **Execution Logic**
Raycast extensions run in a Node.js environment that supports `child_process`.

```typescript
import { environment } from "@raycast/api";
import { spawn } from "child_process";
import path from "path";

// 1. Resolve path to the binary
const binaryPath = path.join(environment.assetsPath, "processor");

// 2. Execute
const child = spawn(binaryPath, ["arg1", "your input text"]);

child.stdout.on("data", (data) => {
  console.log(`Output: ${data}`);
});
```

> **Note**: You might need to explicitly handle `process.arch` if you plan to distribute binaries for both Apple Silicon (arm64) and Intel (x64), or rely on a universal binary.

---

## 🎨 **2. UI Implementation Details**

### **Input & Output: `Form.TextArea`**
The `Form.TextArea` component is ideal for both the input and the "preview" output.

*   **Props to watch**:
    *   `id`: Required for form handling.
    *   `value` & `onChange`: For controlled components (essential for real-time processing).
    *   `enableMarkdown`: Set to `true` if you want the AI output to support rich formatting.
    *   `autoFocus`: Use on the input field.

### **Actions: `ActionPanel`**
To achieve the "Exit = Copy" flow, or just general usability:

*   **Copy Output**: Use `<Action.CopyToClipboard content={output} />`.
*   **Structure**:
    ```tsx
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Result" content={aiOutput} />
      {/* Optional: Add a button to force re-generation */}
      <Action title="Regenerate" onAction={handleRegenerate} />
    </ActionPanel>
    ```

---

## ⚡ **3. State & Async Management**

### **Debounce Strategy**
Since we want "Real-time input -> Pause -> Process", a custom debounce hook or `lodash.debounce` is required.

*   **Pattern**:
    1.  User types in `Form.TextArea` -> updates local state immediately.
    2.  `useEffect` triggers a debounced function.
    3.  The debounced function calls the backend binary.

### **`usePromise` Hook**
Raycast provides a `usePromise` hook which is excellent for managing the backend execution state (`isLoading`, `data`, `error`).

```typescript
import { usePromise } from "@raycast/utils";

// inside component
const { isLoading, data } = usePromise(runBackendProcessor, [inputText], {
  execute: !!inputText && isDebounceReady, // Only run if conditions met
});
```

---

## ⚙️ **4. Configuration (`package.json`)**

*   **Commands**: You will define your command in `package.json` under `raycast`.
*   **Title & Icon**: Essential for the extension store listing.
*   **Assets**: Ensure the `assets` directory is included in the build if specific bundler config is needed (usually Raycast handles `assets/` automatically).

---

## 📝 **Summary Checklist for Gemini**

- [ ] **Scaffold**: `npm init raycast-extension`
- [ ] **Assets**: Create `assets/` and place dummy binary/script there for testing.
- [ ] **Backend Interface**: Write a TypeScript wrapper function around `child_process.spawn` to make the React code clean.
- [ ] **UI Construction**: Build the split view (Input/Output) using `Form`.
- [ ] **Wiring**: Connect `onChange` -> Debounce -> Backend Wrapper -> `setResult`.
