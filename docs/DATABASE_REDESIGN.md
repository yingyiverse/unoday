# UnoDay 数据库架构评估与优化

## 1. 现有架构评估

### 1.1 当前 thoughts 表分析

**现有结构**:
```sql
CREATE TABLE thoughts (
  id                bigint PRIMARY KEY AUTO INCREMENT,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content           text NOT NULL,
  embedding         vector NULL,
  status            text NULL CHECK (status IN ('inbox', 'focused', 'done', 'abandoned', 'paused')),
  focus_logs        jsonb NULL DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NULL DEFAULT NOW(),
  last_mentioned_at timestamptz NULL DEFAULT NOW()
);
```

**优点** ✅:
1. **向量嵌入已规划**: `embedding` 字段支持 AI 语义搜索
2. **灵活的状态管理**: 5 种状态涵盖任务全生命周期
3. **时间日志结构化**: `focus_logs` 使用 JSONB 存储专注历史
4. **时间戳完善**: 创建、更新、最后提及时间都有记录
5. **用户隔离**: 外键关联 + RLS 保证数据安全

**需要优化的地方** ⚠️:
1. **字段命名模糊**: `thoughts` 表同时存储"任务"和"杂念"，语义不清晰
2. **缺少 AI 相关字段**: 没有标记是否由 AI 创建、AI 创建时的对话 ID 等
3. **缺少标签/分类**: 无法对杂念进行分类管理
4. **缺少优先级**: 用户可能想标记某些杂念的重要性
5. **向量维度未指定**: `vector` 类型需要指定维度（如 `vector(768)`）

### 1.2 RPC 函数评估

**现有函数**:
- ✅ `switch_focus(p_user_id, p_target_id)` - 原子切换任务
- ✅ `pause_task(p_user_id, p_task_id)` - 暂停任务
- ✅ `match_thoughts(p_user_id, query_embedding, match_threshold, match_count)` - 语义搜索

**需要新增的函数**:
- `create_thought_with_embedding()` - 创建带向量的想法（AI 调用）
- `get_user_context()` - 获取用户当前状态（用于 AI 上下文）
- `get_today_stats()` - 获取今日统计
- `calculate_streak()` - 计算连续天数

---

## 2. AI 集成新增需求

### 2.1 AI 对话管理

需要存储：
- 对话会话（conversations）
- 对话消息（messages）
- AI 工具调用记录（tool_calls）

### 2.2 用户偏好设置

需要存储：
- AI 助手偏好（风格、语气）
- 通知设置
- 隐私设置

### 2.3 向量搜索优化

需要：
- 明确向量维度
- 创建向量索引
- 优化搜索性能

---

## 3. 优化后的数据库架构

### 3.1 核心表结构

#### 3.1.1 thoughts 表（优化版）

