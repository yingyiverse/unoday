# UnoDay 实施路线图

本文档规划了 UnoDay Next.js + AI + 语音对话 的完整实施路径，包含详细的任务分解、时间估算和依赖关系。

---

## 总览

### 项目目标
- ✅ 完成 Next.js 迁移（已完成）
- 🔄 集成 Supabase 数据库
- 🔄 集成 AI 对话能力（Claude 3.5）
- 🔄 集成语音对话（STT + TTS）
- 🔄 实现工具调用（AI 控制 UI）
- 🔄 部署上线

### 技术栈
- **前端**: Next.js 15 + TypeScript + Tailwind CSS
- **数据库**: Supabase (PostgreSQL + pgvector)
- **AI 模型**: Anthropic Claude 3.5 Sonnet
- **语音输入**: OpenAI Whisper API
- **语音输出**: OpenAI TTS API
- **部署**: Vercel

### 总体时间估算
**8-10 周**（按优先级可分阶段上线）

---

## Phase 0: 准备工作（已完成 ✅）

### ✅ Next.js 项目搭建
- [x] 创建 Next.js 15 项目
- [x] 配置 TypeScript 和 Tailwind CSS
- [x] 实现 i18n 多语言支持
- [x] 迁移所有 UI 组件
- [x] 实现 Focus Mode 和 Distraction Drawer

### ✅ 文档编写
- [x] DATABASE_SCHEMA.md - 数据库架构文档
- [x] AI_ARCHITECTURE.md - AI 技术架构
- [x] DATABASE_REDESIGN.md - 数据库优化设计
- [x] VOICE_INTEGRATION.md - 语音集成方案
- [x] AI_INTEGRATION_GUIDE.md - AI 集成指南
- [x] IMPLEMENTATION_ROADMAP.md - 本文档

---

## Phase 1: Supabase 数据层集成（第 1-2 周）

### 优先级: P0（必须完成）

### 1.1 数据库迁移 `[3 天]`

**任务清单**:
- [ ] 在 Supabase Dashboard 中执行数据库迁移 SQL
  - [ ] 修改 `thoughts` 表（添加新字段）
  - [ ] 创建 `conversations` 表
  - [ ] 创建 `messages` 表
  - [ ] 创建 `user_preferences` 表
  - [ ] 创建所有索引（包括向量索引）
- [ ] 创建 RPC 函数
  - [ ] `create_thought_with_embedding()`
  - [ ] `get_user_context()`
  - [ ] `get_today_stats()`
  - [ ] 更新 `match_thoughts()` 函数
- [ ] 设置 RLS 策略
  - [ ] thoughts 表 RLS
  - [ ] conversations 表 RLS
  - [ ] messages 表 RLS
  - [ ] user_preferences 表 RLS
- [ ] 验证数据库结构

**交付物**:
- ✅ 数据库完整迁移
- ✅ 所有 RPC 函数可用
- ✅ RLS 策略生效

**风险**:
- ⚠️ 向量索引创建可能较慢（数据量大时）
- ⚠️ RLS 策略配置错误可能导致权限问题

---

### 1.2 TypeScript 类型定义 `[1 天]`

**任务清单**:
- [ ] 更新 `lib/database.types.ts`
  - [ ] 定义所有表的 Row/Insert/Update 类型
  - [ ] 定义所有 RPC 函数签名
  - [ ] 定义辅助类型（FocusLog, ToolCall 等）
- [ ] 创建业务类型 `lib/types.ts`
  - [ ] Thought, Conversation, Message 接口
  - [ ] UserContext, TodayStats 接口

**交付物**:
- ✅ 完整的类型定义文件
- ✅ 类型检查无错误

---

### 1.3 Supabase 客户端封装 `[2 天]`

**任务清单**:
- [ ] 创建服务端 Supabase 客户端工具
  - [ ] `lib/supabase/server.ts` - 服务端组件使用
  - [ ] `lib/supabase/client.ts` - 客户端组件使用
- [ ] 创建数据访问 Hook
  - [ ] `hooks/useThoughts.ts` - 管理 thoughts 数据
  - [ ] `hooks/useUserContext.ts` - 获取用户上下文
  - [ ] `hooks/useTodayStats.ts` - 获取今日统计
  - [ ] `hooks/useRealtimeThoughts.ts` - 实时订阅

