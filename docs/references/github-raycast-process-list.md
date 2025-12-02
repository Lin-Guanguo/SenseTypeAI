# 📊 **GitHub: Raycast Process List**

**URL**: https://github.com/bfollington/raycast-process-list

## **Overview**
A pure TypeScript extension that lists system processes. While it doesn't bundle a custom binary, it heavily relies on executing system commands (`ps`, `top`) via `child_process`.

## **Relevance to SenseType**

### **1. High-Frequency Updates**
*   **Challenge**: Listing processes requires polling the system frequently (CPU usage changes constantly).
*   **Solution**: This extension likely implements a `useInterval` or similar polling mechanism to re-run the shell command.
*   **Relevance**: SenseType needs "real-time" feedback. Observing how this extension handles rapid `spawn` calls without freezing the UI is valuable.

### **2. Parsing Stdout**
*   **Pattern**: The output of `ps` is text. The extension parses this text into JSON/Objects for the React List.
*   **Lesson**: Your Go/Rust backend should ideally output **JSON** directly. This avoids the fragile string parsing logic seen in extensions that wrap legacy CLI tools.

## **Code Snippet Idea (from analysis)**
Look for how they handle the `loading` state. When refreshing data, does the list flash? Or do they keep the old data until new data arrives? (Optimistic UI vs Loading State).
