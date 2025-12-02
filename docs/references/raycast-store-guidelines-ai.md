# ⚖️ **Raycast Store Guidelines: AI Extensions**

**URL**: https://developers.raycast.com/basics/prepare-for-store#ai-extensions

## **Overview**
Specific rules for extensions that use AI or LLMs. Even if you don't publish to the store immediately, following these ensures your extension is high-quality and safe.

## **Critical Constraints**

### **1. No Heavy Bundling**
*   **Rule**: Raycast discourages bundling large files (> 5-10MB).
*   **Impact**: If your Go/Rust binary embeds a local LLM (like `llama.cpp`), it will be rejected.
*   **Workaround**: The binary must be a "downloader". On first run, it downloads the model weights to the user's `Application Support` folder.

### **2. API Key Safety**
*   **Rule**: Users must supply their own API keys (for OpenAI/Anthropic), OR you must provide a secure proxy. You cannot embed your personal key.
*   **Implementation**: Use the `preferences` API with `type: "password"` to ask for the user's key securely.

### **3. Transparency**
*   **Rule**: You must state which model is being used and if data is being sent to a cloud server.
*   **SenseType**: If your backend runs locally, highlight this as a privacy feature! "100% Local Processing".

## **Checklist for SenseType**
*   [ ] Binary size check (`ls -lh assets/`).
*   [ ] Securely handle API keys via `preferences`.
*   [ ] If local model used: Implement a "Download Model" progress bar on first launch.