**交付物**:
- ✅ 封装好的 Supabase 客户端
- ✅ 常用数据操作 Hook

---

### 1.4 认证系统集成 `[2 天]`

**任务清单**:
- [ ] 集成 Supabase Auth
  - [ ] 创建登录页面 `app/login/page.tsx`
  - [ ] 实现邮箱+密码登录
  - [ ] 实现 OAuth 登录（Google, GitHub）
  - [ ] 创建注册页面
- [ ] 创建认证中间件 `middleware.ts`
  - [ ] 保护需要登录的页面
  - [ ] 自动重定向未登录用户
- [ ] 创建用户设置页面 `app/settings/page.tsx`
  - [ ] 查看/编辑用户信息
  - [ ] 修改偏好设置

**交付物**:
- ✅ 完整的认证流程
- ✅ 用户设置页面

**可选**:
- [ ] 实现"记住我"功能
- [ ] 实现"找回密码"功能

---

### 1.5 数据迁移工具 `[2 天]`

**任务清单**:
- [ ] 创建 localStorage 导入工具
  - [ ] `lib/migrations/importFromLocalStorage.ts`
  - [ ] 导入当前任务
  - [ ] 导入杂念列表
  - [ ] 导入历史记录
- [ ] 创建迁移 UI
  - [ ] 首次登录时提示导入
  - [ ] 显示导入进度
  - [ ] 导入完成后清空 localStorage

**交付物**:
- ✅ 数据迁移功能
- ✅ 用户友好的迁移流程

---

### 1.6 集成到现有组件 `[3 天]`

**任务清单**:
- [ ] 修改 FocusMode 组件
  - [ ] 使用 Supabase 保存/加载当前任务
  - [ ] 调用 `switch_focus()` RPC
  - [ ] 实时同步状态
- [ ] 修改 DistractionDrawer 组件
  - [ ] 使用 Supabase 加载杂念列表
  - [ ] 实现添加/删除杂念
  - [ ] 实时订阅更新
- [ ] 修改 Witness 页面
  - [ ] 从 Supabase 加载历史记录
  - [ ] 显示真实统计数据
  - [ ] 优化加载性能

**交付物**:
- ✅ 所有组件使用 Supabase
- ✅ 移除 localStorage 依赖
- ✅ 数据实时同步

---

## Phase 2: AI 对话集成（第 3-4 周）

### 优先级: P0（必须完成）

### 2.1 环境准备 `[1 天]`

**任务清单**:
- [ ] 安装 AI SDK 依赖
  ```bash
  npm install ai @ai-sdk/anthropic openai zod
  ```
- [ ] 配置环境变量
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `OPENAI_API_KEY`
- [ ] 创建 Embeddings 工具类 `lib/embeddings.ts`

**交付物**:
- ✅ 依赖安装完成
- ✅ API 密钥配置

---

### 2.2 AI Tools 实现 `[3 天]`

**任务清单**:
- [ ] 创建工具定义文件 `app/api/chat/tools.ts`
  - [ ] `createDistractionTool` - 创建杂念
  - [ ] `updateDistractionTool` - 更新杂念
  - [ ] `deleteDistractionTool` - 删除杂念
  - [ ] `startFocusTool` - 开始专注
  - [ ] `completeTaskTool` - 完成任务
  - [ ] `pauseTaskTool` - 暂停任务
  - [ ] `abandonTaskTool` - 放弃任务
  - [ ] `openDistractionDrawerTool` - 打开杂念箱
  - [ ] `searchThoughtsTool` - 语义搜索
  - [ ] `getCurrentStateTool` - 获取当前状态
  - [ ] `getTodayStatsTool` - 获取今日统计

**交付物**:
- ✅ 所有工具函数实现
- ✅ 单元测试覆盖

---

### 2.3 AI Chat API 路由 `[2 天]`

