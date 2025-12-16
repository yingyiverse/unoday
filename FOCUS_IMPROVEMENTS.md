# Focus 模式动画改进

## 修复的问题

### 1. ✅ Hero CTA 点击动画
**问题**: 点击"Start Focusing"按钮时缺少从按钮位置扩展到全屏的动画效果

**解决方案**:
- 在 `HeroSection.tsx` 中捕获点击位置和按钮位置信息
- 通过 CustomEvent 传递位置数据到 `FocusMode` 组件
- 在 `FocusMode.tsx` 中使用 CSS `clip-path` 实现扩展动画
- 利用 CSS 变量动态设置按钮位置

**实现细节**:
```typescript
// HeroSection.tsx - 捕获位置
const handleStartFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
  const button = e.currentTarget;
  const rect = button.getBoundingClientRect();

  const top = rect.top;
  const left = rect.left;
  const right = window.innerWidth - rect.right;
  const bottom = window.innerHeight - rect.bottom;
  const x = e.clientX;
  const y = e.clientY;

  window.dispatchEvent(
    new CustomEvent('enterFocusMode', {
      detail: { x, y, top, left, right, bottom },
    })
  );
};

// FocusMode.tsx - 执行动画
const enterFocusMode = (x?, y?, top?, left?, right?, bottom?) => {
  // 设置 CSS 变量
  bgRef.current.style.setProperty('--btn-top', `${top}px`);
  bgRef.current.style.setProperty('--btn-right', `${right}px`);
  bgRef.current.style.setProperty('--btn-bottom', `${bottom}px`);
  bgRef.current.style.setProperty('--btn-left', `${left}px`);

  // 触发 clip-path 动画
  bgRef.current.classList.add('focus-enter-start');
  bgRef.current.getBoundingClientRect(); // Force reflow
  bgRef.current.classList.add('focus-enter-active');
};
```

**CSS 动画**:
```css
/* globals.css */
.focus-enter-start {
  clip-path: inset(var(--btn-top) var(--btn-right) var(--btn-bottom) var(--btn-left) round 9999px);
}

.focus-enter-active {
  clip-path: inset(0% 0% 0% 0% round 0px);
  transition: clip-path 2s cubic-bezier(0.77, 0, 0.175, 1);
}
```

---

### 2. ✅ Focus 模式刷新白屏问题
**问题**: 在 Focus 模式下刷新浏览器时，会先显示 Hero 页面（白屏），然后才跳转到 Focus 模式

**解决方案**:
- 在 `layout.tsx` 的 `<head>` 中添加内联脚本
- 脚本在页面渲染前检查 localStorage
- 如果检测到 Focus 模式，立即添加 `focus-mode-active` 类到 `<html>`
- 通过 CSS 隐藏 header 和 main，显示 Focus overlay

**实现细节**:

**layout.tsx - 内联脚本**:
```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          try {
            if (localStorage.getItem('unoday_focus_mode') === 'true') {
              document.documentElement.classList.add('focus-mode-active');
            }
          } catch (e) {}
        })();
      `,
    }}
  />
</head>
```

**globals.css - 预加载样式**:
```css
/* 当检测到 focus-mode-active 时，隐藏主内容 */
html.focus-mode-active header,
html.focus-mode-active main {
  display: none;
}

/* 立即显示 Focus overlay */
html.focus-mode-active #focus-overlay {
  opacity: 1 !important;
  pointer-events: auto !important;
}

html.focus-mode-active #focus-bg {
  clip-path: inset(0% 0% 0% 0% round 0px);
}

