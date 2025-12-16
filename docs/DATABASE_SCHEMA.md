# Supabase 数据库结构文档

## 项目信息

- **Project URL**: https://veazyrckuukdjlqicgff.supabase.co
- **Project Ref**: veazyrckuukdjlqicgff

---

## 📊 数据表

### 1. thoughts 表

**用途**: 存储用户的所有想法、任务和杂念

**字段说明**:

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|---------|------|
| `id` | bigint | PRIMARY KEY, AUTO INCREMENT | - | 主键ID |
| `user_id` | uuid | NOT NULL, FOREIGN KEY → users(id) | - | 用户ID，级联删除 |
| `content` | text | NOT NULL | - | 想法/任务内容 |
| `embedding` | vector | NULL | - | AI 向量嵌入（用于语义搜索） |
| `status` | text | NULL, CHECK | 'inbox' | 状态：inbox/focused/done/abandoned/paused |
| `focus_logs` | jsonb | NULL | '[]' | 专注时间日志数组 |
| `created_at` | timestamptz | NOT NULL | NOW() | 创建时间（UTC） |
| `updated_at` | timestamptz | NULL | NOW() | 更新时间（UTC） |
| `last_mentioned_at` | timestamptz | NULL | NOW() | 最后提及时间 |

**状态枚举值**:
```typescript
type ThoughtStatus =
  | 'inbox'      // 收件箱（未处理）
  | 'focused'    // 正在专注中
  | 'done'       // 已完成
  | 'abandoned'  // 已放弃
  | 'paused'     // 已暂停
```

**focus_logs 数据结构**:
```typescript
type FocusLog = {
  start: string  // ISO 8601 时间字符串
  end: string | null  // 结束时间，null 表示正在进行中
}

// focus_logs 是 FocusLog[] 数组
```

**外键关系**:
- `user_id` → `users.id` (ON DELETE CASCADE)

**索引**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id`

---

## ⚙️ 触发器

### update_thoughts_updated_at

**触发时机**: BEFORE UPDATE on thoughts

**作用**: 自动更新 `updated_at` 字段为当前时间

**函数**: `update_updated_at_column()`

---

## 🔧 RPC 函数（存储过程）

### 1. switch_focus

**用途**: 原子性地切换专注任务（先关闭当前正在专注的任务，再开启新任务）

**参数**:
```sql
switch_focus(
  p_user_id uuid,      -- 用户ID
  p_target_id bigint   -- 要开始专注的任务ID
)
```

**返回值**: `json` - 新开始专注的任务完整数据

**逻辑**:

1. **善后阶段**: 关闭当前正在专注的任务
   - 查找 `status = 'focused'` 的任务
   - 将状态改为 `'inbox'`
   - 在 `focus_logs` 中找到 `end` 为 null 的记录，填入当前时间

2. **启程阶段**: 开启新的专注任务
   - 将目标任务状态改为 `'focused'`
   - 在 `focus_logs` 中追加新记录：`{start: NOW(), end: null}`

3. **返回**: 新任务的完整数据（JSON 格式）

**SQL 实现**:
```sql
CREATE OR REPLACE FUNCTION switch_focus(p_user_id uuid, p_target_id bigint)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_now text := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_result json;
BEGIN
  -- 步骤 1: 关闭当前正在专注的任务
  UPDATE thoughts
  SET
    status = 'inbox',
    focus_logs = (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'end') IS NULL THEN elem || jsonb_build_object('end', v_now)
          ELSE elem
        END
      )
      FROM jsonb_array_elements(focus_logs) elem
    )
  WHERE
    user_id = p_user_id
    AND status = 'focused';

  -- 步骤 2: 开启新的目标任务
  UPDATE thoughts
  SET
    status = 'focused',
    focus_logs = COALESCE(focus_logs, '[]'::jsonb) || jsonb_build_object('start', v_now, 'end', null)
  WHERE
    id = p_target_id
    AND user_id = p_user_id
  RETURNING row_to_json(thoughts.*) INTO v_result;

  -- 步骤 3: 返回新任务数据
  RETURN v_result;