**任务清单**:
- [ ] 创建 API 路由 `app/api/chat/route.ts`
  - [ ] 用户认证验证
  - [ ] 获取用户上下文
  - [ ] 构建系统提示词
  - [ ] 调用 Claude 3.5 API
  - [ ] 处理工具调用
  - [ ] 流式返回响应
- [ ] 错误处理和日志记录

**交付物**:
- ✅ AI Chat API 可用
- ✅ 支持流式响应
- ✅ 工具调用正常

---

### 2.4 对话历史管理 `[2 天]`

**任务清单**:
- [ ] 实现对话保存逻辑
  - [ ] 创建新对话时保存到 conversations 表
  - [ ] 每条消息保存到 messages 表
  - [ ] 记录工具调用详情
- [ ] 创建对话历史 Hook
  - [ ] `hooks/useConversations.ts` - 加载对话列表
  - [ ] `hooks/useConversationMessages.ts` - 加载消息
- [ ] 上下文管理
  - [ ] 实现滑动窗口（保留最近 10 条）
  - [ ] 长对话摘要功能

**交付物**:
- ✅ 对话历史持久化
- ✅ 对话加载和管理

---

## Phase 3: 语音对话集成（第 5-6 周）

### 优先级: P1（高优先级）

### 3.1 前端录音功能 `[3 天]`

**任务清单**:
- [ ] 创建录音 Hook `hooks/useVoiceRecorder.ts`
  - [ ] 请求麦克风权限
  - [ ] 实现 MediaRecorder 录音
  - [ ] 实时音量检测（用于波形）
  - [ ] 生成音频 Blob
- [ ] 创建波形可视化组件 `components/Voice/Waveform.tsx`
  - [ ] Canvas 绘制音频波形
  - [ ] 实时动画效果
- [ ] 自动停顿检测
  - [ ] 3 秒无声自动停止

**交付物**:
- ✅ 录音功能可用
- ✅ 波形动画流畅

---

### 3.2 STT API 集成 `[2 天]`

**任务清单**:
- [ ] 创建 STT API 路由 `app/api/voice/transcribe/route.ts`
  - [ ] 接收音频文件
  - [ ] 调用 Whisper API
  - [ ] 返回转录文本
- [ ] 前端集成
  - [ ] 上传音频到 API
  - [ ] 显示识别状态
  - [ ] 处理识别错误
- [ ] 降级方案
  - [ ] 实现 Web Speech API 备选
  - [ ] 智能降级逻辑

**交付物**:
- ✅ STT 功能正常
- ✅ 中文识别准确

---

### 3.3 TTS API 集成 `[2 天]`

**任务清单**:
- [ ] 创建 TTS API 路由 `app/api/voice/synthesize/route.ts`
  - [ ] 接收文本
  - [ ] 调用 OpenAI TTS API
  - [ ] 流式返回音频
- [ ] 音频播放 Hook `hooks/useAudioPlayer.ts`
  - [ ] 播放/暂停控制
  - [ ] 播放进度显示
  - [ ] 音量控制
- [ ] TTS 音频缓存
  - [ ] 常见回复预生成
  - [ ] 缓存管理

**交付物**:
- ✅ TTS 功能正常
- ✅ 语音自然流畅

---

### 3.4 语音 UI 组件 `[4 天]`

**任务清单**:
- [ ] 创建语音聊天按钮 `components/Voice/VoiceButton.tsx`
  - [ ] 浮动按钮设计
  - [ ] Hover 提示
- [ ] 创建语音聊天界面 `components/Voice/VoiceChatDrawer.tsx`
  - [ ] 侧边抽屉布局
  - [ ] 对话历史显示
  - [ ] 录音区域
  - [ ] 播放控制
- [ ] 创建消息组件 `components/Voice/VoiceMessage.tsx`
  - [ ] 用户消息（带波形）
  - [ ] AI 消息（带播放按钮）
  - [ ] 工具调用标记
- [ ] 创建录音按钮 `components/Voice/RecordButton.tsx`
  - [ ] 按住说话交互
  - [ ] 录音状态动画
  - [ ] 自动停止提示

**交付物**:
- ✅ 完整的语音 UI
- ✅ 流畅的交互体验

---

### 3.5 语音与 AI 整合 `[2 天]`

