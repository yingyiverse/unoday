
<p align="center">
  <a href="./README.md"><img src="https://img.shields.io/badge/lang-中文-red?style=flat-square" alt="中文" /></a>
  <a href="./README.en.md"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="English" /></a>
</p>


<div align="center">
  <h1>UnoDay</h1>
  <p>你当下唯一的事 Your Daily Uno.</p>
  <p>一日一事，当下唯一。于纷扰中保持澄澈，其余皆可待。</p>
</div>


## 产品哲学
在一个注意力被“偷走”的时代，我们急需回归当下，去思考那些真正重要的事情，保持专注，这就是Uno，一个帮助自己回归专注的小产品，每天可以只有一个Uno，也可以是三五个，这完全取决于个人偏好。产品的设计理念同样源自禅宗："Only Now."，"Let go." 当你专注在一件事上，也许有很多其它“念头”，接受它，放下它，继续回到当下，就这么简单。
另外，产品做了极大的取舍，没有任何AI元素，除了Vibe Coding本身。

## 关于Uno
Uno这个词最早起源拉丁语 “Unus”，后来经过西班牙语、意大利语等演变，代表数字“1”（One）、唯一，与Unit、Unique同源。在这个小产品Vibe Coding中，我才知道有个游戏叫“UNO”，当你只剩最后一张牌，从概率上说，胜率最大，但，也不一定？就我个人而言，我更倾向于这个词读（/juː/），而不是（/u/）。

![UnoDay Cover](Unoday.png)

<p align="center">Uno Task</p>

![Uno Task](Uno%20task.png)

<p align="center">Uno Focus 专注时刻</p>

![Timer 1](Timer1.png)
![Timer 2](Timer2.png)

## 特性
- 限定数量的每日Uno，输入思考模式、Uno模式、计时器模式
- 计时器（3/15/30/60 分钟），可以选择喜欢的环境音进入深度专注
- 杂念抽屉，快捷键 `Ctrl/Cmd + D`，一个可以轻量化记录各种杂念的地方
- 全屏快捷键 `F` 或 `Cmd/Ctrl + Shift + F`（跨平台）
- 每日见证与徽章（3/7/30/365）
- 本地存储数据，无服务器依赖


## 配置最大限制的每日Uno数量
```bash
export const DAILY_UNO_LIMIT = 5;   // Every day, the maximum number of Uno
```

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