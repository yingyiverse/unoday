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

One day, one task. Stay present. The rest can wait.

![UnoDay Cover](Unoday.png)
![Uno Task](Uno%20task.png)
![Timer 1](Timer1.png)
![Timer 2](Timer2.png)

## Features
- Next.js 15 + React 19 + TypeScript + Tailwind
- Focus Mode with 3 stages (Input / Active / Result), long-press (5s) actions
- Timer (3/15/30/60 min) with ambient sounds; 5s preview with fade-out; exit bell
- Distraction Drawer with `Ctrl/Cmd + D`
- Fullscreen shortcut `F` or `Cmd/Ctrl + Shift + F` (cross-platform)
- After 5s inactivity, text color transitions and elements fade in/out
- Refresh persistence with white-flash elimination (SSR overlay)
- Daily Witness & Badges (3/7/30/365)
- Internationalization (English/Chinese), Dark mode
- LocalStorage data, no server required

## Quick Start
```bash
npm install
npm run dev
```
Open `http://localhost:3000`

Production:
```bash
npm run build
npm start
```

## Shortcuts
- `Ctrl/Cmd + D`: Toggle the distraction drawer
- `F` or `Cmd/Ctrl + Shift + F`: Enter/exit fullscreen

## Structure
```
Next/
├── app/                 # Layout, pages, global styles
├── components/          # Components (Header/FocusMode/Sections)
├── lib/                 # Constants, types, utils, i18n
└── hooks/               # Custom hooks (optional)
```

## License
MIT
