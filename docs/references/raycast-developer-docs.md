# 📖 **Raycast Developer Docs**

**URL**: https://developers.raycast.com

## **Overview**
The central documentation hub. While you should read the basics, specific sections are critical for SenseType.

## **Key Sections**

### **1. User Interface (UI)**
*   **`Form`**: You will use `Form` for the input area.
*   **`Detail`**: Use this for the output area if you want to show Markdown (rich text).
*   **`List`**: Use this if your AI returns multiple "suggestions" or variations to pick from.

### **2. Manifest (`package.json`)**
*   **`mode`**:
    *   `view`: Opens a UI window (What you want).
    *   `no-view`: Runs in background (for simple scripts).
*   **`commands`**: You define your entry point here.

### **3. API**
*   **`Clipboard`**: `Clipboard.copy(text)` is essential for your "Exit = Copy" workflow.
*   **`showToast`**: Use `showToast(Toast.Style.Failure, "Error")` if the backend crashes.

## **Design Philosophy**
Raycast prefers **keyboard-first** interactions.
*   Don't make users click buttons.
*   Use `ActionPanel` to define keyboard shortcuts (Enter to copy, Cmd+R to regenerate).
