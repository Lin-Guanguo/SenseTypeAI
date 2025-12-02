# 📂 **GitHub: Raycast Extensions Repository**

**URL**: https://github.com/raycast/extensions

## **Overview**
This is the official "monorepo" containing source code for every extension available in the Raycast Store. It is the single most important resource for learning real-world implementation patterns.

## **Key Patterns for SenseType**

### **1. Project Structure**
Most extensions follow this structure:
```
extension-name/
├── package.json       # Manifest
├── assets/            # Icons, images, and BINARIES
├── src/
│   ├── index.tsx      # Main React UI
│   └── lib/           # Helpers
├── tsconfig.json
└── raycast.json       # (Legacy) or package.json config
```
*   **Takeaway**: You will likely place your Go/Rust binary in `assets/` or a dedicated `bin/` folder that gets copied to `assets/` during build.

### **2. Executing External Tools**
Searching this repo for `child_process` or `cross-spawn` reveals common patterns:
*   **Pattern**: Extensions usually wrap CLI calls in a `useEffect` hook or a custom helper function.
*   **Safety**: They often check for the existence of the binary or valid permissions before running.

## **Actionable Advice**
*   **Clone & Search**: `git clone` this repo locally.
*   **Grep**: Run `grep -r "child_process" .` to find examples of how other developers handle stdin/stdout streams safely in React.
*   **Look for**: Extensions that wrap "heavy" CLIs (like `ffmpeg`, `docker`, `kubectl`) are your best reference models.
