# UnoDay

<p align="right">
  <a href="./README.md"><img src="https://img.shields.io/badge/lang-中文-red?style=flat-square" alt="中文" /></a>
  <a href="./README.en.md"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="English" /></a>
</p>

<p align="center">
  <a href="https://github.com/Yingyiverse/unoday/stargazers"><img src="https://img.shields.io/github/stars/Yingyiverse/unoday?style=flat-square" alt="Stars" /></a>
  <a href="https://github.com/Yingyiverse/unoday/network/members"><img src="https://img.shields.io/github/forks/Yingyiverse/unoday?style=flat-square" alt="Forks" /></a>
  <a href="https://github.com/Yingyiverse/unoday/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Yingyiverse/unoday?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3" />
</p>

<div align="center">
  <h2>UnoDay</h2>
  <p>你当下唯一的事 Your Daily Uno.</p>
  <p>一日一事，当下唯一。于纷扰中保持澄澈，其余皆可待。</p>
</div>

## 产品哲学
在一个注意力被“偷走”的时代，我们急需回归当下，去思考那些真正重要的事情，保持专注，这就是Uno，一个帮助用户/帮助自己回归专注的小产品，每天可以只有一个Uno，也可以是三五个，这完全取决于个人偏好。
产品的设计理念源自禅宗："Only Now."，"Let go." 当你专注在一件事上，也许有很多其它“念头”，接收它，放下它，继续回到当下的专注，这就是生活本身。

## 关于Uno
Uno这个词最早起源拉丁语词汇 “Unus”，后来经过西班牙语、意大利语等演变，代表数字“1”（One）、唯一，与Unit、Unique同源。直到这个产品idea在实际Vibe Coding中，我才知道有个游戏叫“UNO”，当你只剩最后一张牌，从概率上说，胜率最大，但，也不一定？就我个人而言，我更倾向于这个词读（/juː/），而不是（/u/）。

![UnoDay Cover](Unoday.png)
![Uno Task](Uno%20task.png)
![Timer 1](Timer1.png)
![Timer 2](Timer2.png)

## 特性
- Next.js 15 + React 19 + TypeScript + Tailwind
- 专注模式三阶段（输入 / 专注 / 结果），长按 5 秒触发操作
- 计时器（3/15/30/60 分钟），环境音选择；预览 5 秒并在末尾淡出；结束提示钟声
- 杂念抽屉，快捷键 `Ctrl/Cmd + D`
- 全屏快捷键 `F` 或 `Cmd/Ctrl + Shift + F`（跨平台）
- 5 秒无操作后文字颜色渐变，元素淡入淡出
- 刷新持久化与白屏消除（SSR 覆盖层）
- 每日见证与徽章（3/7/30/365）
- 中英文切换，暗色模式
- 本地存储数据，无服务器依赖

## 快速开始
```bash
npm install
npm run dev
```
开发地址：`http://localhost:3000`

生产部署：
```bash
npm run build
npm start
```

## 快捷键
- `Ctrl/Cmd + D`：打开/关闭杂念箱
- `F` 或 `Cmd/Ctrl + Shift + F`：进入/退出全屏

## 目录结构
```
Next/
├── app/                 # 布局、页面与全局样式
├── components/          # 组件（Header/FocusMode/Sections 等）
├── lib/                 # 常量、类型、工具与 i18n
└── hooks/               # 自定义 Hooks（可选）
```

## 许可
MIT