html.focus-mode-active #focus-content {
  opacity: 1 !important;
}
```

**FocusMode.tsx - 检测并恢复状态**:
```typescript
useEffect(() => {
  const focusMode = localStorage.getItem('unoday_focus_mode');
  if (focusMode === 'true') {
    document.documentElement.classList.add('focus-mode-active');

    // 恢复 Focus 状态
    const savedStage = localStorage.getItem('unoday_focus_stage');
    const savedTask = localStorage.getItem('unoday_current_task');
    const savedStartTime = localStorage.getItem('unoday_start_time');

    setIsVisible(true);

    if (savedStage === 'active' && savedTask && savedStartTime) {
      setStage('active');
      setUnoTask(savedTask);
      setStartTime(parseInt(savedStartTime));
    }

    // 应用持久化样式（无动画）
    if (bgRef.current) {
      bgRef.current.classList.add('focus-persisted');
    }
  }
}, []);
```

**layout.tsx - 禁用 Hydration 警告**:
```tsx
<html lang="en" className="..." suppressHydrationWarning>
```

---

## 技术要点

### 1. Hydration 处理
- 使用 `suppressHydrationWarning` 允许服务器端和客户端的 HTML 类名不同
- 内联脚本在 React hydration 之前执行，确保页面加载时就是正确的状态

### 2. 动画时序
- 点击 CTA 时：从按钮位置扩展到全屏（2秒 clip-path 动画）
- 刷新恢复时：无动画，直接显示（避免闪烁）

### 3. 状态管理
- LocalStorage 持久化：`unoday_focus_mode`, `unoday_focus_stage`, `unoday_current_task`, `unoday_start_time`
- React state 与 DOM 操作结合：使用 setTimeout 确保状态更新后再操作 DOM

### 4. CSS 变量
- 动态设置按钮位置：`--btn-top`, `--btn-right`, `--btn-bottom`, `--btn-left`
- 支持任意屏幕尺寸和按钮位置

---

## 测试验证

### 场景 1: 点击 Hero CTA
1. 访问首页
2. 点击 "Start Focusing" 按钮
3. **预期**: 黑色背景从按钮位置扩展到全屏（2秒动画）
4. **结果**: ✅ 动画流畅，效果与 HTML 版本一致

### 场景 2: Focus 模式下刷新
1. 进入 Focus 模式
2. 刷新浏览器（F5 或 Cmd+R）
3. **预期**: 直接显示黑色 Focus 界面，无白屏闪烁
4. **结果**: ✅ 无白屏，直接显示 Focus 模式

### 场景 3: 正常刷新
1. 在首页或 Witness 页面
2. 刷新浏览器
3. **预期**: 正常显示页面内容
4. **结果**: ✅ 正常显示

---

## 与 HTML 版本对比

| 功能 | HTML 版本 | Next.js 版本 | 状态 |
|------|-----------|--------------|------|
| CTA 点击动画 | ✅ clip-path 扩展 | ✅ clip-path 扩展 | ✅ 一致 |
| 动画时长 | 2秒 | 2秒 | ✅ 一致 |
| 刷新预加载 | ✅ 内联脚本 | ✅ 内联脚本 | ✅ 一致 |
| 状态恢复 | ✅ localStorage | ✅ localStorage | ✅ 一致 |
| 无白屏闪烁 | ✅ | ✅ | ✅ 一致 |

---

## 代码改动总结

### 修改的文件
1. `app/layout.tsx` - 添加内联预加载脚本
2. `components/HeroSection.tsx` - 捕获点击位置并传递
3. `components/FocusMode.tsx` - 实现动画逻辑和状态恢复

### 新增的功能
- CustomEvent 位置数据传递
- CSS 变量动态设置
- 双路径进入 Focus 模式（点击动画 vs 刷新恢复）

### 保持不变
- 所有 CSS 动画参数
- localStorage key 命名
- 组件结构和样式

---

## 性能优化

1. **内联脚本执行**: 仅在页面加载时执行一次，无性能影响
2. **CSS 动画**: 使用 GPU 加速的 `clip-path`，性能优秀
3. **条件渲染**: Focus overlay 始终存在于 DOM，但通过 CSS 控制显示

---

## 结论

✅ 两个问题都已完美解决，效果与 HTML 版本完全一致！

现在用户体验：
- 点击 "Start Focusing" 时有流畅的扩展动画
- 在 Focus 模式下刷新浏览器，无任何白屏或闪烁
- 所有过渡都自然流畅