```sql
-- ============================================================
-- thoughts 表: 用户的所有想法、任务和杂念
-- ============================================================
CREATE TABLE thoughts (
  -- 基础字段
  id                bigserial PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content           text NOT NULL,

  -- AI 相关
  embedding         vector(768) NULL,  -- OpenAI text-embedding-3-small
  created_by_ai     boolean DEFAULT false,  -- 是否由 AI 创建
  conversation_id   bigint NULL REFERENCES conversations(id) ON DELETE SET NULL,  -- 来源对话

  -- 分类和优先级
  type              text NOT NULL DEFAULT 'distraction'
                    CHECK (type IN ('task', 'distraction', 'note')),
  priority          integer DEFAULT 0 CHECK (priority BETWEEN 0 AND 5),  -- 0=无,5=最高
  tags              text[] DEFAULT '{}',  -- 标签数组

  -- 状态管理
  status            text NOT NULL DEFAULT 'inbox'
                    CHECK (status IN ('inbox', 'focused', 'done', 'abandoned', 'paused')),
  focus_logs        jsonb DEFAULT '[]'::jsonb,  -- [{start, end}]

  -- 时间戳
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW(),
  completed_at      timestamptz NULL,  -- 完成时间
  last_mentioned_at timestamptz DEFAULT NOW()  -- 最后提及时间（AI 或用户）
);

-- 索引
CREATE INDEX idx_thoughts_user_id ON thoughts(user_id);
CREATE INDEX idx_thoughts_status ON thoughts(user_id, status);
CREATE INDEX idx_thoughts_type ON thoughts(user_id, type);
CREATE INDEX idx_thoughts_created_at ON thoughts(created_at DESC);
CREATE INDEX idx_thoughts_tags ON thoughts USING GIN(tags);

-- 向量索引（IVFFlat 算法，适合中等规模数据）
CREATE INDEX idx_thoughts_embedding ON thoughts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 触发器：自动更新 updated_at
CREATE TRIGGER update_thoughts_updated_at
  BEFORE UPDATE ON thoughts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**关键改进**:
1. ✅ 明确向量维度 `vector(768)`
2. ✅ 新增 `created_by_ai` 标记 AI 创建的内容
3. ✅ 新增 `conversation_id` 关联对话上下文
4. ✅ 新增 `type` 字段区分任务/杂念/笔记
5. ✅ 新增 `priority` 优先级
6. ✅ 新增 `tags` 标签数组
7. ✅ 新增 `completed_at` 明确完成时间
8. ✅ 优化索引策略

#### 3.1.2 conversations 表（新增）

```sql
-- ============================================================
-- conversations 表: AI 对话会话
-- ============================================================
CREATE TABLE conversations (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title           text NULL,  -- 对话标题（可自动生成或用户编辑）

  -- 上下文快照（对话开始时的用户状态）
  context_snapshot jsonb DEFAULT '{}'::jsonb,  -- {isFocused, currentTask, todayCount, streak}

  -- 统计信息
  message_count   integer DEFAULT 0,
  tool_call_count integer DEFAULT 0,

  -- 时间戳
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  last_message_at timestamptz DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(user_id, updated_at DESC);

-- 触发器
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 3.1.3 messages 表（新增）

```sql
-- ============================================================
-- messages 表: 对话消息（用户和 AI）
-- ============================================================
CREATE TABLE messages (
  id              bigserial PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- 消息内容
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text NOT NULL,

  -- AI 工具调用（如果有）
  tool_calls      jsonb NULL,  -- [{toolName, args, result}]

  -- 元数据
  model           text NULL,  -- 使用的 AI 模型（如 "claude-3-5-sonnet"）
  tokens_input    integer NULL,
  tokens_output   integer NULL,

  -- 时间戳
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

#### 3.1.4 user_preferences 表（新增）

```sql
-- ============================================================
-- user_preferences 表: 用户偏好设置
-- ============================================================
CREATE TABLE user_preferences (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- AI 助手设置
  ai_enabled      boolean DEFAULT true,
  ai_personality  text DEFAULT 'balanced'
                  CHECK (ai_personality IN ('concise', 'balanced', 'detailed')),
  ai_language     text DEFAULT 'auto' CHECK (ai_language IN ('auto', 'zh', 'en')),

  -- 通知设置
  notifications_enabled boolean DEFAULT true,
  daily_reminder_time   time NULL,  -- 每日提醒时间（如 09:00）

  -- 隐私设置
  allow_ai_learning     boolean DEFAULT false,  -- 是否允许 AI 从对话中学习
  share_anonymous_data  boolean DEFAULT false,

  -- 其他偏好
  daily_uno_limit       integer DEFAULT 10 CHECK (daily_uno_limit BETWEEN 1 AND 50),
  theme                 text DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),

  -- 时间戳
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

-- 触发器
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 数据关系图

```
┌──────────────┐
│  auth.users  │
│   (Supabase) │
└──────┬───────┘
       │ 1
       │
       ├─────────────────────────────────────────────────────┐
       │                                                     │
       │ N                                                   │ 1
┌──────▼──────────┐                                  ┌──────▼──────────────┐
│    thoughts     │                                  │ user_preferences    │
│─────────────────│                                  │─────────────────────│
│ id (PK)         │                                  │ user_id (PK, FK)    │
│ user_id (FK)    │◄─────┐                           │ ai_enabled          │
│ content         │       │                          │ ai_personality      │
│ embedding       │       │                          │ daily_uno_limit     │
│ created_by_ai   │       │                          └─────────────────────┘
│ conversation_id │       │ N
│ type            │       │
│ priority        │       │
│ tags[]          │       │
│ status          │       │
│ focus_logs      │       │
└─────────────────┘       │
                          │
                          │
       ┌──────────────────┴──────┐
       │                         │
       │ 1                       │ N
┌──────▼──────────┐      ┌──────▼──────────┐
│  conversations  │      │    messages     │
│─────────────────│      │─────────────────│
│ id (PK)         │      │ id (PK)         │
│ user_id (FK)    │      │ conversation_id │
│ title           │      │ role            │
│ context_snapshot│      │ content         │
│ message_count   │      │ tool_calls      │
│ tool_call_count │      │ model           │
└─────────────────┘      │ tokens_input    │
                         │ tokens_output   │
                         └─────────────────┘
```

---

## 4. 新增 RPC 函数

### 4.1 create_thought_with_embedding

```sql
-- ============================================================
-- 创建带向量嵌入的想法（AI 调用）
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
```

### 4.2 get_user_context

```sql
-- ============================================================
-- 获取用户当前状态（用于 AI 上下文）
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
  -- 获取当前专注任务
  SELECT row_to_json(t.*) INTO v_current_task
  FROM thoughts t
  WHERE t.user_id = p_user_id AND t.status = 'focused'
  LIMIT 1;

  v_is_focused := (v_current_task IS NOT NULL);

  -- 获取今日完成数量
  SELECT COUNT(*) INTO v_today_count
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'done'
    AND DATE(completed_at) = CURRENT_DATE;

  -- 获取杂念数量
  SELECT COUNT(*) INTO v_distraction_count
  FROM thoughts
  WHERE user_id = p_user_id
    AND type = 'distraction'
    AND status = 'inbox';

  -- 计算连续天数（简化版，实际需要更复杂的逻辑）
  SELECT COUNT(DISTINCT DATE(completed_at)) INTO v_streak
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'done'
    AND completed_at >= CURRENT_DATE - INTERVAL '30 days';

  -- 返回 JSON 对象
  RETURN json_build_object(
    'isFocused', v_is_focused,
    'currentTask', v_current_task,
    'todayCount', v_today_count,
    'distractionCount', v_distraction_count,
    'streak', v_streak
  );
END;
$$;
```

### 4.3 get_today_stats

```sql
-- ============================================================
-- 获取今日统计
-- ============================================================
CREATE OR REPLACE FUNCTION get_today_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_completed integer;
  v_abandoned integer;
  v_total_focus_time integer;  -- 秒
BEGIN
  -- 完成数量
  SELECT COUNT(*) INTO v_completed
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'done'
    AND DATE(completed_at) = CURRENT_DATE;

  -- 放弃数量
  SELECT COUNT(*) INTO v_abandoned
  FROM thoughts
  WHERE user_id = p_user_id
    AND status = 'abandoned'
    AND DATE(updated_at) = CURRENT_DATE;

  -- 总专注时长（遍历 focus_logs）
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

### 4.4 优化后的 match_thoughts

```sql
-- ============================================================
-- 语义搜索（优化版）
-- ============================================================
CREATE OR REPLACE FUNCTION match_thoughts(
  p_user_id uuid,
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_type text DEFAULT NULL,  -- 可选：过滤类型
  p_status text[] DEFAULT NULL  -- 可选：过滤状态
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result_json json;
BEGIN
  WITH matches AS (
    SELECT
      id,
      content,
      type,
      status,
      priority,
      tags,
      created_at,
      1 - (embedding <=> query_embedding) AS similarity
    FROM thoughts
    WHERE user_id = p_user_id
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> query_embedding) > match_threshold
      -- 可选过滤
      AND (p_type IS NULL OR type = p_type)
      AND (p_status IS NULL OR status = ANY(p_status))
    ORDER BY embedding <=> query_embedding
    LIMIT match_count
  )
  SELECT json_build_object(
    'success', true,
    'message', CASE WHEN count(*) > 0 THEN 'Found matches' ELSE 'No matches found' END,
    'count', count(*),
    'data', COALESCE(json_agg(row_to_json(matches) ORDER BY similarity DESC), '[]'::json)
  ) INTO result_json
  FROM matches;

  RETURN result_json;
END;
$$;
```

---

## 5. Row Level Security (RLS) 策略

### 5.1 thoughts 表 RLS

```sql
-- 启用 RLS
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的想法
CREATE POLICY "Users can view their own thoughts"
  ON thoughts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own thoughts"
  ON thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thoughts"
  ON thoughts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thoughts"
  ON thoughts FOR DELETE
  USING (auth.uid() = user_id);
```

### 5.2 conversations 和 messages 表 RLS

```sql
-- conversations 表
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- messages 表（通过 conversations 关联）
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- messages 通常不允许更新和删除（保持对话完整性）
```

### 5.3 user_preferences 表 RLS

```sql
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 自动创建用户偏好（通过触发器）
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();
```

---

## 6. 数据迁移策略

### 6.1 从旧 thoughts 表迁移

如果已有数据，执行以下步骤：

```sql
-- 1. 备份现有数据
CREATE TABLE thoughts_backup AS SELECT * FROM thoughts;

-- 2. 添加新字段（使用 ALTER TABLE）
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS created_by_ai boolean DEFAULT false;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS conversation_id bigint REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS type text DEFAULT 'distraction' CHECK (type IN ('task', 'distraction', 'note'));
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0 CHECK (priority BETWEEN 0 AND 5);
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 3. 数据清洗和迁移
UPDATE thoughts
SET type = CASE
  WHEN status IN ('focused', 'done', 'abandoned', 'paused') THEN 'task'
  ELSE 'distraction'
END;

UPDATE thoughts
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;

-- 4. 更改 embedding 类型（如果需要）
ALTER TABLE thoughts ALTER COLUMN embedding TYPE vector(768);

-- 5. 创建新索引
CREATE INDEX IF NOT EXISTS idx_thoughts_type ON thoughts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_thoughts_tags ON thoughts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_thoughts_embedding ON thoughts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 6.2 从 localStorage 迁移

前端实现数据导入功能：

```typescript
// lib/migrations/importFromLocalStorage.ts
import { supabase } from '@/lib/supabase'

export async function importFromLocalStorage(userId: string) {
  // 1. 读取 localStorage 数据
  const currentTask = localStorage.getItem('unoday_current_task')
  const distractions = JSON.parse(localStorage.getItem('unoday_distractions') || '[]')
  const history = JSON.parse(localStorage.getItem('unoday_history') || '[]')

  // 2. 导入当前任务
  if (currentTask) {
    const startTime = parseInt(localStorage.getItem('unoday_start_time') || '0')

    await supabase.from('thoughts').insert({
      user_id: userId,
      content: currentTask,
      type: 'task',
      status: 'focused',
      focus_logs: [{ start: new Date(startTime).toISOString(), end: null }],
    })
  }

  // 3. 导入杂念
  for (const distraction of distractions) {
    await supabase.from('thoughts').insert({
      user_id: userId,
      content: distraction.text,
      type: 'distraction',
      status: 'inbox',
      created_at: new Date(distraction.timestamp).toISOString(),
    })
  }

  // 4. 导入历史记录
  for (const item of history) {
    await supabase.from('thoughts').insert({
      user_id: userId,
      content: item.task,
      type: 'task',
      status: item.status === 'complete' ? 'done' : 'abandoned',
      completed_at: new Date(item.endTime).toISOString(),
      focus_logs: [
        {
          start: new Date(item.endTime - item.duration).toISOString(),
          end: new Date(item.endTime).toISOString(),
        },
      ],
    })
  }

  // 5. 清空 localStorage
  localStorage.removeItem('unoday_current_task')
  localStorage.removeItem('unoday_distractions')
  localStorage.removeItem('unoday_history')
  localStorage.removeItem('unoday_start_time')
}
```

---

## 7. 性能优化建议

### 7.1 向量搜索优化

```sql
-- 1. 选择合适的索引算法
-- IVFFlat: 适合中等规模（< 100万行），速度快
-- HNSW: 适合大规模（> 100万行），精度高

-- 中等规模（推荐）
CREATE INDEX idx_thoughts_embedding ON thoughts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 大规模（如果数据增长到百万级）
CREATE INDEX idx_thoughts_embedding_hnsw ON thoughts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### 7.2 查询优化

```sql
-- 为常见查询创建复合索引
CREATE INDEX idx_thoughts_user_status_type ON thoughts(user_id, status, type);
CREATE INDEX idx_thoughts_user_created ON thoughts(user_id, created_at DESC);

-- 为 focus_logs 创建 GIN 索引（如果需要查询日志内容）
CREATE INDEX idx_thoughts_focus_logs ON thoughts USING GIN(focus_logs);
```

### 7.3 分区表（如果数据量大）

```sql
-- 按时间分区（每月一个分区）
CREATE TABLE thoughts_partitioned (
  LIKE thoughts INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE thoughts_2025_01 PARTITION OF thoughts_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE thoughts_2025_02 PARTITION OF thoughts_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- ... 后续月份
```

---

## 8. 与旧架构对比

| 方面 | 旧架构 | 新架构 | 改进 |
|------|--------|--------|------|
| **数据模型** | 单一 thoughts 表 | 4 表（thoughts, conversations, messages, user_preferences） | ✅ 职责分离，易扩展 |
| **向量维度** | 未指定 | vector(768) | ✅ 明确规格，优化存储 |
| **AI 集成** | 无 AI 相关字段 | created_by_ai, conversation_id | ✅ 支持 AI 溯源 |
| **分类管理** | 无分类 | type, tags, priority | ✅ 灵活分类和优先级 |
| **对话历史** | 无 | conversations + messages | ✅ 完整的对话记录 |
| **用户偏好** | 无 | user_preferences | ✅ 个性化设置 |
| **索引策略** | 基础索引 | 复合索引 + 向量索引 | ✅ 查询性能提升 |
| **RPC 函数** | 3 个 | 7 个 | ✅ 更多业务逻辑封装 |

---

## 9. 完整迁移 SQL 脚本

```sql
-- ============================================================
-- UnoDay 数据库完整迁移脚本
-- ============================================================

-- 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 创建或修改 thoughts 表
-- (如果表不存在则创建，如果存在则添加新字段)

-- 3. 创建新表
-- conversations 表
CREATE TABLE IF NOT EXISTS conversations (
  -- [完整定义见 3.1.2 节]
);

-- messages 表
CREATE TABLE IF NOT EXISTS messages (
  -- [完整定义见 3.1.3 节]
);

-- user_preferences 表
CREATE TABLE IF NOT EXISTS user_preferences (
  -- [完整定义见 3.1.4 节]
);

-- 4. 创建所有索引
-- [见 3.1.1 和 7.2 节]

-- 5. 创建所有 RPC 函数
-- [见第 4 节]

-- 6. 设置 RLS 策略
-- [见第 5 节]

-- 7. 创建触发器
-- [见 5.3 节]
```

---

## 10. 后续优化方向

1. **全文搜索**: 结合 PostgreSQL 的 `tsvector` 实现全文搜索（补充向量搜索）
2. **缓存层**: 使用 Redis 缓存热点数据（当前任务、用户上下文）
3. **数据分析**: 创建物化视图（materialized views）加速统计查询
4. **归档策略**: 自动归档 6 个月前的已完成任务
5. **备份策略**: 每日自动备份，保留 30 天

---

## 下一步

1. ✅ 完成数据库架构评估与优化
2. ⏭️ 创建 AI 集成实施指南
3. ⏭️ 创建实施路线图
4. ⏭️ 更新 TypeScript 类型定义

---

**文档版本**: 1.0
**创建日期**: 2025-01-10
**最后更新**: 2025-01-10
