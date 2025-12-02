# 🛠️ **GitHub: Swift Tools for Raycast**

**URL**: https://github.com/raycast/extensions-swift-tools

## **Overview**
Although strictly for Swift, this repository is the **"Gold Standard"** architectural reference for bundling compiled binaries in a Raycast extension. It solves the exact same problem SenseType has (React UI + Native Backend), just with Swift instead of Go/Rust.

## **Architectural Blueprint**

### **1. The "Hidden" Backend**
*   **Concept**: The extension is a standard TypeScript extension on the surface. The "heavy lifting" (system APIs, performance tasks) is done by a compiled executable.
*   **Bundling**: The build process compiles the native code and places the resulting binary into `assets/`.

### **2. The Bridge (IPC)**
This repo demonstrates a sophisticated bridge, but the core principle applies to Go/Rust:
*   **React Side**: Calls a function `runSwiftCommand(args)`.
*   **Node Side**: Spawns the binary from `assets/`.
*   **Communication**: Passes JSON via `stdin` -> Binary processes -> Prints JSON to `stdout` -> React parses result.

## **Key Takeaways for SenseType (Go/Rust)**
*   **Folder Structure**: Mimic their separation of `src/` (TS) and `swift/` (Native). You should have `src/` and `backend/` (Go/Rust).
*   **Build Script**: You will need a `npm run build` script that not only runs `ray build` but *also* runs `go build -o assets/processor`.
*   **Permissions**: Note how they handle `chmod +x` for the bundled binary if necessary (though usually the build process handles this).