**任务清单**:
- [ ] 打通语音输入 → AI 处理 → 语音输出流程
  - [ ] 录音 → STT → 显示文字
  - [ ] 发送到 AI Chat API
  - [ ] AI 回复 → TTS → 播放语音
- [ ] UI 操作触发
  - [ ] 监听工具调用结果
  - [ ] 触发相应的 UI 操作
- [ ] 错误处理
  - [ ] 网络失败重试
  - [ ] 降级到文字输入

**交付物**:
- ✅ 语音对话端到端可用
- ✅ AI 工具调用生效

---

## Phase 4: 体验优化和测试（第 7 周）

### 优先级: P1（高优先级）

### 4.1 性能优化 `[2 天]`

**任务清单**:
- [ ] 数据库查询优化
  - [ ] 添加缺失的索引
  - [ ] 优化 RPC 函数性能
- [ ] 前端性能优化
  - [ ] 实现虚拟滚动（长列表）
  - [ ] 图片懒加载
  - [ ] 代码分割
- [ ] 语音功能优化
  - [ ] 音频压缩
  - [ ] 预加载 TTS 音频
  - [ ] 减少 API 调用延迟

**交付物**:
- ✅ 页面加载速度 < 2 秒
- ✅ 语音响应延迟 < 3 秒

---

### 4.2 用户体验优化 `[2 天]`

**任务清单**:
- [ ] 加载状态提示
  - [ ] Skeleton 加载占位
  - [ ] 进度条
  - [ ] Toast 通知
- [ ] 错误提示优化
  - [ ] 友好的错误消息
  - [ ] 重试按钮
  - [ ] 错误边界（Error Boundary）
- [ ] 动画和过渡
  - [ ] 平滑的页面切换
  - [ ] 微交互动画

**交付物**:
- ✅ 流畅的用户体验
- ✅ 友好的错误处理

---

### 4.3 功能测试 `[3 天]`

**任务清单**:
- [ ] 单元测试
  - [ ] 工具函数测试
  - [ ] Hook 测试
  - [ ] RPC 函数测试
- [ ] 集成测试
  - [ ] AI Chat API 测试
  - [ ] 语音 API 测试
  - [ ] 数据库操作测试
- [ ] E2E 测试（Playwright）
  - [ ] 登录流程
  - [ ] 专注模式
  - [ ] 语音对话
  - [ ] 杂念管理
- [ ] 手动测试
  - [ ] 所有功能验证
  - [ ] 边界情况测试
  - [ ] 多设备测试

**交付物**:
- ✅ 测试覆盖率 > 80%
- ✅ 所有测试通过

---

## Phase 5: 部署上线（第 8 周）

### 优先级: P0（必须完成）

### 5.1 生产环境配置 `[1 天]`

**任务清单**:
- [ ] Vercel 项目设置
  - [ ] 连接 GitHub 仓库
  - [ ] 配置环境变量
  - [ ] 设置自动部署
- [ ] Supabase 生产环境
  - [ ] 检查 RLS 策略
  - [ ] 备份数据库
  - [ ] 设置 API 限流
- [ ] 域名配置
  - [ ] 绑定自定义域名
  - [ ] SSL 证书

**交付物**:
- ✅ 生产环境就绪

---

### 5.2 监控和日志 `[2 天]`

**任务清单**:
- [ ] 集成 Vercel Analytics
  - [ ] 页面访问统计
  - [ ] 用户行为分析
- [ ] 错误监控（Sentry）
  - [ ] 前端错误捕获
  - [ ] API 错误捕获
- [ ] 性能监控
  - [ ] 页面加载时间
  - [ ] API 响应时间
  - [ ] 语音处理时间
- [ ] 成本监控
  - [ ] AI API 使用量
  - [ ] 语音 API 使用量

**交付物**:
- ✅ 完整的监控系统

---

### 5.3 文档和培训 `[1 天]`

**任务清单**:
- [ ] 用户文档
  - [ ] 快速上手指南
  - [ ] 功能说明
  - [ ] FAQ
- [ ] 开发文档
  - [ ] API 文档
  - [ ] 组件文档
  - [ ] 部署指南

**交付物**:
- ✅ 完整的文档

