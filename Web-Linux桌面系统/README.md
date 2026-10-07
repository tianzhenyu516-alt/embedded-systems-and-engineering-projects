# Web-Linux｜浏览器中的桌面系统

这是一个用 React、TypeScript 和 Vite 实现的浏览器桌面实验。项目把启动画面、桌面图标、Dock、顶栏、窗口管理与多个小应用放进统一界面，让网页具备接近桌面环境的交互方式。它适合展示组件组织、跨应用状态管理和复杂前端界面的构建能力。

## 有哪些内容

- **桌面外壳**：`Desktop`、`Dock`、`TopBar` 与 `WindowManager` 负责桌面布局和窗口交互。
- **应用集合**：`src/apps/system/`、`productivity/` 和 `games/` 分别放系统工具、创作工具与小游戏。
- **状态管理**：`src/store/osStore.ts` 维护桌面系统的共享状态。
- **组件化实现**：应用与外壳分开组织，便于追踪一个图标从打开到渲染窗口的过程。

## 展示价值

桌面模拟不只是视觉效果：多个窗口、应用入口与共享状态必须共同工作，用户才能得到连贯的交互体验。项目把外壳和应用拆开实现，也为增加新应用、扩展窗口行为提供了清晰的代码入口。

## 快速运行

在本目录运行 `npm install`、`npm run dev`，然后打开终端给出的本地地址。发布前可运行 `npm run build`；如需检查规则，运行 `npm run lint`。需要 Node.js 和 npm。本仓库收录源码及锁定依赖的配置文件，依赖目录与构建产物不作为公开代码的一部分。

## 阅读入口

从 [`src/App.tsx`](src/App.tsx) 看应用入口，再看 [`src/components/WindowManager.tsx`](src/components/WindowManager.tsx) 和 [`src/store/osStore.ts`](src/store/osStore.ts) 理解窗口与状态；最后进入 [`src/apps/`](src/apps/) 查看具体应用。项目使用 React/Vite 和第三方 UI 组件，原项目许可分别适用，见[来源说明](../THIRD_PARTY.md)。