END;
$$;
```

**使用示例**:
```typescript
const { data, error } = await supabase
  .rpc('switch_focus', {
    p_user_id: userId,
    p_target_id: taskId
  })
```

---

### 2. pause_task

**用途**: 暂停正在专注的任务

**参数**:
```sql
pause_task(
  p_user_id uuid,    -- 用户ID
  p_task_id bigint   -- 要暂停的任务ID
)
```

**返回值**: `json` - 暂停后的任务完整数据

**逻辑**:
1. 将任务状态改为 `'paused'`
2. 在 `focus_logs` 中找到 `end` 为 null 的记录，填入当前时间（闭合专注时段）
3. 返回任务完整数据

**SQL 实现**:
```sql
CREATE OR REPLACE FUNCTION pause_task(p_user_id uuid, p_task_id bigint)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_now text := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_result json;
BEGIN
  UPDATE thoughts
  SET
    status = 'paused',
    focus_logs = (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'end') IS NULL THEN elem || jsonb_build_object('end', v_now)
          ELSE elem
        END
      )
      FROM jsonb_array_elements(focus_logs) elem
    )
  WHERE
    id = p_task_id
    AND user_id = p_user_id
  RETURNING row_to_json(thoughts.*) INTO v_result;

  RETURN v_result;
END;
$$;
```

**使用示例**:
```typescript
const { data, error } = await supabase
  .rpc('pause_task', {
    p_user_id: userId,
    p_task_id: taskId
  })
```

---

### 3. match_thoughts

**用途**: 基于向量相似度搜索相关的想法/任务（AI 语义搜索）

**参数**:
```sql
match_thoughts(
  p_user_id uuid,            -- 用户ID
  query_embedding vector,    -- 查询向量
  match_threshold float,     -- 相似度阈值（0-1）
  match_count int           -- 返回结果数量限制
)
```

**返回值**: `json` - 搜索结果

```typescript
{
  success: boolean,
  message: string,
  count: number,
  data: Array<{
    id: number,
    content: string,
    status: string,
    similarity: number  // 相似度分数 (0-1)
  }>
}
```

**逻辑**:
1. 使用向量余弦相似度 `<=>` 运算符搜索
2. 过滤条件：
   - 属于指定用户
   - 状态不是 `'abandoned'` 或 `'done'`
   - 相似度 > `match_threshold`
3. 按相似度排序
4. 限制返回 `match_count` 条结果

**SQL 实现**:
```sql
CREATE OR REPLACE FUNCTION match_thoughts(
  p_user_id uuid,
  query_embedding vector,
  match_threshold float,
  match_count int
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
      status,
      1 - (embedding <=> query_embedding) AS similarity
    FROM thoughts
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
      AND user_id = p_user_id
      AND status != 'abandoned'
      AND status != 'done'
    ORDER BY embedding <=> query_embedding
    LIMIT match_count
  )
  SELECT json_build_object(
    'success', true,
    'message', CASE WHEN count(*) > 0 THEN 'Found matches' ELSE 'No matches found' END,
    'count', count(*),
    'data', COALESCE(json_agg(row_to_json(matches)), '[]'::json)
  ) INTO result_json
  FROM matches;

  RETURN result_json;
END;
$$;
```

**使用示例**:
```typescript
const { data, error } = await supabase
  .rpc('match_thoughts', {
    p_user_id: userId,
    query_embedding: embedding,  // 向量数组
    match_threshold: 0.7,        // 相似度阈值
    match_count: 10             // 最多返回10条
  })
```

---

## 🔐 Row Level Security (RLS)

**建议配置**:

### 启用 RLS
```sql
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;
```

### 创建策略

```sql
-- 用户只能查看自己的想法
CREATE POLICY "Users can view their own thoughts"
  ON thoughts FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能插入自己的想法
CREATE POLICY "Users can insert their own thoughts"
  ON thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的想法
CREATE POLICY "Users can update their own thoughts"
  ON thoughts FOR UPDATE
  USING (auth.uid() = user_id);

