# 📘 **SenseType AI — Project Overview**

## 🧠 **Project Vision**

SenseType AI 是一个面向 Raycast 的 **AI 输入增强引擎**，目标是实现：

* 类输入法体验
* 实时输入（input） → 智能理解（sense） → AI 处理 → 输出（transform）
* 像输入法一样提升英文写作、补全、纠错、改写能力
* 最终成为“下一代 AI 输入方式”

一句话愿景：

> **SenseType AI = An AI-powered input engine that senses your intent and transforms your typing.**

---

# 🎯 **What This Tool Should Do**

你希望 SenseType AI 提供：

### **1. 一个 Raycast 界面**

* 上方输入框（实时输入）
* 下方输出框（AI 处理结果）

### **2. 输入实时响应 + 自动防抖（debounce）**

* 每次输入不立即处理
* 停止输入后 X 毫秒触发 AI 处理
* 避免卡顿 / 性能浪费

### **3. 后端程序处理输入内容**

* 你自己的 CLI 程序：Go / Rust / Python / Node 任意
* 程序可以接收 input → 进行 prompt → 输出结果

### **4. Raycast 输出 UI 自动更新**

### **5. 退出插件时自动将输出内容复制到剪贴板**

这是你描述的完整“智能输入 → AI 引导 → 输出 → 自动复制”的链路。

---

# 🧱 **Recommended Technical Architecture**

你打算开发一个 **Raycast React 插件**（而不是 script command）。

技术结构如下：

---

## ✔ 前端（Raycast Extension UI）

* React + TypeScript
* 使用 Raycast 提供的组件：

  * `Form.TextArea`（输入框）
  * `Form.TextArea` 或 `Detail`（输出框）
  * `ActionPanel` + `Clipboard.copy`
* `useState`, `useEffect` 管理输入状态
* 自定义 debounce（或 lodash.debounce）

主要行为：

```
input change → debounce → call backend → update output
```

---

## ✔ 后端（你的处理程序）

你可使用任意语言（Rust / Go / Python / Node），只需要支持：

```
process input → stdout output
```

Raycast 用 Node 的 `exec` 调用即可。

---

## ✔ 数据流示意

```
User typing
    ↓
React input field
    ↓ (debounce)
Call backend program (exec)
    ↓
AI processing / transformation
    ↓
Return stdout
    ↓
Update output field
    ↓
On exit → copy to clipboard
```

这个架构完全符合你“类输入法 + 智能引导输入”的目标。

---

# 📚 **Reference Documents (Must Read)**

### ⭐ 官方强相关文档（必读）

| 文档                                                                                                                                     | 说明                          |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Raycast for Developers**                                                                                                             | 开发入口，总览（UI、API、扩展模型）        |
| [https://www.raycast.com/developers](https://www.raycast.com/developers)                                                               | Raycast Extension 官方 API 文档 |
| [https://developers.raycast.com/basics/create-your-first-extension](https://developers.raycast.com/basics/create-your-first-extension) | 如何从零创建你的第一款 Raycast 插件      |
| [https://developers.raycast.com/api-reference](https://developers.raycast.com/api-reference)                                           | 所有 UI + 系统 API 文档           |

这些是构建 SenseType AI 的核心参考。

---

### ⭐ 补充中文文档（帮助理解）

| 文档                                                                                                                                         | 描述                     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Raycast 插件开发中文指南                                                                                                                           | 解释 Raycast 扩展系统与 UI 限制 |
| [https://zsakvo.notion.site/Raycast-b4998b2deca348f5b9192af2838e074f](https://zsakvo.notion.site/Raycast-b4998b2deca348f5b9192af2838e074f) |                        |

---

### ⭐ 实战开发流程参考

| 文档                                                                                                                                                 | 描述                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Raycast Extension Building Guide                                                                                                                   | 从创建 → 本地调试 → 构建 → 发布 |
| [https://www.davidalecrim.dev/articles/raycast-extension-building-guide/](https://www.davidalecrim.dev/articles/raycast-extension-building-guide/) |                      |

---

# 🧩 **Recommended Project Structure**

```
sense-type-ai/
  ├─ src/
  │   ├─ index.tsx           # UI: input + output + debounce
  │   ├─ runBackend.ts       # 调用后端执行逻辑
  │   ├─ debounce.ts         # 自实现防抖（或用 lodash）
  ├─ backend/
  │   └─ processor (Go/Rust/Python binary)
  ├─ assets/
  │   └─ icon.png
  ├─ README.md
  ├─ raycast.json
  └─ package.json
```

---

# 🔥 **SenseType AI — Design Identity**

你选定的英文名：

### **SenseType AI**

意味着：

* “Type” → 打字 / 输入 / 输入法体验
* “Sense” → AI 对语义的理解、判断、纠错
* “AI” → 代表智能输入引擎

对你的愿景来说非常精准。

---

# 🚀 **Next Steps（建议你开始执行的步骤）**

### 1. 阅读官方 “Create Your First Extension”

确认本地能够跑通 hello-world。

### 2. 在项目目录创建 Raycast 扩展骨架

```
npm init raycast-extension
```

### 3. 实现基础 UI

* 输入框
* 输出框
* Action：copy to clipboard

### 4. 加入 debounce → 只在输入停止后调用后端

### 5. 编写后端 CLI（Rust / Go etc）

* 接收输入 → 处理 → 输出 stdout

### 6. 完成主循环

React → 后端 → 结果更新 → 离开时复制

之后你就可以不断增强逻辑（prompt、意图识别、多模式等）。