---

### 5.4 灰度发布 `[1 天]`

**任务清单**:
- [ ] Beta 测试
  - [ ] 邀请 20-50 名用户
  - [ ] 收集反馈
  - [ ] 修复关键问题
- [ ] 逐步放开
  - [ ] 第一批：10% 用户
  - [ ] 第二批：50% 用户
  - [ ] 第三批：100% 用户

**交付物**:
- ✅ 稳定的生产版本

---

## Phase 6: 持续优化（第 9-10 周及之后）

### 优先级: P2（可选）

### 6.1 高级功能 `[持续]`

**任务清单**:
- [ ] 多人协作（可选）
  - [ ] 分享杂念箱
  - [ ] 团队统计
- [ ] 更多 AI 能力
  - [ ] 任务优先级推荐
  - [ ] 专注建议
  - [ ] 每日总结
- [ ] 更多语音功能
  - [ ] 语音命令（快捷操作）
  - [ ] 多语言支持
  - [ ] 声音定制

---

### 6.2 数据分析 `[持续]`

**任务清单**:
- [ ] 用户行为分析
  - [ ] 最常用功能
  - [ ] 用户留存率
  - [ ] 活跃用户统计
- [ ] AI 质量分析
  - [ ] 工具调用准确率
  - [ ] 用户满意度
  - [ ] 语音识别准确率

---

## 里程碑时间表

| 里程碑 | 完成时间 | 关键交付物 |
|--------|----------|------------|
| **M1: 数据层完成** | 第 2 周末 | Supabase 集成，认证系统 |
| **M2: AI 对话完成** | 第 4 周末 | AI Chat 可用，工具调用生效 |
| **M3: 语音对话完成** | 第 6 周末 | 语音输入输出，端到端可用 |
| **M4: 测试完成** | 第 7 周末 | 所有测试通过，性能达标 |
| **M5: 上线** | 第 8 周末 | 生产环境部署，灰度发布 |

---

## 风险管理

### 高风险项

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| **API 成本超预算** | 高 | 实施降级方案，设置用量限制 |
| **语音识别准确度不足** | 中 | 使用 Whisper，添加文字输入备选 |
| **Supabase RLS 权限问题** | 高 | 详细测试，编写单元测试 |
| **向量搜索性能差** | 中 | 优化索引，限制搜索范围 |
| **用户隐私担忧** | 中 | 明确隐私政策，提供数据导出 |

### 中风险项

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| **浏览器兼容性** | 中 | Polyfill，降级方案 |
| **网络延迟** | 中 | 优化 API 调用，添加缓存 |
| **AI 响应质量** | 中 | 优化提示词，持续测试 |

---

## 资源需求

### 人力资源
- **全栈工程师**: 1 人（你）
- **测试工程师**: 0.5 人（可选）
- **UI/UX 设计师**: 0.5 人（可选）

### 第三方服务成本（月度估算）

| 服务 | 用途 | 成本 |
|------|------|------|
| **Supabase Pro** | 数据库 + 认证 + Realtime | $25 |
| **Anthropic API** | AI 对话 | $2,250（1000 用户 × 10 次/天） |
| **OpenAI Whisper** | 语音识别 | $110（1000 用户 × 10 次/天 × 10 秒） |
| **OpenAI TTS** | 语音合成 | $750（1000 用户 × 10 次/天 × 50 字） |
| **Vercel Pro** | 部署托管 | $20 |
| **总计** | - | **~$3,155/月** |

**成本优化方案**:
- 每日对话次数限制（如 20 次）
- 使用浏览器 API 降级方案
- 缓存常见回复
- 第一阶段可以只支持少量用户

---

## 下一步行动

### 立即开始（本周）
1. [ ] 执行 Supabase 数据库迁移 SQL
2. [ ] 更新 TypeScript 类型定义
3. [ ] 安装 AI 和语音相关依赖

### 下周开始
1. [ ] 实现 Supabase 客户端封装
2. [ ] 集成认证系统
3. [ ] 创建数据迁移工具

---

**文档版本**: 1.0
**创建日期**: 2025-01-10
**最后更新**: 2025-01-10