-- 用户只能删除自己的想法
CREATE POLICY "Users can delete their own thoughts"
  ON thoughts FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 📦 数据关系图

```
┌─────────────┐
│   users     │
│  (auth)     │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────▼──────────────────────────────────┐
│           thoughts                      │
│─────────────────────────────────────────│
│ id (PK)                                 │
│ user_id (FK) → users.id                 │
│ content                                 │
│ embedding (vector)                      │
│ status (inbox/focused/done/...)         │
│ focus_logs (jsonb[])                    │
│ created_at                              │
│ updated_at                              │
│ last_mentioned_at                       │
└─────────────────────────────────────────┘
```

---

## 🎯 使用场景映射

### UnoDay 功能 → Supabase 表结构映射

| UnoDay 功能 | thoughts 表对应 | 说明 |
|-------------|----------------|------|
| **Uno 任务** | `status = 'focused'` | 当前正在专注的任务 |
| **杂念箱** | `status = 'inbox'` | 还未处理的想法/杂念 |
| **已完成** | `status = 'done'` | 完成的任务 |
| **已放弃** | `status = 'abandoned'` | 放弃的任务（对应原来的 giveup） |
| **已暂停** | `status = 'paused'` | 暂停的任务 |
| **专注时长** | `focus_logs[]` | 记录每次专注的开始和结束时间 |
| **任务内容** | `content` | 任务描述文本 |

### 操作流程

#### 1. 开始专注新任务
```typescript
// 使用 switch_focus RPC
await supabase.rpc('switch_focus', {
  p_user_id: userId,
  p_target_id: taskId
})
```

#### 2. 暂停当前任务
```typescript
await supabase.rpc('pause_task', {
  p_user_id: userId,
  p_task_id: taskId
})
```

#### 3. 完成任务
```typescript
await supabase
  .from('thoughts')
  .update({ status: 'done' })
  .eq('id', taskId)
  .eq('user_id', userId)
```

#### 4. 放弃任务
```typescript
await supabase
  .from('thoughts')
  .update({ status: 'abandoned' })
  .eq('id', taskId)
  .eq('user_id', userId)
```

#### 5. 添加新想法到收件箱
```typescript
await supabase
  .from('thoughts')
  .insert({
    user_id: userId,
    content: thoughtContent,
    status: 'inbox'
  })
```

#### 6. AI 语义搜索相关想法
```typescript
// 先获取查询文本的向量嵌入（通过 OpenAI/Anthropic API）
const embedding = await getEmbedding(queryText)

// 搜索相似想法
await supabase.rpc('match_thoughts', {
  p_user_id: userId,
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 10
})
```

---

## 📝 注意事项

1. **向量嵌入**: `embedding` 字段需要使用外部 AI API（如 OpenAI Embeddings）生成
2. **时间格式**: 所有时间字段使用 UTC 时区的 ISO 8601 格式
3. **JSONB 数组**: `focus_logs` 是 JSONB 数组，可以高效查询和更新
4. **RPC 原子性**: `switch_focus` 确保切换任务是原子操作，避免数据不一致
5. **用户隔离**: 通过 RLS 确保用户只能访问自己的数据

---

## 🔄 迁移建议

### 从 localStorage 到 Supabase

| localStorage key | Supabase 对应 |
|------------------|---------------|
| `unoday_current_task` | `thoughts` 表中 `status='focused'` 的记录 |
| `unoday_distractions` | `thoughts` 表中 `status='inbox'` 的记录 |
| `unoday_history` | `thoughts` 表中 `status='done'` 或 `'abandoned'` 的记录 |
| `unoday_start_time` | `focus_logs` 数组中最后一项的 `start` |
| `unoday_daily_limit` | 通过查询 `status='done'` 且 `DATE(completed_at) = TODAY` 计算 |

---

## 下一步

1. ✅ 已创建此文档
2. ⏭️ 生成 TypeScript 类型定义
3. ⏭️ 创建数据访问 hooks
4. ⏭️ 实现 localStorage → Supabase 迁移逻辑
5. ⏭️ 集成到现有组件

---

**文档版本**: 1.0
**最后更新**: 2025-01-10
