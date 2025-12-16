# UnoDay AI 集成实施指南

本文档提供详细的、可执行的步骤指导，帮助开发团队将 Vercel AI SDK 集成到 UnoDay Next.js 项目中。

---

## 目录

1. [环境准备](#1-环境准备)
2. [数据库迁移](#2-数据库迁移)
3. [AI SDK 集成](#3-ai-sdk-集成)
4. [工具函数实现](#4-工具函数实现)
5. [前端组件开发](#5-前端组件开发)
6. [测试验证](#6-测试验证)
7. [部署上线](#7-部署上线)

---

## 1. 环境准备

### 1.1 安装依赖包

```bash
cd /Users/yingyi/Unoday/Next

# 安装 Vercel AI SDK 核心包
npm install ai

# 安装 Anthropic SDK
npm install @ai-sdk/anthropic

# 安装 OpenAI SDK（用于生成 embeddings）
npm install openai

# 安装 Zod（参数验证）
npm install zod

# 安装开发依赖
npm install -D @types/node
```

### 1.2 配置环境变量

编辑 `.env.local` 文件，添加 AI 服务的 API 密钥：

```bash
# Supabase (已有)
NEXT_PUBLIC_SUPABASE_URL=https://veazyrckuukdjlqicgff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic API Key（新增）
ANTHROPIC_API_KEY=sk-ant-xxxxx

# OpenAI API Key（新增，用于生成 embeddings）
OPENAI_API_KEY=sk-xxxxx
```

**获取 API 密钥**:
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys

### 1.3 配置 TypeScript

确保 `tsconfig.json` 包含以下配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## 2. 数据库迁移

### 2.1 应用数据库 Schema 更新

在 Supabase Dashboard 的 SQL Editor 中执行以下脚本：

```sql
-- ============================================================
-- 第 1 步: 修改 thoughts 表
-- ============================================================

-- 添加新字段
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS created_by_ai boolean DEFAULT false;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS conversation_id bigint;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS type text DEFAULT 'distraction' CHECK (type IN ('task', 'distraction', 'note'));
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0 CHECK (priority BETWEEN 0 AND 5);
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 修改 embedding 字段类型（指定维度）
ALTER TABLE thoughts ALTER COLUMN embedding TYPE vector(768);

-- 创建新索引
CREATE INDEX IF NOT EXISTS idx_thoughts_type ON thoughts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_thoughts_tags ON thoughts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_thoughts_user_status_type ON thoughts(user_id, status, type);

-- 创建向量索引（如果还没有）
DROP INDEX IF EXISTS idx_thoughts_embedding;
CREATE INDEX idx_thoughts_embedding ON thoughts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- 第 2 步: 创建 conversations 表
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NULL,
  context_snapshot jsonb DEFAULT '{}'::jsonb,
  message_count   integer DEFAULT 0,
  tool_call_count integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  last_message_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(user_id, updated_at DESC);

-- ============================================================
-- 第 3 步: 创建 messages 表
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id              bigserial PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text NOT NULL,
  tool_calls      jsonb NULL,
  model           text NULL,
  tokens_input    integer NULL,
  tokens_output   integer NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================================
-- 第 4 步: 创建 user_preferences 表
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_enabled      boolean DEFAULT true,
  ai_personality  text DEFAULT 'balanced' CHECK (ai_personality IN ('concise', 'balanced', 'detailed')),
  ai_language     text DEFAULT 'auto' CHECK (ai_language IN ('auto', 'zh', 'en')),
  notifications_enabled boolean DEFAULT true,
  daily_reminder_time   time NULL,
  allow_ai_learning     boolean DEFAULT false,
  share_anonymous_data  boolean DEFAULT false,
  daily_uno_limit       integer DEFAULT 10 CHECK (daily_uno_limit BETWEEN 1 AND 50),
  theme                 text DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

-- 自动为新用户创建偏好设置
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();

-- ============================================================
-- 第 5 步: 添加外键约束
-- ============================================================

ALTER TABLE thoughts ADD CONSTRAINT fk_thoughts_conversation
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

-- ============================================================
-- 第 6 步: 设置 RLS 策略
-- ============================================================

-- conversations 表 RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- messages 表 RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- user_preferences 表 RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2.2 创建新的 RPC 函数

继续在 SQL Editor 中执行：

```sql
-- ============================================================
-- create_thought_with_embedding
-- ============================================================

CREATE OR REPLACE FUNCTION create_thought_with_embedding(
  p_user_id uuid,
  p_content text,
  p_embedding vector(768),
  p_status text DEFAULT 'inbox',
  p_type text DEFAULT 'distraction',
  p_created_by_ai boolean DEFAULT false,
  p_conversation_id bigint DEFAULT NULL,
  p_tags text[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
BEGIN
  INSERT INTO thoughts (
    user_id, content, embedding, status, type,
    created_by_ai, conversation_id, tags
  )
  VALUES (
    p_user_id, p_content, p_embedding, p_status, p_type,
    p_created_by_ai, p_conversation_id, p_tags
  )
  RETURNING row_to_json(thoughts.*) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- get_user_context
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_context(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_task json;
  v_today_count integer;
  v_streak integer;
  v_distraction_count integer;
  v_is_focused boolean;
BEGIN
  SELECT row_to_json(t.*) INTO v_current_task
  FROM thoughts t
  WHERE t.user_id = p_user_id AND t.status = 'focused'
  LIMIT 1;

  v_is_focused := (v_current_task IS NOT NULL);

  SELECT COUNT(*) INTO v_today_count
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'done'
    AND DATE(completed_at) = CURRENT_DATE;

  SELECT COUNT(*) INTO v_distraction_count
  FROM thoughts
  WHERE user_id = p_user_id
    AND type = 'distraction'
    AND status = 'inbox';

  SELECT COUNT(DISTINCT DATE(completed_at)) INTO v_streak
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'done'
    AND completed_at >= CURRENT_DATE - INTERVAL '30 days';

  RETURN json_build_object(
    'isFocused', v_is_focused,
    'currentTask', v_current_task,
    'todayCount', v_today_count,
    'distractionCount', v_distraction_count,
    'streak', v_streak
  );
END;
$$;

-- ============================================================
-- get_today_stats
-- ============================================================

CREATE OR REPLACE FUNCTION get_today_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_completed integer;
  v_abandoned integer;
  v_total_focus_time integer;
BEGIN
  SELECT COUNT(*) INTO v_completed
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'done'
    AND DATE(completed_at) = CURRENT_DATE;

  SELECT COUNT(*) INTO v_abandoned
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'abandoned'
    AND DATE(updated_at) = CURRENT_DATE;

  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (
      COALESCE(
        (log->>'end')::timestamptz,
        NOW()
      ) - (log->>'start')::timestamptz
    ))
  ), 0)::integer INTO v_total_focus_time
  FROM thoughts,
       jsonb_array_elements(focus_logs) AS log
  WHERE user_id = p_user_id
    AND DATE((log->>'start')::timestamptz) = CURRENT_DATE;

  RETURN json_build_object(
    'completed', v_completed,
    'abandoned', v_abandoned,
    'totalFocusTime', v_total_focus_time,
    'date', CURRENT_DATE
  );
END;
$$;
```

### 2.3 验证数据库迁移

在 SQL Editor 中执行测试查询：

```sql
-- 验证表结构
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'thoughts'
ORDER BY ordinal_position;

-- 验证 RPC 函数
SELECT routine_name
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_schema = 'public'
  AND routine_name LIKE '%thought%';
```

---

## 3. AI SDK 集成

### 3.1 创建 Embeddings 工具类

创建 `lib/embeddings.ts`:

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const EMBEDDING_MODEL = 'text-embedding-3-small' // 768 维度
const EMBEDDING_CACHE = new Map<string, number[]>()

/**
 * 生成文本的向量嵌入
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 检查缓存
  if (EMBEDDING_CACHE.has(text)) {
    return EMBEDDING_CACHE.get(text)!
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    })

    const embedding = response.data[0].embedding

    // 缓存结果（限制缓存大小）
    if (EMBEDDING_CACHE.size > 1000) {
      const firstKey = EMBEDDING_CACHE.keys().next().value
      EMBEDDING_CACHE.delete(firstKey)
    }
    EMBEDDING_CACHE.set(text, embedding)

    return embedding
  } catch (error) {
    console.error('生成 embedding 失败:', error)
    throw new Error('Failed to generate embedding')
  }
}

/**
 * 批量生成向量嵌入
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.trim()),
    })

    return response.data.map((item) => item.embedding)
  } catch (error) {
    console.error('批量生成 embedding 失败:', error)
    throw new Error('Failed to generate embeddings')
  }
}
```

### 3.2 创建 AI 工具函数

创建 `app/api/chat/tools.ts`:

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { generateEmbedding } from '@/lib/embeddings'

/**
 * 获取 Supabase 客户端（带用户认证）
 */
async function getAuthenticatedClient() {
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return { supabase, userId: user.id }
}

/**
 * 工具: 创建杂念
 */
export const createDistractionTool = tool({
  description: '创建一个新的杂念记录，当用户提到想到了其他事情时使用',
  parameters: z.object({
    content: z.string().describe('杂念内容'),
    priority: z.number().optional().describe('优先级 0-5，默认为 0'),
  }),
  execute: async ({ content, priority = 0 }) => {
    try {
      const { supabase, userId } = await getAuthenticatedClient()

      // 生成向量嵌入
      const embedding = await generateEmbedding(content)

      // 调用 RPC
      const { data, error } = await supabase.rpc('create_thought_with_embedding', {
        p_user_id: userId,
        p_content: content,
        p_embedding: embedding,
        p_status: 'inbox',
        p_type: 'distraction',
        p_created_by_ai: true,
        p_conversation_id: null, // TODO: 传入当前对话 ID
        p_tags: [],
      })

      if (error) throw error

      return {
        success: true,
        id: data.id,
        message: `已将"${content}"添加到杂念箱`,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '创建杂念失败，请重试',
      }
    }
  },
})

/**
 * 工具: 开始专注
 */
export const startFocusTool = tool({
  description: '开始专注一个新任务',
  parameters: z.object({
    task: z.string().describe('要专注的任务内容'),
  }),
  execute: async ({ task }) => {
    try {
      const { supabase, userId } = await getAuthenticatedClient()

      // 生成向量嵌入
      const embedding = await generateEmbedding(task)

      // 1. 创建新任务
      const { data: newTask, error: createError } = await supabase.rpc(
        'create_thought_with_embedding',
        {
          p_user_id: userId,
          p_content: task,
          p_embedding: embedding,
          p_status: 'inbox',
          p_type: 'task',
          p_created_by_ai: true,
        }
      )

      if (createError) throw createError

      // 2. 切换到这个任务
      const { data, error } = await supabase.rpc('switch_focus', {
        p_user_id: userId,
        p_target_id: newTask.id,
      })

      if (error) throw error

      return {
        success: true,
        action: 'UI_OPERATION',
        operation: 'startFocus',
        task: data,
        message: `已开始专注于"${task}"`,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '开始专注失败',
      }
    }
  },
})

/**
 * 工具: 完成任务
 */
export const completeTaskTool = tool({
  description: '标记当前任务为已完成',
  parameters: z.object({}),
  execute: async () => {
    try {
      const { supabase, userId } = await getAuthenticatedClient()

      // 获取当前专注任务
      const { data: currentTask, error: fetchError } = await supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'focused')
        .single()

      if (fetchError || !currentTask) {
        return {
          success: false,
          error: '当前没有正在专注的任务',
        }
      }

      // 更新状态为 done
      const { error: updateError } = await supabase
        .from('thoughts')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          focus_logs: [
            ...currentTask.focus_logs.map((log: any) => ({
              ...log,
              end: log.end || new Date().toISOString(),
            })),
          ],
        })
        .eq('id', currentTask.id)

      if (updateError) throw updateError

      return {
        success: true,
        action: 'UI_OPERATION',
        operation: 'completeTask',
        message: `已完成任务"${currentTask.content}"！`,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '完成任务失败',
      }
    }
  },
})

/**
 * 工具: 打开杂念箱
 */
export const openDistractionDrawerTool = tool({
  description: '打开杂念箱抽屉，让用户查看所有杂念',
  parameters: z.object({}),
  execute: async () => {
    return {
      success: true,
      action: 'UI_OPERATION',
      operation: 'openDrawer',
      message: '正在打开杂念箱...',
    }
  },
})

/**
 * 工具: 搜索相关任务
 */
export const searchThoughtsTool = tool({
  description: '使用语义搜索查找相关的历史任务和杂念',
  parameters: z.object({
    query: z.string().describe('搜索关键词或描述'),
    limit: z.number().optional().describe('返回结果数量，默认5'),
  }),
  execute: async ({ query, limit = 5 }) => {
    try {
      const { supabase, userId } = await getAuthenticatedClient()

      // 生成查询向量
      const queryEmbedding = await generateEmbedding(query)

      // 调用语义搜索 RPC
      const { data, error } = await supabase.rpc('match_thoughts', {
        p_user_id: userId,
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
      })

      if (error) throw error

      return {
        success: true,
        count: data.count,
        results: data.data,
        message: data.message,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '搜索失败',
      }
    }
  },
})

/**
 * 工具: 获取当前状态
 */
export const getCurrentStateTool = tool({
  description: '获取用户当前的状态（是否在专注、今日完成数等）',
  parameters: z.object({}),
  execute: async () => {
    try {
      const { supabase, userId } = await getAuthenticatedClient()

      const { data, error } = await supabase.rpc('get_user_context', {
        p_user_id: userId,
      })

      if (error) throw error

      return {
        success: true,
        context: data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  },
})
```

### 3.3 创建 AI Chat API 路由

创建 `app/api/chat/route.ts`:

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import {
  createDistractionTool,
  startFocusTool,
  completeTaskTool,
  openDistractionDrawerTool,
  searchThoughtsTool,
  getCurrentStateTool,
} from './tools'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    // 1. 验证用户身份
    const supabase = createServerComponentClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 2. 解析请求
    const { messages } = await req.json()

    // 3. 获取用户上下文
    const { data: userContext } = await supabase.rpc('get_user_context', {
      p_user_id: user.id,
    })

    // 4. 构建系统提示
    const systemPrompt = `你是 UnoDay 的 AI 助手，帮助用户专注于当前最重要的一件事。

当前时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

用户当前状态：
- 专注模式: ${userContext?.isFocused ? '开启' : '关闭'}
${userContext?.currentTask ? `- 当前任务: "${userContext.currentTask.content}"` : ''}
- 今日完成: ${userContext?.todayCount || 0}/10
- 连续天数: ${userContext?.streak || 0} 天
- 杂念数量: ${userContext?.distractionCount || 0} 个

你的能力：
1. 帮助用户创建杂念记录（当他们想到其他事情时）
2. 控制专注模式（开始、完成）
3. 搜索历史任务
4. 提供专注建议

请用简洁、友好的语气回复，使用中文。当用户表达想到其他事情时，主动调用工具帮他们记录。`

    // 5. 调用 AI 模型
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: systemPrompt,
      messages,
      tools: {
        createDistraction: createDistractionTool,
        startFocus: startFocusTool,
        completeTask: completeTaskTool,
        openDistractionDrawer: openDistractionDrawerTool,
        searchThoughts: searchThoughtsTool,
        getCurrentState: getCurrentStateTool,
      },
      maxSteps: 5,
      temperature: 0.7,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('AI Chat API 错误:', error)
    return new Response(
      JSON.stringify({
        error: '抱歉，AI 服务暂时不可用，请稍后重试',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
```

---

## 4. 工具函数实现

### 4.1 更新 TypeScript 类型

创建/更新 `lib/database.types.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      thoughts: {
        Row: {
          id: number
          user_id: string
          content: string
          embedding: number[] | null
          created_by_ai: boolean
          conversation_id: number | null
          type: 'task' | 'distraction' | 'note'
          priority: number
          tags: string[]
          status: 'inbox' | 'focused' | 'done' | 'abandoned' | 'paused'
          focus_logs: FocusLog[]
          created_at: string
          updated_at: string
          completed_at: string | null
          last_mentioned_at: string
        }
        Insert: Omit<Database['public']['Tables']['thoughts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['thoughts']['Insert']>
      }
      conversations: {
        Row: {
          id: number
          user_id: string
          title: string | null
          context_snapshot: Record<string, any>
          message_count: number
          tool_call_count: number
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
      }
      messages: {
        Row: {
          id: number
          conversation_id: number
          role: 'user' | 'assistant' | 'system'
          content: string
          tool_calls: ToolCall[] | null
          model: string | null
          tokens_input: number | null
          tokens_output: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      user_preferences: {
        Row: {
          user_id: string
          ai_enabled: boolean
          ai_personality: 'concise' | 'balanced' | 'detailed'
          ai_language: 'auto' | 'zh' | 'en'
          notifications_enabled: boolean
          daily_reminder_time: string | null
          allow_ai_learning: boolean
          share_anonymous_data: boolean
          daily_uno_limit: number
          theme: 'light' | 'dark' | 'auto'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>
      }
    }
    Functions: {
      switch_focus: {
        Args: { p_user_id: string; p_target_id: number }
        Returns: Database['public']['Tables']['thoughts']['Row']
      }
      pause_task: {
        Args: { p_user_id: string; p_task_id: number }
        Returns: Database['public']['Tables']['thoughts']['Row']
      }
      match_thoughts: {
        Args: {
          p_user_id: string
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          success: boolean
          message: string
          count: number
          data: Array<Database['public']['Tables']['thoughts']['Row'] & { similarity: number }>
        }
      }
      create_thought_with_embedding: {
        Args: {
          p_user_id: string
          p_content: string
          p_embedding: number[]
          p_status?: string
          p_type?: string
          p_created_by_ai?: boolean
          p_conversation_id?: number | null
          p_tags?: string[]
        }
        Returns: Database['public']['Tables']['thoughts']['Row']
      }
      get_user_context: {
        Args: { p_user_id: string }
        Returns: {
          isFocused: boolean
          currentTask: Database['public']['Tables']['thoughts']['Row'] | null
          todayCount: number
          distractionCount: number
          streak: number
        }
      }
      get_today_stats: {
        Args: { p_user_id: string }
        Returns: {
          completed: number
          abandoned: number
          totalFocusTime: number
          date: string
        }
      }
    }
  }
}

export interface FocusLog {
  start: string
  end: string | null
}

export interface ToolCall {
  toolName: string
  args: Record<string, any>
  result: Record<string, any>
}
```

---

## 5. 前端组件开发

### 5.1 创建 AI Chat 浮动按钮

创建 `components/AIChat/AIChatButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/language-context'

interface Props {
  onClick: () => void
}

export function AIChatButton({ onClick }: Props) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
      aria-label="Open AI Chat"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>

      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">
          {t('aiChatButtonHint')}
        </div>
      )}
    </button>
  )
}
```

### 5.2 创建 AI Chat 抽屉

创建 `components/AIChat/AIChatDrawer.tsx`:

```typescript
'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AIChatDrawer({ isOpen, onClose }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      // 检查是否有需要在客户端执行的 UI 操作
      const toolInvocations = message.toolInvocations || []

      for (const invocation of toolInvocations) {
        if (invocation.result?.action === 'UI_OPERATION') {
          executeUIOperation(invocation.result.operation)
        }
      }
    },
    onError: (error) => {
      console.error('AI Chat 错误:', error)
    },
  })

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const executeUIOperation = (operation: string) => {
    switch (operation) {
      case 'openDrawer':
        window.dispatchEvent(new CustomEvent('openDistractionDrawer'))
        break
      case 'startFocus':
        window.dispatchEvent(new CustomEvent('enterFocusMode'))
        break
      case 'completeTask':
        // 刷新任务列表
        window.dispatchEvent(new CustomEvent('refreshTasks'))
        break
      default:
        console.warn('未知的 UI 操作:', operation)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-900">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-800">
          <h2 className="text-xl font-semibold">AI 助手</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
              <svg
                className="mb-4 h-16 w-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="text-lg font-medium">开始对话</p>
              <p className="mt-2 text-sm">
                试试说"帮我记录一个杂念"或"我想专注学习"
              </p>
            </div>
          ) : (
            <>
              <ChatMessageList messages={messages} />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入框 */}
        <div className="border-t p-4 dark:border-gray-800">
          {error && (
            <div className="mb-2 rounded-lg bg-red-100 p-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
              发送失败，请重试
            </div>
          )}
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="输入消息..."
          />
        </div>
      </div>
    </>
  )
}
```

### 5.3 创建消息列表组件

创建 `components/AIChat/ChatMessageList.tsx`:

```typescript
'use client'

import { Message } from 'ai'
import { ChatMessage } from './ChatMessage'

interface Props {
  messages: Message[]
}

export function ChatMessageList({ messages }: Props) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  )
}
```

### 5.4 创建单条消息组件

创建 `components/AIChat/ChatMessage.tsx`:

```typescript
'use client'

import { Message } from 'ai'
import ReactMarkdown from 'react-markdown'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        }`}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* 显示工具调用 */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mt-2 space-y-1 text-xs opacity-70">
            {message.toolInvocations.map((invocation, i) => (
              <div key={i} className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  {invocation.toolName === 'createDistraction' && '创建杂念'}
                  {invocation.toolName === 'startFocus' && '开始专注'}
                  {invocation.toolName === 'completeTask' && '完成任务'}
                  {invocation.toolName === 'openDistractionDrawer' && '打开杂念箱'}
                  {invocation.toolName === 'searchThoughts' && '搜索任务'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 5.5 创建输入框组件

创建 `components/AIChat/ChatInput.tsx`:

```typescript
'use client'

import { FormEvent, KeyboardEvent } from 'react'

interface Props {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  disabled: boolean
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = '输入消息...',
}: Props) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSubmit(e as any)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <textarea
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-primary"
        style={{ minHeight: '48px', maxHeight: '120px' }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90 disabled:bg-gray-300 disabled:text-gray-500"
      >
        {disabled ? (
          <svg
            className="h-5 w-5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        )}
      </button>
    </form>
  )
}
```

### 5.6 集成到主页面

修改 `app/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import HeroSection from '@/components/HeroSection'
import OnlyNowSection from '@/components/OnlyNowSection'
import LetGoSection from '@/components/LetGoSection'
import WitnessProgressSection from '@/components/WitnessProgressSection'
import FocusMode from '@/components/FocusMode'
import { AIChatButton } from '@/components/AIChat/AIChatButton'
import { AIChatDrawer } from '@/components/AIChat/AIChatDrawer'

export default function Home() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <Header />
      <main>
        <HeroSection />
        <OnlyNowSection />
        <LetGoSection />
        <WitnessProgressSection />
      </main>
      <FocusMode />

      {/* AI Chat */}
      <AIChatButton onClick={() => setIsAIChatOpen(true)} />
      <AIChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  )
}
```

---

## 6. 测试验证

### 6.1 本地测试

```bash
# 启动开发服务器
npm run dev

# 在浏览器中访问 http://localhost:3000
```

**测试检查清单**:
- [ ] AI Chat 浮动按钮显示正常
- [ ] 点击按钮打开抽屉
- [ ] 发送消息到 AI
- [ ] AI 回复显示正常
- [ ] 工具调用（创建杂念）生效
- [ ] UI 操作（打开杂念箱）触发
- [ ] 错误处理正常

### 6.2 功能测试场景

| 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|
| **创建杂念** | 对 AI 说"我想到要买菜" | AI 调用工具，杂念出现在杂念箱 |
| **开始专注** | 对 AI 说"我要专注学习 React" | 进入专注模式，任务为"学习 React" |
| **完成任务** | 在专注模式中对 AI 说"完成了" | 任务标记为完成，退出专注模式 |
| **打开杂念箱** | 对 AI 说"打开杂念箱" | 杂念抽屉打开 |
| **搜索任务** | 对 AI 说"搜索关于学习的任务" | 返回相关历史任务列表 |

### 6.3 性能测试

```bash
# 安装性能测试工具
npm install -D @playwright/test

# 创建测试文件 tests/ai-chat.spec.ts
```

---

## 7. 部署上线

### 7.1 环境变量配置

在 Vercel Dashboard 中设置 Production 环境变量：
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 7.2 部署到 Vercel

```bash
# 提交代码
git add .
git commit -m "feat: integrate Vercel AI SDK and AI chat"
git push origin main

# 或手动部署
vercel --prod
```

### 7.3 上线后验证

- [ ] AI Chat 功能正常
- [ ] 数据库连接正常
- [ ] 向量搜索生效
- [ ] 工具调用正常
- [ ] 错误日志查看

---

## 8. 常见问题排查

### Q1: AI 不回复

**排查步骤**:
1. 检查 Anthropic API Key 是否正确
2. 查看浏览器 Network 面板，是否有 401/403 错误
3. 查看 Vercel Logs

### Q2: 工具调用失败

**排查步骤**:
1. 检查 Supabase RPC 函数是否存在
2. 检查用户认证状态
3. 查看 RLS 策略是否正确

### Q3: 向量搜索无结果

**排查步骤**:
1. 确认 pgvector 扩展已启用
2. 确认 embedding 字段有数据
3. 降低 match_threshold 阈值

---

**文档版本**: 1.0
**创建日期**: 2025-01-10
**最后更新**: 2025-01-10
